export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
}
