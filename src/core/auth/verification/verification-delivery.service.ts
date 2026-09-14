export interface VerificationDelivery {
  sendVerificationEmail(input: {
    email: string;
    name: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
}

/**
 * Email delivery boundary.
 *
 * Development:
 * The verification URL is logged locally so the complete
 * authentication flow can be tested without exposing the
 * token through an HTTP API.
 *
 * Production:
 * A real email provider must implement this boundary.
 * Verification tokens are never returned by API responses.
 */
export class VerificationDeliveryService
  implements VerificationDelivery
{
  async sendVerificationEmail(input: {
    email: string;
    name: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";

      const verificationUrl =
        `${baseUrl}/auth/verify-email?token=${encodeURIComponent(input.token)}`;

      console.info(
        "[AUTH_VERIFICATION_LINK]",
        {
          email: input.email,
          expiresAt:
            input.expiresAt.toISOString(),
          verificationUrl,
        }
      );

      return;
    }

    /*
     * Production email provider integration belongs here.
     * The token must only be transmitted through the
     * configured transactional email provider.
     */
  }
}
