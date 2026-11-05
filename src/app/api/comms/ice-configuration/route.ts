import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";

type IceServer = { urls: string | string[]; username?: string; credential?: string };

function isIceServer(value: unknown): value is IceServer {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const validUrls = typeof candidate.urls === "string"
    || (Array.isArray(candidate.urls) && candidate.urls.every((url) => typeof url === "string"));
  return validUrls;
}

async function getCloudflareIceServers(keyId: string, apiToken: string): Promise<IceServer[]> {
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 3600 }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!response.ok) {
    // Do not log or return the provider response: it may contain sensitive metadata.
    throw new Error(`Cloudflare TURN credential request failed (HTTP ${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Invalid Cloudflare TURN response.");

  const rawServers = (payload as { iceServers?: unknown }).iceServers;
  if (!Array.isArray(rawServers)) throw new Error("Cloudflare TURN response has no ICE server list.");

  const iceServers = rawServers.filter(isIceServer);
  const hasTurn = iceServers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some((url) => /^(turn|turns):/i.test(url))
      && typeof server.username === "string"
      && typeof server.credential === "string";
  });

  if (!hasTurn) throw new Error("Cloudflare TURN response contains no authenticated TURN server.");
  return iceServers;
}

export async function GET() {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!session) return NextResponse.json({ message: "Inicia sessão para configurar a chamada." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
    if (user?.status !== "ACTIVE") return NextResponse.json({ message: "Conta sem autorização." }, { status: 403 });

    const cloudflareKeyId = process.env.MARKA_CLOUDFLARE_TURN_KEY_ID;
    const cloudflareApiToken = process.env.MARKA_CLOUDFLARE_TURN_API_TOKEN;
    const hasCloudflareConfig = Boolean(cloudflareKeyId || cloudflareApiToken);

    if (hasCloudflareConfig) {
      if (!cloudflareKeyId || !cloudflareApiToken) {
        return NextResponse.json({ message: "A configuração Cloudflare TURN está incompleta." }, { status: 503 });
      }
      const iceServers = await getCloudflareIceServers(cloudflareKeyId, cloudflareApiToken);
      return NextResponse.json({ iceServers, expiresInSeconds: 3600 }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const turnUrls = (process.env.MARKA_TURN_URLS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const stunUrls = (process.env.MARKA_STUN_URLS ?? "stun:stun.l.google.com:19302").split(",").map((value) => value.trim()).filter(Boolean);
    const sharedSecret = process.env.MARKA_TURN_SHARED_SECRET;
    const iceServers: IceServer[] = stunUrls.map((urls) => ({ urls }));

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
    return NextResponse.json({ message: "Não foi possível configurar a conectividade WebRTC." }, { status: 503 });
  }
}
