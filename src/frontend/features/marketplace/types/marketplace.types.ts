export interface MarketplaceProduct {

  id: string;

  name: string;

  description?: string;

  price: number;

  image?: string;

  stock: number;

  status: string;

  store: {

    id: string;

    name: string;

  };

  category?: {

    id: string;

    name: string;

  } | null;

}
