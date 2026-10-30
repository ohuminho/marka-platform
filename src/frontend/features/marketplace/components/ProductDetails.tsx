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

  const [contactText, setContactText] = useState("Olá! Tenho interesse neste produto. Pode dar-me mais informações?");
  const [contacting, setContacting] = useState(false);



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



  async function contactSeller() {
    if (!product || contacting) return;
    setContacting(true);
    setMessage("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, message: contactText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível contactar o vendedor.");
      window.location.assign(`/app/messages?conversationId=${encodeURIComponent(data.conversation.id)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível contactar o vendedor.");
      setContacting(false);
    }
  }

  if (loading) {

    return (

      <div className="text-[var(--theme-text)]/50">

        Loading product...

      </div>

    );

  }



  if (!product) {

    return (

      <div className="text-[var(--theme-text)]/50">

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
          bg-[var(--theme-surface-strong)]/10
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

              <span className="text-[var(--theme-text)]/40">

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
            text-[var(--theme-text)]/50
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



          <div className="mt-8 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text)]">Falar com o vendedor</p>
            <p className="mt-1 text-xs leading-5 text-[var(--theme-text)]/55">Esclareça dúvidas, confirme disponibilidade ou combine detalhes antes de comprar.</p>
            <textarea
              value={contactText}
              onChange={(event) => setContactText(event.target.value)}
              maxLength={2000}
              rows={3}
              aria-label="Mensagem para o vendedor"
              className="mt-3 w-full resize-y rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent)]"
            />
            <button type="button" onClick={contactSeller} disabled={contacting || contactText.trim().length < 2}
              className="mt-3 w-full rounded-full border border-[var(--theme-border)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-strong)] disabled:opacity-50">
              {contacting ? "A abrir conversa..." : "Enviar mensagem ao vendedor"}
            </button>
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
              bg-[var(--theme-surface-strong)]
              px-6
              py-4
              font-semibold
              text-[var(--theme-background)]
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
                text-[var(--theme-text)]/60
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
