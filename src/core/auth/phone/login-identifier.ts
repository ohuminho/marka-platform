import { normalizePhoneE164 } from "./phone-number";

export type LoginIdentifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string };

export function resolveLoginIdentifier(
  input: unknown
): LoginIdentifier | null {
  if (typeof input !== "string") return null;

  const value = input.trim();
  if (!value || value.length > 320) return null;

  if (value.startsWith("+")) {
    try {
      return { kind: "phone", value: normalizePhoneE164(value) };
    } catch {
      return null;
    }
  }

  const email = value.toLowerCase();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return { kind: "email", value: email };
}
