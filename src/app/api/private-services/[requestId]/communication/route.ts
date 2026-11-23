import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import {
  assertCommunicationContextParticipant,
  CommunicationContextError,
  syncCommunicationThread,
} from "@/core/communications/communication-context.service";
import { prisma } from "@/database/client/prisma";

async function authenticatedUser() {
  const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
  const session = token ? await new SessionService().validate(token) : null;
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });
  return user?.status === "ACTIVE" ? user : null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { requestId } = await context.params;
    await assertCommunicationContextParticipant("PRIVATE_SERVICE", requestId, user.id);
    const thread = await syncCommunicationThread("PRIVATE_SERVICE", requestId);
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorType: "USER",
        action: "PRIVATE_SERVICE_COMMUNICATION_OPENED",
        entityType: "PrivateServiceRequest",
        entityId: requestId,
        metadata: { threadId: thread.id },
      },
    });
    return NextResponse.json({ threadId: thread.id }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    if (error instanceof CommunicationContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("[PRIVATE_SERVICE_COMMUNICATION_OPEN]", error);
    return NextResponse.json({ message: "Não foi possível abrir a comunicação privada." }, { status: 500 });
  }
}
