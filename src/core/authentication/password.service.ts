import bcrypt from "bcrypt";

import { AuthConfig } from "./auth.config";

export class PasswordService {
  async hash(password: string): Promise<string> {
    this.validatePassword(password);

    return bcrypt.hash(
      password,
      AuthConfig.password.bcryptRounds
    );
  }

  async compare(
    password: string,
    hash: string
  ): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return bcrypt.compare(password, hash);
  }

  validatePassword(password: string): void {
    if (
      password.length <
      AuthConfig.password.minimumLength
    ) {
      throw new Error(
        `Password must contain at least ${AuthConfig.password.minimumLength} characters.`
      );
    }

    if (
      password.length >
      AuthConfig.password.maximumLength
    ) {
      throw new Error(
        `Password must not exceed ${AuthConfig.password.maximumLength} characters.`
      );
    }
  }
}

export const passwordService =
  new PasswordService();
