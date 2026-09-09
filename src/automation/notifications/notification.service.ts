export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
}

export class NotificationService {
  send(notification: NotificationPayload) {
    console.log("Notification:", notification);
  }
}
