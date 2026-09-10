"use client";


import {
  useEffect,
  useState,
} from "react";


import CartDrawer from "@/frontend/features/cart/components/CartDrawer";


import {
  getCart,
} from "@/frontend/features/cart/services/cart.client";



export default function CartButton() {


  const [
    open,
    setOpen
  ] =
    useState(false);



  const [
    count,
    setCount
  ] =
    useState(0);



  async function loadCount() {


    try {


      const cart =
        await getCart();



      const total =
        cart.items.reduce(

          (
            sum,
            item
          ) =>

            sum + item.quantity,

          0

        );



      setCount(
        total
      );


    } catch {


      setCount(0);


    }


  }



  useEffect(() => {


    loadCount();


  }, []);



  return (

    <>

      <button

        onClick={() =>
          setOpen(true)
        }

        className="
          relative
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-full
          border
          border-white/10
          bg-white/5
          backdrop-blur-xl
          transition
          hover:bg-white/10
        "

      >

        <svg

          width="22"

          height="22"

          viewBox="0 0 24 24"

          fill="none"

          stroke="currentColor"

          strokeWidth="2"

          strokeLinecap="round"

          strokeLinejoin="round"

        >

          <circle cx="9" cy="20" r="1" />

          <circle cx="20" cy="20" r="1" />

          <path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6" />

        </svg>



        {
          count > 0 && (

            <span

              className="
                absolute
                -right-1
                -top-1
                flex
                h-5
                min-w-5
                items-center
                justify-center
                rounded-full
                bg-white
                px-1
                text-xs
                font-semibold
                text-black
              "

            >

              {count}

            </span>

          )
        }


      </button>



      {
        open && (

          <div

            onClick={() =>
              setOpen(false)
            }

            className="
              fixed
              inset-0
              z-40
              bg-black/40
            "

          >

            <div

              onClick={(event) =>
                event.stopPropagation()
              }

              className="
                absolute
                right-0
                top-0
                z-50
              "

            >

              <CartDrawer />

            </div>

          </div>

        )
      }


    </>

  );

}
