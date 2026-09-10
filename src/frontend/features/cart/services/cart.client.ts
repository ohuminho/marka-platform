import {
  Cart,
} from "../types/cart.types";



export async function getCart(): Promise<Cart> {


  const response =
    await fetch(
      "/api/cart"
    );



  if (!response.ok) {


    throw new Error(
      "Unable to load cart"
    );


  }



  return response.json();


}
