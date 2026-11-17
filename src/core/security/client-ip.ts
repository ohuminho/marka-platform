import { isIP } from "node:net";

/**
 * Returns only the client IP supplied by Vercel's trusted request header.
 * Do not fall back to caller-controlled forwarding headers.
 */
export function getTrustedClientIp(request: Request): string | undefined {
  const candidate = request.headers.get("x-vercel-forwarded-for");
  const ip = candidate?.split(",")[0]?.trim();

  return ip && isIP(ip) ? ip : undefined;
}
