export interface ModerationAction {
  id: string;
  targetId: string;
  reason: string;
  action: "WARNING" | "BLOCK" | "REMOVE";
}
