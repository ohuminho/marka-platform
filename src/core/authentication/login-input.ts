/**
 * Reject malformed JSON payloads before reading login fields.
 * Arrays and null are not valid request objects.
 */
export function isLoginRequestBody(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
