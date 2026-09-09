export interface Regulation {
  id: string;
  country: string;
  requirement: string;
  status: "PENDING" | "ACTIVE";
}
