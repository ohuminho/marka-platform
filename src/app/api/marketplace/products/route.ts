import {
  NextResponse,
} from "next/server";


import {
  MarketplaceService,
} from "@/services/marketplace/marketplace.service";



export async function GET(

  request: Request

) {


  const { searchParams } =
    new URL(
      request.url
    );



  const search =
    searchParams.get(
      "search"
    ) || undefined;



  const categoryId =
    searchParams.get(
      "categoryId"
    ) || undefined;



  const verifiedOnly =
    searchParams.get(
      "verifiedOnly"
    ) === "true";



  const service =
    new MarketplaceService();



  const products =
    await service.getProducts({

      search,

      categoryId,

      verifiedOnly,

    });



  return NextResponse.json(
    products
  );


}
