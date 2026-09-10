import {
  MarketplaceProduct,
} from "../types/marketplace.types";


import VendorTrustBadge from "./VendorTrustBadge";



export default function ProductCard({

  product,

}: {

  product: MarketplaceProduct;

}) {


  return (

    <div className="
      rounded-2xl
      border
      border-white/10
      bg-white/5
      p-6
      backdrop-blur-xl
    ">


      <div className="
        aspect-square
        rounded-xl
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
                rounded-xl
                object-cover
              "

            />

            :

            <span className="text-white/40">

              Product

            </span>
        }


      </div>



      <h3 className="
        mt-5
        text-xl
        font-semibold
      ">

        {product.name}

      </h3>



      <p className="
        mt-2
        text-sm
        text-white/50
      ">

        {product.store.name}

      </p>



      <div className="
        mt-3
      ">

        <VendorTrustBadge

          verified={
            product.store.verified
          }

          rating={
            product.store.rating
          }

        />

      </div>



      <div className="
        mt-5
        flex
        justify-between
        items-center
      ">


        <span className="
          text-lg
          font-semibold
        ">

          {product.price} AOA

        </span>



        <span className="
          text-xs
          text-white/50
        ">

          Stock: {product.stock}

        </span>


      </div>


    </div>

  );

}
