import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

const storeProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  logo: z.string().trim().url().max(2048).optional().or(z.literal("")),
  banner: z.string().trim().url().max(2048).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().default(""),
});

export async function PATCH(request: Request) {
  try {
    const token = (await cookies()).get("marka_session")?.value;
    if (!token) return NextResponse.json({ message: "Inicie sessão para gerir a sua loja." }, { status: 401 });

    const session = await new SessionService().validate(token);
    if (!session) return NextResponse.json({ message: "A sessão expirou. Inicie sessão novamente." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "A conta não está autorizada a gerir esta loja." }, { status: 403 });
    }

    const parsed = storeProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({
        message: "Verifique os dados do perfil comercial.",
        errors: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: user.id },
      include: { store: true },
      orderBy: { createdAt: "asc" },
    });
    if (!vendor?.store) return NextResponse.json({ message: "Loja não encontrada nesta conta." }, { status: 404 });

    const input = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      const store = await tx.store.update({
        where: { id: vendor.store!.id },
        data: {
          name: input.name,
          description: input.description || null,
          logo: input.logo || null,
          banner: input.banner || null,
          location: input.location || null,
        },
      });
      await tx.vendor.update({
        where: { id: vendor.id },
        data: { name: input.name },
      });
      return store;
    });

    return NextResponse.json({
      store: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        logo: updated.logo,
        banner: updated.banner,
        location: updated.location,
        status: updated.status,
      },
      message: "Perfil da loja atualizado. As alterações comerciais continuam sujeitas ao estado de aprovação da loja.",
    });
  } catch (error) {
    console.error("[VENDOR_STORE_PROFILE_PATCH]", error);
    return NextResponse.json({ message: "Não foi possível atualizar o perfil da loja." }, { status: 500 });
  }
}
