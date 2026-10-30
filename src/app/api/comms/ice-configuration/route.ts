import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicia sessão para configurar a chamada." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
    if (user?.status !== "ACTIVE") return NextResponse.json({ message: "Conta sem autorização." }, { status: 403 });

    const turnUrls = (process.env.MARKA_TURN_URLS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const stunUrls = (process.env.MARKA_STUN_URLS ?? "stun:stun.l.google.com:19302").split(",").map((value) => value.trim()).filter(Boolean);
    const sharedSecret = process.env.MARKA_TURN_SHARED_SECRET;
    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = stunUrls.map((urls) => ({ urls }));

    if (turnUrls.length) {
      if (!sharedSecret) return NextResponse.json({ message: "TURN está configurado sem segredo partilhado. Contacta o administrador." }, { status: 503 });
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const username = `${expiresAt}:${user.id}`;
      const credential = createHmac("sha1", sharedSecret).update(username).digest("base64");
      iceServers.push({ urls: turnUrls, username, credential });
    }

    if (!turnUrls.length && process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: "Serviço TURN não configurado. As chamadas não estão disponíveis em produção." }, { status: 503 });
    }
    return NextResponse.json({ iceServers, expiresInSeconds: 3600 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_ICE_CONFIGURATION]", error);
    return NextResponse.json({ message: "Não foi possível configurar a conectividade WebRTC." }, { status: 500 });
  }
}
