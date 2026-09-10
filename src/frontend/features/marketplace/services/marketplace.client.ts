import {
  MarketplaceProduct,
} from "../types/marketplace.types";


export async function getMarketplaceProducts(): Promise<MarketplaceProduct[]> {


  const response =
    await fetch(
      "/api/marketplace/products"
    );


  if (!response.ok) {

    throw new Error(
      "Unable to load marketplace products"
    );

  }


  return response.json();

}
