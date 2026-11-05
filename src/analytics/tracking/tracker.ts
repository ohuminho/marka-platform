import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { AnalyticsEvent } from "../events/event.types";

const ALLOWED_EVENTS = new Set([
  "page_view", "marketplace_view", "product_view", "store_view",
  "search", "add_to_cart", "sign_up", "purchase",
]);

export class Tracker {
  async track(event: AnalyticsEvent) {
    if (!ALLOWED_EVENTS.has(event.name)) {
      throw new Error("Unsupported MARKA growth event.");
    }
    const id = randomUUID();
    return prisma.domainEvent.create({
      data: {
        eventKey: `analytics:${id}`,
        aggregateType: event.userId ? "USER" : "ANONYMOUS_VISITOR",
        aggregateId: event.userId || event.id,
        eventType: `GROWTH.${event.name.toUpperCase()}`,
        payload: {
          authenticated: Boolean(event.userId),
          timestamp: event.timestamp.toISOString(),
          ...(event.metadata || {}),
        } as Prisma.InputJsonValue,
      },
    });
  }
}
