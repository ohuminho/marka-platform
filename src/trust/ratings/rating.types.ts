export interface Rating {
  id: string;
  fromId: string;
  toId: string;
  value: number;
  comment?: string;
}
