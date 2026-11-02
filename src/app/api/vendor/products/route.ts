import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { getPublicSellerVerification } from "@/services/compliance/public-seller-verification.service";

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
  brand: z.string().trim().max(100).optional().default(""), model: z.string().trim().max(100).optional().default(""),
  year: z.coerce.number().int().min(1950).max(2035).optional().or(z.literal("")), mileage: z.coerce.number().int().min(0).max(10_000_000).optional().or(z.literal("")),
  condition: z.string().trim().max(40).optional().default(""), fuel: z.string().trim().max(40).optional().default(""), transmission: z.string().trim().max(40).optional().default(""),
  spaceBookingEnabled: z.boolean().optional().default(false),
  propertyType: z.string().trim().max(80).optional().default(""), transactionType: z.string().trim().max(40).optional().default(""),
  bedrooms: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")), bathrooms: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")),
  area: z.coerce.number().positive().max(10_000_000).optional().or(z.literal("")), location: z.string().trim().max(200).optional().default(""),
  serviceType: z.string().trim().max(160).optional().default(""), availability: z.string().trim().max(120).optional().default(""), duration: z.string().trim().max(80).optional().default(""),
  productType: z.string().trim().max(160).optional().default(""), unit: z.string().trim().max(60).optional().default(""), capacity: z.string().trim().max(120).optional().default(""),
  images: z.array(z.string().trim().url().max(2048)).max(10).optional().default([]),
  videos: z.array(z.string().trim().url().max(2048)).max(3).optional().default([]),
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
  attributes: z.record(z.string(), z.string().trim().max(500)).optional(),
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
        attributes: product.attributes,
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
    const categoryName = input.categoryName.toLocaleLowerCase();
    const sensitiveCategory =
      ["automóveis", "motociclos", "imóveis e arrendamento"].includes(categoryName) ||
      input.price >= 5_000_000;
    const identity = await getPublicSellerVerification([{
      id: vendor.id,
      ownerId: vendor.ownerId,
      organizationId: vendor.organizationId,
      businessType: vendor.businessType,
      status: vendor.status,
    }]);
    const identityVerified = identity.get(vendor.id) === true;
    const isServiceCategory = categoryName.startsWith("serviços");
    const isPropertyCategory = categoryName === "imóveis e arrendamento";
    if (isServiceCategory && !input.serviceType.trim()) {
      return NextResponse.json({ message: "Escolha o tipo de serviço que presta." }, { status: 400 });
    }
    if (!isServiceCategory && !isPropertyCategory && !input.productType.trim()) {
      return NextResponse.json({ message: "Escolha o tipo de produto ou mercadoria que vende." }, { status: 400 });
    }
    const details: string[] = [];
    const attributes: Record<string, string> = {};
    const addDetail = (label: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== "") details.push(`${label}: ${String(value)}`);
    };
    if (categoryName === "automóveis" || categoryName === "motociclos") {
      addDetail("Marca", input.brand); addDetail("Modelo", input.model); addDetail("Ano", input.year);
      addDetail("Quilometragem (km)", input.mileage); addDetail("Estado", input.condition);
      addDetail("Combustível", input.fuel); addDetail("Transmissão", input.transmission);
      for (const [key, value] of Object.entries({ brand: input.brand, model: input.model, year: input.year, mileage: input.mileage, condition: input.condition, fuel: input.fuel, transmission: input.transmission })) if (value !== undefined && value !== null && value !== "") attributes[key] = String(value);
    } else if (categoryName === "imóveis e arrendamento") {
      addDetail("Tipo de imóvel", input.propertyType); addDetail("Finalidade", input.transactionType);
      addDetail("Quartos", input.bedrooms); addDetail("Casas de banho", input.bathrooms);
      addDetail("Área (m²)", input.area); addDetail("Localização", input.location);
      for (const [key, value] of Object.entries({ propertyType: input.propertyType, transactionType: input.transactionType, bedrooms: input.bedrooms, bathrooms: input.bathrooms, area: input.area, location: input.location })) if (value !== undefined && value !== null && value !== "") attributes[key] = String(value);
      if (input.spaceBookingEnabled && ["sala de reuniões","sala de conferências","sala de formação","coworking","espaço para eventos"].includes(input.propertyType.toLocaleLowerCase())) attributes.spaceBookingEnabled = "true";
    } else if (categoryName.startsWith("serviços")) {
      addDetail("Especialidade", input.serviceType); addDetail("Disponibilidade", input.availability); addDetail("Duração estimada", input.duration);
      for (const [key, value] of Object.entries({ serviceType: input.serviceType, availability: input.availability, duration: input.duration })) if (value !== undefined && value !== null && value !== "") attributes[key] = String(value);
    }
    if (input.productType) { addDetail("Tipo de produto", input.productType); attributes.productType = input.productType; }
    if (input.unit) { addDetail("Unidade de venda", input.unit); attributes.unit = input.unit; }
    if (input.capacity) { addDetail("Capacidade / medida", input.capacity); attributes.capacity = input.capacity; }
    if (input.images.length) attributes.galleryImages = JSON.stringify(input.images);
    if (input.videos.length) attributes.galleryVideos = JSON.stringify(input.videos);
    const completeDescription = [input.description, details.length ? `Detalhes do anúncio:\n${details.join("\n")}` : ""].filter(Boolean).join("\n\n").slice(0, 5000);
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
        description: completeDescription || null,
        attributes: Object.keys(attributes).length ? attributes : undefined,
        sku: input.sku || `MK-${crypto.randomUUID()}`,
        image: input.image || input.images[0] || null,
        price: input.price.toFixed(4),
        currency: input.currency.toUpperCase(),
        stock: input.stock,
        status:
          vendor.status === "ACTIVE" &&
          vendor.store.status === "ACTIVE" &&
          vendor.businessType === "INDIVIDUAL" &&
          input.stock > 0 &&
          !sensitiveCategory
            ? "ACTIVE"
            : "DRAFT",
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
      message: product.status === "ACTIVE"
        ? (identityVerified
            ? "Produto publicado no Marketplace."
            : "Produto publicado. A identidade do vendedor ainda não foi verificada.")
        : (sensitiveCategory
            ? "Anúncio guardado como rascunho. Esta categoria ou valor exige verificação de identidade e validação adicional."
            : "Produto guardado como rascunho. Adicione stock ou aguarde a aprovação da loja."),
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
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: vendor.store.id },
      include: { category: true },
    });
    if (!product) return NextResponse.json({ message: "Produto não encontrado nesta loja." }, { status: 404 });

    if (action === "publish") {
      if (vendor.status !== "ACTIVE" || vendor.store.status !== "ACTIVE") {
        return NextResponse.json({ message: "A loja ainda aguarda aprovação ou está suspensa.", code: "SELLER_APPROVAL_REQUIRED" }, { status: 409 });
      }
      const categoryName = product.category?.name?.trim().toLocaleLowerCase() ?? "";
      const sensitiveCategory =
        ["automóveis", "motociclos", "imóveis e arrendamento"].includes(categoryName) ||
        Number(product.price) >= 5_000_000;
      if (sensitiveCategory) {
        const identity = await getPublicSellerVerification([{
          id: vendor.id,
          ownerId: vendor.ownerId,
          organizationId: vendor.organizationId,
          businessType: vendor.businessType,
          status: vendor.status,
        }]);
        if (identity.get(vendor.id) !== true) {
          return NextResponse.json({ message: "Esta categoria ou valor exige identidade verificada antes da publicação.", code: "SELLER_VERIFICATION_REQUIRED" }, { status: 403 });
        }
        return NextResponse.json({ message: "A publicação desta categoria exige também validação documental de propriedade ou autorização.", code: "OWNERSHIP_REVIEW_REQUIRED" }, { status: 409 });
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
          attributes: data.attributes === undefined ? undefined : data.attributes,
        },
      });
      if (data.stock !== undefined) {
        const inventory = await tx.inventory.findUnique({ where: { productId: product.id } });
        if (inventory && data.stock < inventory.reserved) {
          throw new Error("STOCK_BELOW_RESERVED");
        }
        await tx.inventory.upsert({
          where: { productId: product.id },
          create: { productId: product.id, quantityOnHand: data.stock, reserved: 0, reorderLevel: 0 },
          update: { quantityOnHand: data.stock + (inventory?.reserved ?? 0) },
        });
      }
      return saved;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
    return NextResponse.json({ product: updated, message: "Produto atualizado." });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_BELOW_RESERVED") {
      return NextResponse.json({ message: "O stock não pode ficar abaixo das unidades já reservadas em encomendas.", code: "STOCK_BELOW_RESERVED" }, { status: 409 });
    }
    console.error("[VENDOR_PRODUCTS_PATCH]", error);
    return NextResponse.json({ message: "Não foi possível atualizar o produto." }, { status: 500 });
  }
}
