export interface AnalyticsReport {
  title: string;
  generatedAt: Date;
  data: Record<string, number>;
}
