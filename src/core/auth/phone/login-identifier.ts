import { normalizePhoneE164 } from "./phone-number";

export type LoginIdentifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string };

/**
 * Parse an email address or complete E.164 phone number.
 * Phone verification is enforced by the authentication service, not here.
 */
export function resolveLoginIdentifier(
  input: unknown
): LoginIdentifier | null {
  if (typeof input !== "string") return null;

  const value = input.trim();
  if (!value) return null;

  if (value.startsWith("+")) {
    try {
      return { kind: "phone", value: normalizePhoneE164(value) };
    } catch {
      return null;
    }
  }

  const email = value.toLowerCase();
  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return { kind: "email", value: email };
}
