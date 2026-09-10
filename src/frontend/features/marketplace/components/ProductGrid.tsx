"use client";


import {
  useEffect,
  useState,
} from "react";


import ProductCard from "./ProductCard";


import {
  getMarketplaceProducts,
} from "../services/marketplace.client";


import {
  MarketplaceProduct,
} from "../types/marketplace.types";



export default function ProductGrid() {


  const [
    products,
    setProducts
  ] =
    useState<MarketplaceProduct[]>([]);



  const [
    loading,
    setLoading
  ] =
    useState(true);



  useEffect(() => {


    async function loadProducts() {


      try {


        const data =
          await getMarketplaceProducts();


        setProducts(
          data
        );


      } finally {

        setLoading(false);

      }

    }


    loadProducts();


  }, []);



  if (loading) {

    return (

      <div className="
        text-white/50
      ">

        Loading marketplace...

      </div>

    );

  }



  return (

    <div className="
      grid
      gap-6
      md:grid-cols-3
    ">


      {
        products.map(
          product => (

            <ProductCard

              key={product.id}

              product={product}

            />

          )

        )
      }


    </div>

  );

}
