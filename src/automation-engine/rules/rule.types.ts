export interface AutomationRule {
  id: string;
  event: string;
  condition: string;
  action: string;
  active: boolean;
}
