export interface PartnerContract {
  id: string;
  partnerId: string;
  startDate: Date;
  endDate?: Date;
  status: "ACTIVE" | "EXPIRED";
}
