import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { VendorService } from "@/services/vendors/vendor.service";

const registerVendorSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(2, "Store name must contain at least 2 characters.")
    .max(160, "Store name is too long."),
  organizationId: z.string().uuid("Invalid organization ID.").optional(),
});

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers.get("cookie")?.match(/(?:^|;\\s*)marka_session=([^;]+)/)?.[1];
    if (!sessionToken) {
      return NextResponse.json({ message: "Inicie sessão para abrir uma loja.", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    }

    const sessionService = new SessionService();
    const session = await sessionService.validate(sessionToken);
    if (!session) {
      return NextResponse.json({ message: "A sessão expirou. Inicie sessão novamente.", code: "INVALID_SESSION" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, status: true },
    });

    if (!user) {
      await sessionService.revoke(sessionToken);
      return NextResponse.json({ message: "A conta não foi encontrada. Inicie sessão novamente.", code: "USER_NOT_FOUND" }, { status: 401 });
    }
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ message: "A conta precisa de estar ativa para abrir uma loja.", code: "USER_NOT_ACTIVE" }, { status: 403 });
    }

    const parsed = registerVendorSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({
        message: "Verifique o nome da loja e tente novamente.",
        code: "INVALID_VENDOR_DATA",
        errors: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const vendor = await new VendorService().createVendor(user.id, parsed.data.storeName, parsed.data.organizationId);
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[VENDOR_REGISTER_ERROR]", error);

    if (message.includes("active organization")) {
      return NextResponse.json({
        message: "Para abrir uma loja, a sua conta precisa de pertencer a uma organização ativa na MARKA. Peça ao administrador da organização para ativar a sua adesão.",
        code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
      }, { status: 409 });
    }

    if (message.includes("seller profile already exists")) {
      return NextResponse.json({
        message: "Esta conta já tem um perfil de vendedor. Atualize a página para abrir o seu Seller Studio.",
        code: "SELLER_ALREADY_EXISTS",
      }, { status: 409 });
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({
        message: "Já existe um perfil comercial associado a esta conta.",
        code: "SELLER_ALREADY_EXISTS",
      }, { status: 409 });
    }

    return NextResponse.json({
      message: "Não foi possível concluir a abertura da loja. Tente novamente ou contacte o suporte se o problema persistir.",
      code: "VENDOR_REGISTRATION_FAILED",
    }, { status: 500 });
  }
}
