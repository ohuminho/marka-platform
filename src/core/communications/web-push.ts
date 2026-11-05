import {
  createECDH,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  randomBytes,
  sign,
  createCipheriv,
} from "node:crypto";
import { prisma } from "@/database/client/prisma";

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  kind?: "INCOMING_CALL" | "GENERAL";
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const encoder = new TextEncoder();
const decoder = (value: string) => Buffer.from(value, "base64url");
const toBase64Url = (value: Buffer) => value.toString("base64url");

function vapidConfig() {
  const publicKey = process.env.MARKA_VAPID_PUBLIC_KEY;
  const privateKey = process.env.MARKA_VAPID_PRIVATE_KEY;
  const subject = process.env.MARKA_VAPID_SUBJECT || "mailto:support@markaao.com";
  if (!publicKey || !privateKey) return null;
  const publicBytes = decoder(publicKey);
  const privateBytes = decoder(privateKey);
  if (publicBytes.length !== 65 || privateBytes.length !== 32) {
    throw new Error("Invalid MARKA VAPID key material.");
  }
  return { publicKey, publicBytes, privateBytes, subject };
}

export function isWebPushConfigured() {
  return Boolean(process.env.MARKA_VAPID_PUBLIC_KEY && process.env.MARKA_VAPID_PRIVATE_KEY);
}

function allowedPushEndpoint(endpoint: string) {
  let url: URL;
  try { url = new URL(endpoint); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  const host = url.hostname.toLowerCase();
  return host === "fcm.googleapis.com"
    || host.endsWith(".fcm.googleapis.com")
    || host === "updates.push.services.mozilla.com"
    || host.endsWith(".notify.windows.com")
    || host.endsWith(".push.apple.com");
}

function vapidAuthorization(endpoint: string, config: NonNullable<ReturnType<typeof vapidConfig>>) {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = toBase64Url(Buffer.from(JSON.stringify({
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: config.subject,
  })));
  const unsigned = `${header}.${claims}`;
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(config.privateBytes);
  const point = ecdh.getPublicKey(undefined, "uncompressed");
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: toBase64Url(point.subarray(1, 33)),
    y: toBase64Url(point.subarray(33, 65)),
    d: toBase64Url(config.privateBytes),
  };
  const privateKey = createPrivateKey({ key: jwk, format: "jwk" });
  const signature = sign("sha256", Buffer.from(unsigned), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${config.publicKey}`;
}

function encryptPayload(subscription: StoredSubscription, payload: PushPayload, config: NonNullable<ReturnType<typeof vapidConfig>>) {
  const userPublicKey = decoder(subscription.p256dh);
  const authSecret = decoder(subscription.auth);
  if (userPublicKey.length !== 65 || authSecret.length < 16 || authSecret.length > 32) {
    throw new Error("Invalid Web Push subscription keys.");
  }

  const ephemeral = createECDH("prime256v1");
  ephemeral.generateKeys();
  const serverPublicKey = ephemeral.getPublicKey(undefined, "uncompressed");
  const sharedSecret = ephemeral.computeSecret(userPublicKey);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    userPublicKey,
    serverPublicKey,
  ]);
  const inputKeyMaterial = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync(
    "sha256",
    inputKeyMaterial,
    salt,
    Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
    16,
  ));
  const nonce = Buffer.from(hkdfSync(
    "sha256",
    inputKeyMaterial,
    salt,
    Buffer.from("Content-Encoding: nonce\0", "utf8"),
    12,
  ));

  const plaintext = Buffer.concat([Buffer.from(encoder.encode(JSON.stringify(payload))), Buffer.from([2])]);
  if (plaintext.length > 3800) throw new Error("Push payload exceeds the MARKA limit.");
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const recordHeader = Buffer.alloc(5);
  recordHeader.writeUInt32BE(4096, 0);
  recordHeader.writeUInt8(serverPublicKey.length, 4);
  return Buffer.concat([salt, recordHeader, serverPublicKey, ciphertext]);
}

async function sendOne(subscription: StoredSubscription, payload: PushPayload, config: NonNullable<ReturnType<typeof vapidConfig>>) {
  if (!allowedPushEndpoint(subscription.endpoint)) return "invalid" as const;
  const body = encryptPayload(subscription, payload, config);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuthorization(subscription.endpoint, config),
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(body.byteLength),
      TTL: "60",
      Urgency: payload.kind === "INCOMING_CALL" ? "high" : "normal",
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404 || response.status === 410) return "expired" as const;
  if (!response.ok) return "failed" as const;
  return "sent" as const;
}

export async function sendUserWebPush(userId: string, payload: PushPayload) {
  const config = vapidConfig();
  if (!config) return { sent: 0, expired: 0, failed: 0, skipped: true };
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
    take: 20,
  });
  let sent = 0;
  let expired = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      const result = await sendOne(subscription, payload, config);
      if (result === "sent") {
        sent += 1;
        await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastUsedAt: new Date() } });
      } else if (result === "expired" || result === "invalid") {
        expired += 1;
        await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { revokedAt: new Date() } });
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      console.error("[MARKA_WEB_PUSH_SEND]", error);
    }
  }
  return { sent, expired, failed, skipped: false };
}

export function getWebPushPublicKey() {
  return isWebPushConfigured() ? process.env.MARKA_VAPID_PUBLIC_KEY ?? null : null;
}
