import assert from "node:assert/strict";
import { getTrustedClientIp } from "../../../src/core/security/client-ip";

{
  const request = new Request("https://markaao.com/api/auth/login", {
    headers: { "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1" },
  });
  assert.equal(getTrustedClientIp(request), "203.0.113.10");
}

{
  const request = new Request("https://markaao.com/api/auth/login", {
    headers: { "x-vercel-forwarded-for": "2001:db8::1" },
  });
  assert.equal(getTrustedClientIp(request), "2001:db8::1");
}

{
  const request = new Request("https://markaao.com/api/auth/login", {
    headers: {
      "x-forwarded-for": "198.51.100.25",
      "x-real-ip": "198.51.100.26",
    },
  });
  assert.equal(getTrustedClientIp(request), undefined);
}

{
  const request = new Request("https://markaao.com/api/auth/login", {
    headers: { "x-vercel-forwarded-for": "not-an-ip" },
  });
  assert.equal(getTrustedClientIp(request), undefined);
}

console.log("Trusted client IP extraction tests passed.");
