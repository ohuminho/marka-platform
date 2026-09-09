export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
}
