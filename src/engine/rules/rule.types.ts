export interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface RuleAction {
  type: string;
  payload?: unknown;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  active: boolean;
}
