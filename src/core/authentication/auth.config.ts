export const AuthConfig = {
  sessionHours: 24,

  password: {
    minimumLength: 12,
  },

  token: {
    issuer: "MARKA",
    algorithm: "HS256" as const,
  },

  cookies: {
    name: "marka_session",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
} as const;
