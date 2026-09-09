import { AuthSession } from "../auth.types";

export class SessionService {
  create(userId: string): AuthSession {
    return {
      id: crypto.randomUUID(),
      userId,
      expiresAt: new Date(
        Date.now() + 86400000
      ),
    };
  }
}
