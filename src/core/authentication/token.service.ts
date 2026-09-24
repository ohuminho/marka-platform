import jwt, {
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";

import { AuthConfig } from "./auth.config";

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
  role: string;
}

export class TokenService {
  private readonly secret: string;

  constructor() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_SECRET is required and must be configured."
      );
    }

    if (
      secret.length <
      AuthConfig.token.minimumSecretLength
    ) {
      throw new Error(
        `JWT_SECRET must contain at least ${AuthConfig.token.minimumSecretLength} characters.`
      );
    }

    this.secret = secret;
  }

  generate(input: {
    userId: string;
    role: string;
  }): string {
    const options: SignOptions = {
      expiresIn: `${AuthConfig.session.durationHours}h`,
      issuer: AuthConfig.token.issuer,
      algorithm: AuthConfig.token.algorithm,
    };

    return jwt.sign(
      {
        userId: input.userId,
        role: input.role,
      },
      this.secret,
      options
    );
  }

  verify(token: string): AuthTokenPayload {
    if (!token.trim()) {
      throw new Error("Authentication token is required.");
    }

    const payload = jwt.verify(
      token,
      this.secret,
      {
        issuer: AuthConfig.token.issuer,
        algorithms: [
          AuthConfig.token.algorithm,
        ],
      }
    );

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new Error(
        "Invalid authentication token payload."
      );
    }

    return payload as AuthTokenPayload;
  }
}

export const tokenService =
  new TokenService();
