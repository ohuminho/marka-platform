import { isIP } from "node:net";

/**
 * Accept only the client IP header supplied by the trusted Vercel edge.
 * Never trust caller-controlled forwarding headers for rate limiting.
 */
export function getTrustedClientIp(request: Request): string | undefined {
  const candidate = request.headers.get("x-vercel-forwarded-for");
  const ip = candidate?.split(",")[0]?.trim();
  return ip && isIP(ip) ? ip : undefined;
}
