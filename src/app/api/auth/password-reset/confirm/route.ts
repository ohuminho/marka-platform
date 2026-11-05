import { z } from "zod";

import { passwordResetService } from "@/core/authentication/password-reset.service";

const schema = z.object({
  token: z.string().min(20).max(256),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ message: "Link inválido ou expirado. Solicita uma nova recuperação." }, { status: 400 });
    }
    const success = await passwordResetService.reset(parsed.data.token, parsed.data.password);
    if (!success) {
      return Response.json({ message: "Link inválido ou expirado. Solicita uma nova recuperação." }, { status: 400 });
    }
    return Response.json({ message: "Palavra-passe atualizada. Inicia sessão com a nova palavra-passe." });
  } catch (error) {
    console.error("[AUTH_PASSWORD_RESET_ERROR]", error);
    return Response.json({ message: "Não foi possível atualizar a palavra-passe neste momento." }, { status: 500 });
  }
}
