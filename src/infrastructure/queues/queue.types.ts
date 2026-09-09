export interface QueueJob {
  id: string;
  type: string;
  payload: unknown;
  status: "WAITING" | "PROCESSING" | "DONE";
}
