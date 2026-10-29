import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";

export const dynamic = "force-dynamic";

async function authenticatedUser() {
  const token = (await cookies()).get("marka_session")?.value;
  if (!token) return null;

  const session = await new SessionService().validate(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).optional().default(""),
  sku: z.string().trim().max(80).optional(),
  image: z.string().trim().url().max(2048).optional().or(z.literal("")),
  price: z.coerce.number().finite().positive().max(1_000_000_000),
  currency: z.string().trim().length(3).default("AOA"),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  categoryName: z.string().trim().max(80).optional().default(""),
});

const productActionSchema = z.object({
  productId: z.string().uuid(),
  action: z.enum(["publish", "archive", "update"]),
  name: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(5000).optional(),
  image: z.string().trim().url().max(2048).optional().or(z.literal("")),
  price: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
});

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Inicie sessão para gerir a sua loja." }, { status: 401 });

    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: user.id },
      include: { store: true },
      orderBy: { createdAt: "asc" },
    });

    if (!vendor?.store) {
      return NextResponse.json({ vendor: null, products: [] });
    }

    const products = await prisma.product.findMany({
      where: { storeId: vendor.store.id },
      include: { category: true, inventory: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        status: vendor.status,
        verified: vendor.verified,
        store: {
          id: vendor.store.id,
          name: vendor.store.name,
          description: vendor.store.description,
          logo: vendor.store.logo,
          banner: vendor.store.banner,
          location: vendor.store.location,
          status: vendor.store.status,
        },
      },
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        image: product.image,
        price: Number(product.price),
        currency: product.currency,
        stock: product.stock,
        status: product.status,
        category: product.category ? { id: product.category.id, name: product.category.name } : null,
        createdAt: product.createdAt,
      })),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[VENDOR_PRODUCTS_GET]", error);
    return NextResponse.json({ message: "Não foi possível carregar o catálogo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Inicie sessão para gerir a sua loja." }, { status: 401 });

    const parsed = createProductSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Verifique o nome, preço, stock e imagem do produto.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: user.id },
      include: { store: true },
      orderBy: { createdAt: "asc" },
    });
    if (!vendor?.store) {
      return NextResponse.json({ message: "Abra primeiro a sua loja para começar a listar produtos.", code: "STORE_REQUIRED" }, { status: 409 });
    }
    if (vendor.status === "SUSPENDED" || vendor.status === "CLOSED") {
      return NextResponse.json({ message: "A sua conta comercial não pode criar anúncios neste momento." }, { status: 403 });
    }

    const input = parsed.data;
    let categoryId: string | null = null;
    if (input.categoryName) {
      const existingCategory = await prisma.category.findFirst({
        where: { name: { equals: input.categoryName, mode: "insensitive" }, status: "ACTIVE" },
        select: { id: true },
      });
      const category = existingCategory ?? await prisma.category.create({
        data: { name: input.categoryName, status: "ACTIVE" },
        select: { id: true },
      });
      categoryId = category.id;
    }

    const product = await prisma.product.create({
      data: {
        name: input.name,
        description: input.description || null,
        sku: input.sku || `MK-${crypto.randomUUID()}`,
        image: input.image || null,
        price: input.price.toFixed(4),
        currency: input.currency.toUpperCase(),
        stock: input.stock,
        status: "DRAFT",
        storeId: vendor.store.id,
        categoryId,
        inventory: {
          create: { quantityOnHand: input.stock, reserved: 0, reorderLevel: 0 },
        },
      },
      include: { category: true },
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        image: product.image,
        price: Number(product.price),
        currency: product.currency,
        stock: product.stock,
        status: product.status,
        category: product.category ? { id: product.category.id, name: product.category.name } : null,
      },
      message: "Produto guardado como rascunho. Será publicado quando a loja estiver aprovada.",
    }, { status: 201 });
  } catch (error) {
    console.error("[VENDOR_PRODUCTS_POST]", error);
    return NextResponse.json({ message: "Não foi possível guardar o produto." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ message: "Inicie sessão para gerir a sua loja." }, { status: 401 });

    const parsed = productActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Pedido de alteração inválido." }, { status: 400 });

    const vendor = await prisma.vendor.findFirst({
      where: { ownerId: user.id },
      include: { store: true },
      orderBy: { createdAt: "asc" },
    });
    if (!vendor?.store) return NextResponse.json({ message: "Loja não encontrada." }, { status: 404 });

    const { productId, action } = parsed.data;
    const product = await prisma.product.findFirst({ where: { id: productId, storeId: vendor.store.id } });
    if (!product) return NextResponse.json({ message: "Produto não encontrado nesta loja." }, { status: 404 });

    if (action === "publish") {
      if (vendor.status !== "ACTIVE" || !vendor.verified || vendor.store.status !== "ACTIVE") {
        return NextResponse.json({ message: "A publicação fica disponível depois da aprovação e verificação da loja.", code: "SELLER_APPROVAL_REQUIRED" }, { status: 409 });
      }
      if (product.stock < 1) return NextResponse.json({ message: "Adicione stock antes de publicar." }, { status: 422 });
      const updated = await prisma.product.update({ where: { id: product.id }, data: { status: "ACTIVE" } });
      return NextResponse.json({ product: updated, message: "Produto publicado." });
    }

    if (action === "archive") {
      const updated = await prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED" } });
      return NextResponse.json({ product: updated, message: "Produto arquivado." });
    }

    const data = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.product.update({
        where: { id: product.id },
        data: {
          name: data.name ?? undefined,
          description: data.description ?? undefined,
          image: data.image === "" ? null : data.image ?? undefined,
          price: data.price === undefined ? undefined : data.price.toFixed(4),
          stock: data.stock ?? undefined,
          categoryId: data.categoryId === "" ? null : data.categoryId ?? undefined,
        },
      });
      if (data.stock !== undefined) {
        await tx.inventory.upsert({
          where: { productId: product.id },
          create: { productId: product.id, quantityOnHand: data.stock, reserved: 0, reorderLevel: 0 },
          update: { quantityOnHand: data.stock },
        });
      }
      return saved;
    });
    return NextResponse.json({ product: updated, message: "Produto atualizado." });
  } catch (error) {
    console.error("[VENDOR_PRODUCTS_PATCH]", error);
    return NextResponse.json({ message: "Não foi possível atualizar o produto." }, { status: 500 });
  }
}
