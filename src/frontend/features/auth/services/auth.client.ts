export interface AuthRegistrationResponse {
  id: string;
  email: string;
  status: string;
}

export async function login(
  email: string,
  password: string
) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "Authentication failed."
    );
  }

  return data;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthRegistrationResponse> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "Registration failed."
    );
  }

  return data as AuthRegistrationResponse;
}
