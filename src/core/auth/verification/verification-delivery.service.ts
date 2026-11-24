import crypto from "node:crypto";

export interface VerificationDelivery {
  sendVerificationEmail(input: {
    email: string;
    name: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
}

interface ResendEmailResponse {
  id?: string;
  message?: string;
}

export class VerificationDeliveryService
  implements VerificationDelivery
{
  async sendVerificationEmail(input: {
    email: string;
    name: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.MARKA_APP_URL;

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured."
      );
    }

    if (!fromEmail) {
      throw new Error(
        "RESEND_FROM_EMAIL is not configured."
      );
    }

    if (!appUrl) {
      throw new Error(
        "MARKA_APP_URL is not configured."
      );
    }

    const normalizedAppUrl = appUrl.replace(
      /\/+$/,
      ""
    );

    const verificationUrl =
      `${normalizedAppUrl}/auth/verify-email?token=${encodeURIComponent(
        input.token
      )}`;

    const expiresAtLabel =
      input.expiresAt.toLocaleString("pt-AO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Luanda",
      });

    const html = this.buildHtml({
      name: input.name,
      verificationUrl,
      expiresAtLabel,
    });

    const text = this.buildText({
      name: input.name,
      verificationUrl,
      expiresAtLabel,
    });

    const idempotencyKey = crypto
      .createHash("sha256")
      .update(
        `${input.email}:${input.token}`
      )
      .digest("hex");

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [input.email],
          subject:
            "Confirme o seu endereço de e-mail — MARKA",
          html,
          text,
        }),
      }
    );

    const data =
      (await response
        .json()
        .catch(() => null)) as
        | ResendEmailResponse
        | null;

    if (!response.ok) {
      console.error(
        "[AUTH_VERIFICATION_EMAIL_FAILED]",
        {
          email: input.email,
          status: response.status,
          message: data?.message ?? null,
        }
      );

      throw new Error(
        "Unable to send verification email."
      );
    }

    console.info(
      "[AUTH_VERIFICATION_EMAIL_SENT]",
      {
        email: input.email,
        providerMessageId: data?.id ?? null,
      }
    );
  }

  private buildHtml(input: {
    name: string;
    verificationUrl: string;
    expiresAtLabel: string;
  }): string {
    const safeName = this.escapeHtml(
      input.name
    );

    const safeUrl = this.escapeHtml(
      input.verificationUrl
    );

    const safeExpiresAt =
      this.escapeHtml(
        input.expiresAtLabel
      );

    return `
<!DOCTYPE html>
<html lang="pt-AO">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Confirme o seu e-mail — MARKA</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background: #050505;
      color: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background:#050505;padding:48px 20px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:600px;
              background:#101010;
              border:1px solid #242424;
              border-radius:24px;
              overflow:hidden;
            "
          >
            <tr>
              <td style="padding:42px 40px 24px;">
                <div
                  style="
                    font-size:28px;
                    font-weight:700;
                    letter-spacing:8px;
                    color:#ffffff;
                  "
                >
                  MARKA
                </div>

                <div
                  style="
                    margin-top:8px;
                    font-size:12px;
                    letter-spacing:2px;
                    color:#777777;
                    text-transform:uppercase;
                  "
                >
                  Ecossistema Digital de Angola
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 40px 42px;">
                <h1
                  style="
                    margin:0 0 18px;
                    font-size:30px;
                    line-height:1.2;
                    color:#ffffff;
                  "
                >
                  Confirme a sua conta
                </h1>

                <p
                  style="
                    margin:0 0 18px;
                    font-size:16px;
                    line-height:1.7;
                    color:#b8b8b8;
                  "
                >
                  Olá ${safeName},
                </p>

                <p
                  style="
                    margin:0 0 30px;
                    font-size:16px;
                    line-height:1.7;
                    color:#b8b8b8;
                  "
                >
                  Confirme o seu endereço de e-mail para
                  ativar a sua conta MARKA.
                </p>

                <a
                  href="${safeUrl}"
                  style="
                    display:inline-block;
                    padding:15px 24px;
                    background:#ffffff;
                    color:#050505;
                    text-decoration:none;
                    border-radius:12px;
                    font-size:15px;
                    font-weight:600;
                  "
                >
                  Confirmar o meu e-mail
                </a>

                <p
                  style="
                    margin:28px 0 0;
                    font-size:13px;
                    line-height:1.6;
                    color:#666666;
                  "
                >
                  Este link de confirmação expira em
                  ${safeExpiresAt} (hora de Luanda).
                </p>

                <p
                  style="
                    margin:22px 0 0;
                    font-size:13px;
                    line-height:1.6;
                    color:#666666;
                  "
                >
                  Se não criou esta conta, pode ignorar
                  esta mensagem com segurança.
                </p>
              </td>
            </tr>
          </table>

          <p
            style="
              margin:20px 0 0;
              font-size:11px;
              color:#555555;
            "
          >
            MARKA · Ecossistema Digital
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
  }

  private buildText(input: {
    name: string;
    verificationUrl: string;
    expiresAtLabel: string;
  }): string {
    return [
      `Olá ${input.name},`,
      "",
      "Confirme o seu endereço de e-mail para ativar a sua conta MARKA.",
      "",
      "Confirmar o seu e-mail:",
      input.verificationUrl,
      "",
      `Este link de confirmação expira em ${input.expiresAtLabel} (hora de Luanda).`,
      "",
      "Se não criou esta conta, pode ignorar esta mensagem com segurança.",
      "",
      "MARKA · Global Digital Economy",
    ].join("\n");
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export const verificationDeliveryService =
  new VerificationDeliveryService();
