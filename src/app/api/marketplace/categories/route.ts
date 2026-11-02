import { NextResponse } from "next/server";
import { prisma } from "@/database/client/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      { categories },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[MARKETPLACE_CATEGORIES_ERROR]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar as categorias.", code: "MARKETPLACE_CATEGORIES_FAILED" },
      { status: 500 },
    );
  }
}
