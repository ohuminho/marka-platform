import { AutomationRule } from "./rule.types";

export class RuleEngine {
  execute(rule: AutomationRule, data: Record<string, unknown>) {
    if (!rule.active) return false;

    const valid = rule.conditions.every(
      (condition) =>
        data[condition.field] === condition.value
    );

    if (!valid) return false;

    rule.actions.forEach((action) => {
      console.log("Executing action:", action.type);
    });

    return true;
  }
}
