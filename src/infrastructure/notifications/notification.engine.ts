export interface NotificationEvent {
  userId: string;
  title: string;
  message: string;
  channel: "APP" | "EMAIL" | "SMS";
}

export class NotificationEngine {
  send(event: NotificationEvent) {
    console.log("Sending notification", event);
  }
}
