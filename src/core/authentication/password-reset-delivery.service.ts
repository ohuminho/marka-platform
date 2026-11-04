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

  const url = new URL("/auth/reset-password", appUrl);
  url.searchParams.set("token", input.token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.email],
      subject: "Recuperar acesso à MARKA",
      text: `Olá ${input.name},\n\nPara definir uma nova palavra-passe, abre este link (válido por 30 minutos):\n${url.toString()}\n\nSe não pediste esta alteração, ignora esta mensagem.`,
      html: `<div style="font-family:Arial,sans-serif;background:#090909;color:#fff;padding:32px"><h1>MARKA</h1><h2>Recuperar acesso</h2><p>Olá ${input.name.replace(/[&<>"]/g, "")},</p><p>Usa o botão abaixo para definir uma nova palavra-passe. O link expira em 30 minutos.</p><p><a style="display:inline-block;padding:14px 22px;background:#e9bd58;color:#111;text-decoration:none;border-radius:8px" href="${url.toString()}">Redefinir palavra-passe</a></p><p>Se não fizeste este pedido, ignora esta mensagem.</p></div>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[AUTH_PASSWORD_RESET_EMAIL_FAILED]", { status: response.status, detail: detail.slice(0, 300) });
    throw new Error("Password reset email delivery failed.");
  }
}
