"use client";


import {
  useEffect,
  useState,
} from "react";


import ProductCard from "./ProductCard";


import MarketplaceSearch from "./MarketplaceSearch";


import MarketplaceFilters from "./MarketplaceFilters";


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



  const [
    search,
    setSearch
  ] =
    useState("");



  const [
    verifiedOnly,
    setVerifiedOnly
  ] =
    useState(false);



  const [
    sortBy,
    setSortBy
  ] =
    useState("latest");



  useEffect(() => {


    async function loadProducts() {


      setLoading(true);



      const params =
        new URLSearchParams();



      if (search) {

        params.set(
          "search",
          search
        );

      }



      if (verifiedOnly) {

        params.set(
          "verifiedOnly",
          "true"
        );

      }



      params.set(
        "sortBy",
        sortBy
      );



      const response =
        await fetch(
          `/api/marketplace/products?${params.toString()}`
        );



      const data =
        await response.json();



      setProducts(
        data
      );



      setLoading(false);


    }



    loadProducts();


  }, [

    search,

    verifiedOnly,

    sortBy,

  ]);



  return (

    <div>


      <MarketplaceSearch

        onSearch={
          setSearch
        }

      />



      <MarketplaceFilters

        verifiedOnly={
          verifiedOnly
        }

        onVerifiedChange={
          setVerifiedOnly
        }

        sortBy={
          sortBy
        }

        onSortChange={
          setSortBy
        }

      />



      {
        loading

          ?

          <div className="
            mt-10
            text-white/50
          ">

            Loading marketplace...

          </div>


          :


          <div className="
            mt-10
            grid
            gap-6
            md:grid-cols-3
          ">


            {
              products.map(
                product => (

                  <ProductCard

                    key={
                      product.id
                    }

                    product={
                      product
                    }

                  />

                )

              )

            }


          </div>

      }


    </div>

  );

}
