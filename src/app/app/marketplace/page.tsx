import ProductGrid from "@/frontend/features/marketplace/components/ProductGrid";


export default function MarketplacePage() {


  return (

    <main className="
      min-h-screen
      p-8
    ">


      <section className="
        mb-10
      ">


        <h1 className="
          text-4xl
          font-semibold
        ">

          MARKA Marketplace

        </h1>



        <p className="
          mt-3
          text-white/50
        ">

          Discover products from verified digital vendors.

        </p>


      </section>



      <ProductGrid />


    </main>

  );

}
