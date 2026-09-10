"use client";


import {
  useEffect,
  useState,
} from "react";


import PremiumCard from "@/design-system/components/cards/PremiumCard";


import VendorTrustBadge from "./VendorTrustBadge";


import {
  getMarketplaceProduct,
} from "../services/marketplace.client";


import {
  MarketplaceProduct,
} from "../types/marketplace.types";



export default function ProductDetails({

  productId,

}: {

  productId: string;

}) {


  const [
    product,
    setProduct
  ] =
    useState<MarketplaceProduct>();


  const [
    loading,
    setLoading
  ] =
    useState(true);



  const [
    adding,
    setAdding
  ] =
    useState(false);



  const [
    message,
    setMessage
  ] =
    useState("");



  useEffect(() => {

    async function loadProduct() {

      try {

        const data =
          await getMarketplaceProduct(
            productId
          );


        setProduct(
          data
        );


      } finally {

        setLoading(false);

      }

    }


    loadProduct();


  }, [productId]);



  async function addToCart() {


    if (!product) return;



    setAdding(true);

    setMessage("");



    try {


      const response =
        await fetch(
          "/api/cart/items",
          {

            method: "POST",

            headers: {

              "Content-Type": "application/json",

            },

            body: JSON.stringify({

              productId: product.id,

              quantity: 1,

            }),

          }
        );



      const data =
        await response.json();



      if (!response.ok) {


        throw new Error(
          data.message ||
          "Unable to add product"
        );


      }



      setMessage(
        "Added to cart successfully."
      );



    } catch (error) {


      setMessage(

        error instanceof Error

          ? error.message

          : "Unable to add product"

      );


    } finally {


      setAdding(false);


    }


  }



  if (loading) {

    return (

      <div className="text-white/50">

        Loading product...

      </div>

    );

  }



  if (!product) {

    return (

      <div className="text-white/50">

        Product not found.

      </div>

    );

  }



  return (

    <PremiumCard>


      <div className="
        grid
        gap-10
        md:grid-cols-2
      ">


        <div className="
          aspect-square
          rounded-2xl
          bg-white/10
          flex
          items-center
          justify-center
        ">


          {
            product.image

              ?

              <img

                src={product.image}

                alt={product.name}

                className="
                  h-full
                  w-full
                  rounded-2xl
                  object-cover
                "

              />

              :

              <span className="text-white/40">

                Product Image

              </span>

          }


        </div>



        <div>


          <h1 className="
            text-4xl
            font-semibold
          ">

            {product.name}

          </h1>



          <div className="mt-4">

            <VendorTrustBadge

              verified={
                product.store.verified
              }

              rating={
                product.store.rating
              }

            />

          </div>



          <p className="
            mt-6
            text-white/50
          ">

            {product.description ??
              "No description available."
            }

          </p>



          <div className="
            mt-8
            text-3xl
            font-semibold
          ">

            {product.price} AOA

          </div>



          <div className="
            mt-6
            space-y-3
            text-sm
          ">

            <p>
              Store: {product.store.name}
            </p>


            <p>
              Stock: {product.stock}
            </p>


            <p>
              Status: {product.status}
            </p>


          </div>



          <button

            onClick={addToCart}

            disabled={
              adding
            }

            className="
              mt-8
              w-full
              rounded-2xl
              bg-white
              px-6
              py-4
              font-semibold
              text-black
              transition
              disabled:opacity-50
            "

          >

            {
              adding

                ?

                "Adding..."

                :

                "Add to Cart"
            }


          </button>



          {
            message && (

              <p className="
                mt-4
                text-sm
                text-white/60
              ">

                {message}

              </p>

            )
          }


        </div>


      </div>


    </PremiumCard>

  );

}
