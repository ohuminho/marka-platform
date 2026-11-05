import { notificationService } from "@/automation/notifications/notification.service";

export interface NotificationEvent {
  userId: string;
  title: string;
  message: string;
  channel: "APP";
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Native in-app notification delivery. External channels are deliberately
 * excluded until a MARKA-owned/approved adapter and consent policy exist.
 */
export class NotificationEngine {
  async send(event: NotificationEvent) {
    if (event.channel !== "APP") {
      throw new Error("Only native MARKA in-app notifications are enabled.");
    }
    return notificationService.send({
      userId: event.userId,
      title: event.title,
      message: event.message,
      type: event.type,
      data: event.data,
    });
  }
}
