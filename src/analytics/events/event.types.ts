export interface AnalyticsEvent {
  id: string;
  name: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
