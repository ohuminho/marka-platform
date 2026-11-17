import assert from "node:assert/strict";
import { getTrustedClientIp } from "../../../src/core/security/client-ip";

assert.equal(
  getTrustedClientIp(new Request("https://markaao.com", {
    headers: { "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1" },
  })),
  "203.0.113.10",
  "use the first validated address from the trusted Vercel header",
);

assert.equal(
  getTrustedClientIp(new Request("https://markaao.com", {
    headers: { "x-vercel-forwarded-for": "2001:db8::1" },
  })),
  "2001:db8::1",
  "accept valid IPv6 addresses",
);

assert.equal(
  getTrustedClientIp(new Request("https://markaao.com", {
    headers: { "x-vercel-forwarded-for": "not-an-ip" },
  })),
  undefined,
  "reject malformed trusted-header values",
);

assert.equal(
  getTrustedClientIp(new Request("https://markaao.com", {
    headers: {
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "203.0.113.11",
    },
  })),
  undefined,
  "ignore caller-controlled forwarding headers",
);

console.log("Trusted client IP tests passed.");
