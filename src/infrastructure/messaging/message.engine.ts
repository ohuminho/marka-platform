export interface MessageEvent {
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
}
