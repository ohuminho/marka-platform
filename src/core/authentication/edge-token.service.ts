import { jwtVerify } from "jose";

import { AuthConfig } from "./auth.config";

export class EdgeTokenService {
  async verify(token: string) {
    if (!token.trim()) {
      throw new Error(
        "Authentication token is required."
      );
    }

    const secretValue =
      process.env.JWT_SECRET;

    if (!secretValue) {
      throw new Error(
        "JWT_SECRET is required and must be configured."
      );
    }

    if (
      secretValue.length <
      AuthConfig.token.minimumSecretLength
    ) {
      throw new Error(
        `JWT_SECRET must contain at least ${AuthConfig.token.minimumSecretLength} characters.`
      );
    }

    const secret =
      new TextEncoder().encode(secretValue);

    const { payload } =
      await jwtVerify(
        token,
        secret,
        {
          issuer: AuthConfig.token.issuer,
          algorithms: [
            AuthConfig.token.algorithm,
          ],
        }
      );

    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new Error(
        "Invalid authentication token payload."
      );
    }

    return payload;
  }
}

export const edgeTokenService =
  new EdgeTokenService();
