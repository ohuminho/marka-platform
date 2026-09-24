export const AuthConfig = {
  session: {
    durationHours: 24,
    refreshWindowHours: 6,
  },

  password: {
    minimumLength: 12,
    maximumLength: 128,
    bcryptRounds: 12,
  },

  token: {
    issuer: "MARKA",
    algorithm: "HS256" as const,
    minimumSecretLength: 32,
  },

  cookies: {
    name: "marka_session",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },

  headers: {
    organizationId: "X-Organization-Id",
    requestId: "X-Request-Id",
    correlationId: "X-Correlation-Id",
  },

  routes: {
    login: "/auth/login",
    dashboard: "/app/dashboard",
  },
} as const;
