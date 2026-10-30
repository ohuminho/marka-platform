import type { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  async send(notification: NotificationPayload) {
    const userId = notification.userId.trim();
    const title = notification.title.trim();
    const message = notification.message.trim();

    if (!userId || !title || !message) {
      throw new Error("A notification requires user, title and message.");
    }

    return prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: notification.type?.trim().toUpperCase() || "GENERAL",
        data: notification.data
          ? (notification.data as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async listForUser(userId: string, limit = 30) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async markRead(userId: string, notificationId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count === 1;
  }

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }
}

export const notificationService = new NotificationService();
