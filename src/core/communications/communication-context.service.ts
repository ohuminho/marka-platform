import { prisma } from "@/database/client/prisma";

export type CommunicationContextType = "MOBILITY" | "DELIVERY";
export type CommunicationParticipantRole = "CUSTOMER" | "DRIVER" | "MERCHANT" | "COURIER";

type ResolvedContext = {
  contextType: CommunicationContextType;
  contextId: string;
  subject: string;
  participants: Array<{ userId: string; role: CommunicationParticipantRole }>;
};

export class CommunicationContextError extends Error {
  constructor(message: string, readonly status = 404) {
    super(message);
    this.name = "CommunicationContextError";
  }
}

async function resolveContext(contextType: CommunicationContextType, contextId: string): Promise<ResolvedContext> {
  if (contextType === "MOBILITY") {
    const ride = await prisma.mobilityRide.findUnique({
      where: { id: contextId },
      select: { id: true, reference: true, status: true, riderId: true, completedAt: true, driver: { select: { userId: true } } },
    });
    if (!ride) throw new CommunicationContextError("Viagem não encontrada.");
    const activeStatuses = ["MATCHED", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "TRIP_IN_PROGRESS"];
    const withinSupportWindow = ride.status === "TRIP_COMPLETED" && !!ride.completedAt && Date.now() - ride.completedAt.getTime() <= 30 * 60_000;
    if (!activeStatuses.includes(ride.status) && !withinSupportWindow) {
      throw new CommunicationContextError("A comunicação desta viagem já não está disponível.", 403);
    }
    if (!ride.driver?.userId) throw new CommunicationContextError("A comunicação fica disponível depois da atribuição do motorista.", 409);
    return {
      contextType, contextId, subject: `Viagem ${ride.reference}`,
      participants: [
        { userId: ride.riderId, role: "CUSTOMER" },
        { userId: ride.driver.userId, role: "DRIVER" },
      ],
    };
  }

  const fulfillment = await prisma.fulfillmentRequest.findUnique({
    where: { id: contextId },
    select: {
      id: true, status: true, updatedAt: true, assignedAgentId: true,
      assignment: { select: { agentId: true } },
      order: { select: { id: true, userId: true, items: { select: { vendorId: true } } } },
    },
  });
  if (!fulfillment) throw new CommunicationContextError("Entrega não encontrada.");
  const activeStatuses = ["REQUESTED", "ASSIGNED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"];
  const withinSupportWindow = fulfillment.status === "COMPLETED" && Date.now() - fulfillment.updatedAt.getTime() <= 60 * 60_000;
  if (!activeStatuses.includes(fulfillment.status) && !withinSupportWindow) {
    throw new CommunicationContextError("A comunicação desta entrega já não está disponível.", 403);
  }

  const vendorIds = [...new Set(fulfillment.order.items.map((item) => item.vendorId).filter((id): id is string => !!id))];
  const [vendors, agent] = await Promise.all([
    vendorIds.length ? prisma.vendor.findMany({ where: { id: { in: vendorIds }, status: "ACTIVE" }, select: { ownerId: true } }) : Promise.resolve([]),
    (fulfillment.assignment?.agentId ?? fulfillment.assignedAgentId)
      ? prisma.deliveryAgent.findUnique({ where: { id: fulfillment.assignment?.agentId ?? fulfillment.assignedAgentId! }, select: { userId: true, status: true } })
      : Promise.resolve(null),
  ]);
  const participants: ResolvedContext["participants"] = [{ userId: fulfillment.order.userId, role: "CUSTOMER" }];
  for (const vendor of vendors) participants.push({ userId: vendor.ownerId, role: "MERCHANT" });
  if (agent?.status === "ACTIVE") participants.push({ userId: agent.userId, role: "COURIER" });

  const unique = new Map<string, CommunicationParticipantRole>();
  for (const participant of participants) {
    if (!unique.has(participant.userId) || participant.role === "CUSTOMER") unique.set(participant.userId, participant.role);
  }
  return {
    contextType, contextId,
    subject: `Entrega ${fulfillment.order.id.slice(0, 8).toUpperCase()}`,
    participants: [...unique].map(([userId, role]) => ({ userId, role })),
  };
}

export async function syncCommunicationThread(contextType: CommunicationContextType, contextId: string) {
  const resolved = await resolveContext(contextType, contextId);
  const thread = await prisma.$transaction(async (tx) => {
    let current = await tx.communicationThread.findUnique({
      where: { contextType_contextId: { contextType, contextId } },
      select: { id: true, contextType: true, contextId: true, subject: true, status: true, lastMessageAt: true },
    });
    if (!current) {
      current = await tx.communicationThread.create({
        data: { contextType, contextId, subject: resolved.subject, status: "ACTIVE" },
        select: { id: true, contextType: true, contextId: true, subject: true, status: true, lastMessageAt: true },
      });
    } else if (current.status !== "ACTIVE" || current.subject !== resolved.subject) {
      current = await tx.communicationThread.update({
        where: { id: current.id },
        data: { subject: resolved.subject, status: "ACTIVE" },
        select: { id: true, contextType: true, contextId: true, subject: true, status: true, lastMessageAt: true },
      });
    }

    const existing = await tx.communicationThreadParticipant.findMany({
      where: { threadId: current.id },
      select: { id: true, userId: true, role: true, revokedAt: true },
    });
    const byUser = new Map(existing.map((item) => [item.userId, item]));
    const participantIds = resolved.participants.map((participant) => participant.userId);
    for (const participant of resolved.participants) {
      const prior = byUser.get(participant.userId);
      if (!prior) {
        await tx.communicationThreadParticipant.create({
          data: { threadId: current.id, userId: participant.userId, role: participant.role },
        });
      } else if (prior.role !== participant.role || prior.revokedAt) {
        await tx.communicationThreadParticipant.update({
          where: { id: prior.id },
          data: { role: participant.role, revokedAt: null },
        });
      }
    }
    const revokedIds = existing.filter((item) => !participantIds.includes(item.userId) && !item.revokedAt).map((item) => item.id);
    if (revokedIds.length) {
      await tx.communicationThreadParticipant.updateMany({
        where: { id: { in: revokedIds } },
        data: { revokedAt: new Date() },
      });
    }
    return current;
  });
  return { ...thread, participants: resolved.participants };
}

export async function getAuthorizedCommunicationThread(threadId: string, actorId: string) {
  const thread = await prisma.communicationThread.findUnique({
    where: { id: threadId },
    select: { id: true, contextType: true, contextId: true, status: true },
  });
  if (!thread) throw new CommunicationContextError("Conversa não encontrada.");
  const synchronized = await syncCommunicationThread(thread.contextType, thread.contextId);
  const members = await prisma.communicationThreadParticipant.findMany({
    where: { threadId: synchronized.id, revokedAt: null },
    include: { user: { select: { id: true, name: true } } },
  });
  const participant = members.find((item) => item.userId === actorId);
  if (!participant) throw new CommunicationContextError("Não tens autorização para esta conversa.", 403);
  return {
    ...synchronized,
    participants: members.map((item) => ({ userId: item.userId, role: item.role, name: item.user.name })),
    actorRole: participant.role,
  };
}
