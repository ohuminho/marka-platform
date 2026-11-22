import { isAllowedPushEndpoint } from "@/core/communications/web-push";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

assert(
  isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/test-token"),
  "Google FCM HTTPS endpoints should be accepted",
);
assert(
  isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/test-token"),
  "Mozilla push HTTPS endpoint should be accepted",
);
assert(
  isAllowedPushEndpoint("https://web.push.apple.com/push/test-token"),
  "Apple push HTTPS endpoints should be accepted",
);
assert(
  isAllowedPushEndpoint("https://region.fcm.googleapis.com/fcm/send/test-token"),
  "valid Google FCM subdomains should be accepted",
);
assert(
  isAllowedPushEndpoint("https://example.notify.windows.com/push/test-token"),
  "Windows push HTTPS endpoint should be accepted",
);
assert(
  !isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/test-token"),
  "plain HTTP endpoints must be rejected",
);
assert(
  !isAllowedPushEndpoint("https://localhost/fcm/send/test-token"),
  "localhost endpoints must be rejected",
);
assert(
  !isAllowedPushEndpoint("https://fcm.googleapis.com.attacker.example/send/token"),
  "lookalike hostnames must be rejected",
);
assert(
  !isAllowedPushEndpoint("https://example.notify.windows.com.attacker.example/push/token"),
  "lookalike Windows push hostnames must be rejected",
);
assert(
  !isAllowedPushEndpoint("https://fcm.googleapis.com:8443/send/token"),
  "non-standard ports must be rejected",
);
assert(
  !isAllowedPushEndpoint("https://user:password@fcm.googleapis.com/send/token"),
  "credential-bearing endpoints must be rejected",
);

console.log("Web Push endpoint policy tests passed.");
