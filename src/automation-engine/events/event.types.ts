export interface PlatformEvent {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
  payload: Record<string, unknown>;
}
