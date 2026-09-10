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





export async function updateCartItem(

  itemId: string,

  quantity: number

) {


  const response =
    await fetch(

      `/api/cart/items/${itemId}`,

      {

        method: "PATCH",

        headers: {

          "Content-Type":
            "application/json",

        },

        body: JSON.stringify({

          quantity,

        }),

      }

    );



  if (!response.ok) {


    throw new Error(
      "Unable to update cart item"
    );


  }



  return response.json();


}





export async function removeCartItem(

  itemId: string

) {


  const response =
    await fetch(

      `/api/cart/items/${itemId}`,

      {

        method: "DELETE",

      }

    );



  if (!response.ok) {


    throw new Error(
      "Unable to remove cart item"
    );


  }



  return response.json();


}
