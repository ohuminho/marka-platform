"use client";


import {
  useEffect,
  useState,
} from "react";


import {
  Cart,
} from "../types/cart.types";


import {
  getCart,
} from "../services/cart.client";



export default function CartDrawer() {


  const [
    cart,
    setCart
  ] =
    useState<Cart>();


  const [
    loading,
    setLoading
  ] =
    useState(true);



  useEffect(() => {


    async function loadCart() {


      try {


        const data =
          await getCart();


        setCart(
          data
        );


      } finally {


        setLoading(false);


      }


    }


    loadCart();


  }, []);



  if (loading) {


    return (

      <div className="
        text-white/50
      ">

        Loading cart...

      </div>

    );

  }



  const total =
    cart?.items.reduce(

      (
        sum,
        item
      ) =>

        sum +
        item.product.price *
        item.quantity,

      0

    ) || 0;



  return (

    <aside className="
      fixed
      right-0
      top-0
      h-screen
      w-full
      max-w-md
      border-l
      border-white/10
      bg-black/80
      backdrop-blur-2xl
      p-8
    ">


      <h2 className="
        text-2xl
        font-semibold
      ">

        Shopping Cart

      </h2>



      <div className="
        mt-8
        space-y-5
      ">


        {
          cart?.items.length

            ?

            cart.items.map(

              item => (

                <div
                  key={
                    item.id
                  }

                  className="
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/5
                    p-4
                  "
                >

                  <p className="
                    font-medium
                  ">

                    {item.product.name}

                  </p>


                  <p className="
                    mt-2
                    text-sm
                    text-white/50
                  ">

                    {item.quantity} x {item.product.price} AOA

                  </p>


                </div>

              )

            )

            :

            <p className="
              text-white/50
            ">

              Your cart is empty.

            </p>

        }


      </div>



      <div className="
        absolute
        bottom-8
        left-8
        right-8
      ">


        <div className="
          mb-4
          text-xl
          font-semibold
        ">

          Total: {total} AOA

        </div>



        <button className="
          w-full
          rounded-2xl
          bg-white
          px-6
          py-4
          font-semibold
          text-black
        ">

          Checkout

        </button>


      </div>


    </aside>

  );

}
