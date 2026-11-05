import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { getWebPushPublicKey, isWebPushConfigured } from "@/core/communications/web-push";

export const runtime = "nodejs";

async function authenticatedUser() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } });
  return user?.status === "ACTIVE" ? user : null;
}

function validEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
      && (host === "fcm.googleapis.com" || host.endsWith(".fcm.googleapis.com")
        || host === "updates.push.services.mozilla.com" || host.endsWith(".notify.windows.com")
        || host.endsWith(".push.apple.com"));
  } catch { return false; }
}

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const count = await prisma.pushSubscription.count({
      where: { userId: user.id, revokedAt: null },
    });
    return NextResponse.json({
      enabled: isWebPushConfigured(),
      publicKey: getWebPushPublicKey(),
      subscribed: count > 0,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[MARKA_PUSH_CONFIG]", error);
    return NextResponse.json({ message: "Unable to load push settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    if (!isWebPushConfigured()) return NextResponse.json({ message: "Push notifications are not configured." }, { status: 503 });
    const body = await request.json().catch(() => null) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
      expirationTime?: unknown;
    } | null;
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;
    if (!validEndpoint(endpoint) || typeof p256dh !== "string" || typeof auth !== "string"
      || p256dh.length > 256 || auth.length > 128) {
      return NextResponse.json({ message: "Invalid push subscription." }, { status: 400 });
    }
    const p256dhBytes = Buffer.from(p256dh, "base64url");
    const authBytes = Buffer.from(auth, "base64url");
    if (p256dhBytes.length !== 65 || authBytes.length < 16 || authBytes.length > 32) {
      return NextResponse.json({ message: "Invalid push encryption keys." }, { status: 400 });
    }
    const expirationTime = typeof body?.expirationTime === "number" && Number.isFinite(body.expirationTime)
      ? new Date(body.expirationTime)
      : null;
    if (expirationTime && Number.isNaN(expirationTime.getTime())) {
      return NextResponse.json({ message: "Invalid subscription expiry." }, { status: 400 });
    }
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { id: true, userId: true },
    });
    if (existing && existing.userId !== user.id) {
      return NextResponse.json({ message: "This device subscription is already associated with another MARKA account." }, { status: 409 });
    }
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: user.id,
        endpoint,
        p256dh,
        auth,
        expirationTime,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        revokedAt: null,
      },
      update: {
        p256dh,
        auth,
        expirationTime,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        revokedAt: null,
      },
      select: { id: true },
    });
    return NextResponse.json({ saved: true, id: subscription.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[MARKA_PUSH_SUBSCRIBE]", error);
    return NextResponse.json({ message: "Unable to save push subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const body = await request.json().catch(() => null) as { endpoint?: unknown } | null;
    if (!validEndpoint(body?.endpoint)) return NextResponse.json({ message: "Invalid push endpoint." }, { status: 400 });
    const result = await prisma.pushSubscription.updateMany({
      where: { userId: user.id, endpoint: body.endpoint, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ revoked: result.count });
  } catch (error) {
    console.error("[MARKA_PUSH_UNSUBSCRIBE]", error);
    return NextResponse.json({ message: "Unable to revoke push subscription." }, { status: 500 });
  }
}
