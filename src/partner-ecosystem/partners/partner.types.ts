export interface Partner {
  id: string;
  name: string;
  type:
    | "BANK"
    | "LOGISTICS"
    | "SUPPLIER"
    | "SERVICE";
  active: boolean;
}
