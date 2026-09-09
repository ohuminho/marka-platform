export interface Workflow {
  id: string;
  name: string;
  triggers: string[];
  actions: string[];
  active: boolean;
}
