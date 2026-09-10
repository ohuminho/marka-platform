import {
  VendorAnalyticsService,
} from "@/services/vendors/analytics/vendor.analytics.service";


const analyticsService =
  new VendorAnalyticsService();



export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  const {
    id,
  } = await context.params;


  const metrics =
    await analyticsService.getDashboardMetrics(
      id
    );


  return Response.json(
    metrics
  );

}
