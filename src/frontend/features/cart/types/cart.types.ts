export interface CartProduct {

  id: string;

  name: string;

  image?: string;

  price: number;

}



export interface CartItem {

  id: string;

  quantity: number;

  product: CartProduct;

}



export interface Cart {

  id: string;

  userId: string;

  items: CartItem[];

}
