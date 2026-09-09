export interface MarkaEvent {
  id: string;
  name: string;
  source: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}
