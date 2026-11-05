import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/database/client/prisma";
import { getPublicSellerVerification } from "@/services/compliance/public-seller-verification.service";
import PublicProductPurchase from "@/frontend/features/marketplace/components/PublicProductPurchase";
import GrowthEntityEvent from "@/frontend/components/GrowthEntityEvent";

type PageProps = { params: Promise<{ id: string }> };

async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: {
      id,
      status: "ACTIVE",
      stock: { gt: 0 },
      store: { status: "ACTIVE", vendor: { status: "ACTIVE" } },
    },
    include: {
      store: {
        include: {
          vendor: {
            select: {
              id: true,
              ownerId: true,
              organizationId: true,
              businessType: true,
              status: true,
            },
          },
        },
      },
      category: true,
    },
  });

  if (!product) return null;
  const verification = await getPublicSellerVerification([{
    id: product.store.vendor.id,
    ownerId: product.store.vendor.ownerId,
    organizationId: product.store.vendor.organizationId,
    businessType: product.store.vendor.businessType,
    status: product.store.vendor.status,
  }]);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    image: product.image,
    price: Number(product.price),
    currency: product.currency,
    stock: product.stock,
    updatedAt: product.updatedAt,
    store: {
      id: product.store.id,
      name: product.store.name,
      location: product.store.location,
      verified: verification.get(product.store.vendor.id) ?? false,
    },
    category: product.category?.name ?? null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Produto indisponível", robots: { index: false, follow: true } };

  const description = (product.description || `Descubra ${product.name} na loja ${product.store.name}, no Marketplace MARKA.`).slice(0, 155);
  const canonical = `/produto/${product.id}`;
  return {
    title: `${product.name} | Comprar no Marketplace`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} | MARKA`,
      description,
      url: `https://markaao.com${canonical}`,
      siteName: "MARKA",
      locale: "pt_AO",
      type: "website",
      ...(product.image ? { images: [{ url: product.image, alt: product.name }] } : {}),
    },
    twitter: {
      card: product.image ? "summary_large_image" : "summary",
      title: `${product.name} | MARKA`,
      description,
      ...(product.image ? { images: [product.image] } : {}),
    },
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const price = new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 0,
  }).format(product.price);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `Produto disponível na loja ${product.store.name} na MARKA.`,
    ...(product.image ? { image: [product.image] } : {}),
    category: product.category || undefined,
    brand: { "@type": "Brand", name: product.store.name },
    offers: {
      "@type": "Offer",
      url: `https://markaao.com/produto/${product.id}`,
      price: product.price,
      priceCurrency: product.currency,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: product.store.name },
    },
  };

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <GrowthEntityEvent event="product_view" entityId={product.id} category={product.category} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#f2d18e]">MARKA</Link>
          <Link href="/marketplace" className="text-sm text-white/70 hover:text-white">Marketplace</Link>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-white/45">
          <Link href="/" className="hover:text-white">Início</Link><span className="px-2">/</span>
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link><span className="px-2">/</span>
          <span className="text-white/75">{product.name}</span>
        </nav>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
            {product.image ? (
              <Image src={product.image} alt={product.name} fill priority unoptimized className="object-contain p-4" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl font-black tracking-tight text-[#f2d18e]">MARKA</div>
            )}
          </div>
          <section className="flex flex-col justify-center">
            {product.category && <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#e4b963]">{product.category}</p>}
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-6 text-3xl font-semibold text-[#f2d18e]">{price}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/65">
              <span className="rounded-full border border-white/15 px-3 py-1.5">{product.store.name}</span>
              {product.store.verified && <span className="rounded-full border border-[#d9b36a]/40 bg-[#d9b36a]/10 px-3 py-1.5 text-[#f2d18e]">MARKA Verified</span>}
              {product.store.location && <span>{product.store.location}</span>}
            </div>
            {product.description && <div className="mt-8 border-t border-white/10 pt-6"><h2 className="text-sm font-semibold">Descrição</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/65">{product.description}</p></div>}
            <p className="mt-6 text-xs text-white/45">{product.stock} unidade(s) indicadas como disponíveis. Confirme a disponibilidade antes de concluir a compra.</p>
            <div className="mt-8"><PublicProductPurchase productId={product.id} storeId={product.store.id} /></div>
            <p className="mt-5 text-xs leading-6 text-white/40">A compra e o pagamento são concluídos dentro da MARKA, sujeitos à disponibilidade dos serviços e às condições apresentadas no checkout.</p>
          </section>
        </div>
      </div>
      <footer className="mt-16 border-t border-white/10 px-5 py-8 text-center text-xs text-white/45">MARKA · Powered By Magestade Pura Digital</footer>
    </main>
  );
}
