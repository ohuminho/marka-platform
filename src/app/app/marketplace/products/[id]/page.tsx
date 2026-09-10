import ProductDetails from "@/frontend/features/marketplace/components/ProductDetails";


export default async function ProductPage({

  params,

}: {

  params: Promise<{
    id: string;
  }>;

}) {


  const {
    id,
  } = await params;



  return (

    <main className="
      min-h-screen
      p-8
    ">

      <ProductDetails
        productId={id}
      />

    </main>

  );

}
