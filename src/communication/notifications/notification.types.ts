export type NotificationType =
  | "ORDER"
  | "PAYMENT"
  | "MESSAGE"
  | "SYSTEM";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  read: boolean;
}
