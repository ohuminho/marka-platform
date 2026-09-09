export interface SystemMonitor {
  service: string;
  status: "ONLINE" | "WARNING" | "OFFLINE";
  lastCheck: Date;
}
