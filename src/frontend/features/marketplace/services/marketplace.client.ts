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


  const data = await response.json();
  return data.product as MarketplaceProduct;

}



export async function getMarketplaceProduct(

  productId: string

): Promise<MarketplaceProduct> {


  const response =
    await fetch(
      `/api/marketplace/products/${productId}`
    );


  if (!response.ok) {

    throw new Error(
      "Unable to load marketplace product"
    );

  }


  return response.json();

}
