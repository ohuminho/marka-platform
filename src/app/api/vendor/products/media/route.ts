import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    const session = token ? await new SessionService().validate(token) : null;
    if (!token || !session) {
      return NextResponse.json({ message: "Inicie sessão para carregar imagens." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "É necessária uma conta ativa." }, { status: 403 });
    }

    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: user.id, status: { notIn: ["SUSPENDED", "CLOSED"] } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!vendor) return NextResponse.json({ message: "Abra primeiro uma loja na MARKA." }, { status: 409 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Escolha uma fotografia." }, { status: 400 });
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "A imagem deve ter até 5 MB." }, { status: 413 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ message: "O armazenamento de imagens está temporariamente indisponível." }, { status: 503 });
    }

    const forwarded = new FormData();
    forwarded.set("file", file, file.name || "listing-image");
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/marka-marketplace-media-upload`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "x-marka-session": token,
      },
      body: forwarded,
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ message: "O carregamento da imagem falhou." }));
    return NextResponse.json(data, { status: response.status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[MARKETPLACE_MEDIA_ROUTE]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "Não foi possível carregar a imagem com segurança." }, { status: 500 });
  }
}
