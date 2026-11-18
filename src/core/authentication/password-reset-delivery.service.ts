import { createHash } from "node:crypto";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name: string;
  token: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.MARKA_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !fromEmail || !appUrl) {
    throw new Error("Password reset email provider is not fully configured.");
  }

  const baseUrl = new URL(appUrl);
  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    throw new Error("Password reset links must use HTTPS in production.");
  }

  const resetUrl = new URL("/auth/reset-password", baseUrl);
  // Keep the bearer token in the URL fragment: fragments are not sent in
  // HTTP requests, server access logs, or Referer headers.
  resetUrl.hash = new URLSearchParams({ token: input.token }).toString();

  const idempotencyKey = createHash("sha256")
    .update(`${input.email}:${input.token}`)
    .digest("hex");
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(resetUrl.toString());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.email],
      subject: "Recuperar acesso à MARKA",
      text: `Olá ${input.name},

Para definir uma nova palavra-passe, abre este link (válido por 30 minutos):
${resetUrl.toString()}

Se não pediste esta alteração, ignora esta mensagem.`,
      html: `<div style="font-family:Arial,sans-serif;background:#090909;color:#fff;padding:32px"><h1>MARKA</h1><h2>Recuperar acesso</h2><p>Olá ${safeName},</p><p>Usa o botão abaixo para definir uma nova palavra-passe. O link expira em 30 minutos.</p><p><a style="display:inline-block;padding:14px 22px;background:#e9bd58;color:#111;text-decoration:none;border-radius:8px" href="${safeUrl}">Redefinir palavra-passe</a></p><p>Se não fizeste este pedido, ignora esta mensagem.</p></div>`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    // Never log the token, URL, or provider response body.
    console.error("[AUTH_PASSWORD_RESET_EMAIL_FAILED]", { status: response.status });
    throw new Error("Password reset email delivery failed.");
  }
}
