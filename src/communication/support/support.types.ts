export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: "OPEN" | "PENDING" | "CLOSED";
}
