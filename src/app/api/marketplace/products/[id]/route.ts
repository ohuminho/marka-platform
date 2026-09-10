import {
  NextResponse,
} from "next/server";


import {
  prisma,
} from "@/database/client/prisma";



export async function GET(

  request: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  }

) {


  const {
    id,
  } =
    await context.params;



  const product =
    await prisma.product.findUnique({

      where: {
        id,
      },


      include: {

        store: true,

        category: true,

      },

    });



  if (!product) {


    return NextResponse.json(

      {
        message: "Product not found",
      },

      {
        status: 404,
      }

    );

  }



  return NextResponse.json(
    product
  );


}
