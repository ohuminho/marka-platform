/**
 * Normalize a complete international phone number to E.164.
 * The function deliberately does not infer a country calling code.
 */
export function normalizePhoneE164(input: string): string {
  if (typeof input !== "string") {
    throw new Error("Phone number must be a string.");
  }

  const compact = input.trim().replace(/[\s().-]/g, "");

  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    throw new Error("Phone number must include a valid country calling code in E.164 format.");
  }

  return compact;
}
