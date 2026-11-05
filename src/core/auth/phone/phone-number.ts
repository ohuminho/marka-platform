/**
 * Accepts a complete international number and returns its canonical E.164
 * representation. Country-specific national formatting belongs in the UI
 * country selector; this function never guesses a calling code.
 */
export function normalizePhoneE164(input: string): string {
  if (typeof input !== "string") {
    throw new Error("Phone number must be a string.");
  }

  const compact = input.trim().replace(/[\\s().-]/g, "");

  if (!/^\\+[1-9]\\d{7,14}$/.test(compact)) {
    throw new Error(
      "Phone number must include its country calling code in E.164 format."
    );
  }

  return compact;
}
