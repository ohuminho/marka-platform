export function normalizePhoneE164(input: string): string {
  if (typeof input !== "string") throw new Error("Phone number must be a string.");
  const value = input.trim().replace(/[\\s().-]/g, "");
  if (!/^\\+[1-9]\\d{7,14}$/.test(value)) throw new Error("Use an international phone number in E.164 format, including +244 for Angola.");
  return value;
}
