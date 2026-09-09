export interface ChatRoom {
  id: string;
  participants: string[];
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}
