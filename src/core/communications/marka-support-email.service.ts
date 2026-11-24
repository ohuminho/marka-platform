import crypto from "node:crypto";

type SupportEmailInput = {
  to: string;
  recipientName: string;
  subject: string;
  title: string;
  preheader: string;
  message: string;
  reference: string;
  statusLabel: string;
  actionUrl: string;
  idempotencyKey: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Formal, reusable MARKA email delivery for support cases.
 * Delivery failures are handled by callers so a saved support action is never lost.
 */
export class MarkaSupportEmailService {
  async send(input: SupportEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.MARKA_APP_URL;

    if (!apiKey || !fromEmail || !appUrl) {
      throw new Error("MARKA email delivery is not configured.");
    }

    const baseUrl = appUrl.replace(/\/+$/, "");
    const actionUrl = input.actionUrl.startsWith("/")
      ? `${baseUrl}${input.actionUrl}`
      : input.actionUrl;
    const safe = {
      recipientName: escapeHtml(input.recipientName || "Cliente MARKA"),
      title: escapeHtml(input.title),
      preheader: escapeHtml(input.preheader),
      message: escapeHtml(input.message),
      reference: escapeHtml(input.reference),
      statusLabel: escapeHtml(input.statusLabel),
      actionUrl: escapeHtml(actionUrl),
    };

    const html = `<!doctype html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${safe.title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;color:#171717;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safe.preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#101820;color:#ffffff;">
          <div style="font-size:25px;font-weight:700;letter-spacing:7px;">MARKA</div>
          <div style="margin-top:7px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c8cdd2;">Global Digital Economy</div>
        </td></tr>
        <tr><td style="padding:30px 32px 10px;">
          <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Comunicação oficial MARKA</p>
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111827;">${safe.title}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">Olá, ${safe.recipientName}.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">${safe.message}</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
            <tr><td style="padding:16px 18px;">
              <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Referência do processo</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;letter-spacing:1px;color:#111827;">${safe.reference}</div>
              <div style="margin-top:14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Estado actual</div>
              <div style="margin-top:5px;font-size:14px;font-weight:600;color:#111827;">${safe.statusLabel}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="left" style="padding:0 32px 32px;">
          <a href="${safe.actionUrl}" style="display:inline-block;padding:13px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:9px;font-size:14px;font-weight:600;">Consultar processo</a>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">Por segurança, os detalhes e o histórico completo estão disponíveis apenas depois de iniciar sessão na MARKA. Se não reconhece esta comunicação, não partilhe os seus dados de acesso.</p>
        </td></tr>
        <tr><td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;line-height:1.7;color:#4b5563;">Esta é uma comunicação automática associada ao seu processo MARKA. Para responder, utilize o centro de suporte dentro da aplicação.</p>
          <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#6b7280;">MARKA · Global Digital Economy<br>Powered By Magestade Pura Digital</p>
        </td></tr>
      </table>
      <p style="max-width:640px;margin:14px auto 0;font-size:10px;line-height:1.6;color:#9ca3af;">Esta mensagem pode conter informação relacionada com a sua conta. Não responda directamente a este endereço.</p>
    </td></tr>
  </table>
</body>
</html>`;

    const text = [
      "MARKA, Comunicação oficial",
      "",
      `Olá, ${input.recipientName || "Cliente MARKA"}.`,
      input.title,
      "",
      input.message,
      "",
      `Referência: ${input.reference}`,
      `Estado: ${input.statusLabel}`,
      "",
      `Consultar processo: ${actionUrl}`,
      "",
      "O histórico completo está disponível na aplicação MARKA após iniciar sessão.",
      "Powered By Magestade Pura Digital",
    ].join("\n");

    const idempotencyKey = crypto.createHash("sha256").update(input.idempotencyKey).digest("hex");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: input.subject,
        html,
        text,
      }),
    });

    const data = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok) {
      console.error("[MARKA_SUPPORT_EMAIL_FAILED]", { status: response.status, message: data?.message ?? null, reference: input.reference });
      throw new Error("MARKA support email delivery failed.");
    }

    console.info("[MARKA_SUPPORT_EMAIL_SENT]", { providerMessageId: data?.id ?? null, reference: input.reference });
  }
}

export const markaSupportEmailService = new MarkaSupportEmailService();
