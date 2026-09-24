export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface AuthRole {
  id: string;
  name: string;
}

export interface AuthContext {
  authenticated: boolean;
  user: AuthUser;
  session: AuthSession;
  organization?: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}
