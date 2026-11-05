import { z } from "zod";

import { prisma } from "@/database/client/prisma";
import { passwordResetService } from "@/core/authentication/password-reset.service";
import { sendPasswordResetEmail } from "@/core/authentication/password-reset-delivery.service";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const genericMessage = "Se existir uma conta elegível para esse endereço, receberás instruções de recuperação.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ message: genericMessage });

    const user = await prisma.user.findUnique({
      where: { emailNormalized: parsed.data.email },
      select: { id: true, email: true, name: true, status: true },
    });
    if (!user || !["ACTIVE", "PENDING_VERIFICATION"].includes(user.status)) {
      return Response.json({ message: genericMessage });
    }

    const issued = await passwordResetService.issue(user.id);
    if (issued) {
      await sendPasswordResetEmail({ email: user.email, name: user.name, token: issued.token });
    }
    return Response.json({ message: genericMessage });
  } catch (error) {
    console.error("[AUTH_PASSWORD_RESET_REQUEST_ERROR]", error);
    return Response.json({ message: genericMessage });
  }
}
