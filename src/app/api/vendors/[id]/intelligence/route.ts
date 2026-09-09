import { VendorIntelligenceService } from "@/services/vendors/vendor.intelligence.service";


const service =
  new VendorIntelligenceService();


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


  const overview =
    await service.getStoreOverview(
      id
    );


  return Response.json(
    overview
  );

}
