import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/database/client/prisma";
import { getPublicSellerVerification } from "@/services/compliance/public-seller-verification.service";
import GrowthEntityEvent from "@/frontend/components/GrowthEntityEvent";

type PageProps = { params: Promise<{ id: string }> };

async function getStore(id: string) {
  const store = await prisma.store.findFirst({
    where: { id, status: "ACTIVE", vendor: { status: "ACTIVE" } },
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
      products: {
        where: { status: "ACTIVE", stock: { gt: 0 } },
        select: { id: true, name: true, description: true, image: true, price: true, currency: true, stock: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 60,
      },
    },
  });
  if (!store) return null;
  const verification = await getPublicSellerVerification([{
    id: store.vendor.id,
    ownerId: store.vendor.ownerId,
    organizationId: store.vendor.organizationId,
    businessType: store.vendor.businessType,
    status: store.vendor.status,
  }]);
  return {
    id: store.id,
    name: store.name,
    description: store.description,
    logo: store.logo,
    banner: store.banner,
    location: store.location,
    verified: verification.get(store.vendor.id) ?? false,
    products: store.products.map((product) => ({
      ...product,
      price: Number(product.price),
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) return { title: "Loja indisponível", robots: { index: false, follow: true } };
  const description = (store.description || `Conheça a loja ${store.name} no Marketplace MARKA e descubra os seus produtos e ofertas.`).slice(0, 155);
  const canonical = `/loja/${store.id}`;
  return {
    title: `${store.name} | Loja no Marketplace MARKA`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${store.name} | MARKA`,
      description,
      url: `https://markaao.com${canonical}`,
      siteName: "MARKA",
      locale: "pt_AO",
      type: "website",
      ...(store.banner || store.logo ? { images: [{ url: store.banner || store.logo!, alt: store.name }] } : {}),
    },
  };
}

export default async function PublicStorePage({ params }: PageProps) {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: store.name,
    url: `https://markaao.com/loja/${store.id}`,
    description: store.description || `Loja ${store.name} no Marketplace MARKA.`,
    ...(store.logo ? { logo: store.logo } : {}),
    ...(store.location ? { address: { "@type": "PostalAddress", addressLocality: store.location, addressCountry: "AO" } } : {}),
    parentOrganization: { "@type": "Organization", name: "MARKA", url: "https://markaao.com" },
  };

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <GrowthEntityEvent event="store_view" entityId={store.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#f2d18e]">MARKA</Link>
          <Link href="/marketplace" className="text-sm text-white/70 hover:text-white">Marketplace</Link>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
          {store.banner && <div className="h-44 bg-cover bg-center sm:h-64" style={{ backgroundImage: `url("${store.banner.replace(/["\\\\]/g, "")}")` }} />}
          <div className="flex flex-wrap items-center gap-5 p-6 sm:p-9">
            {store.logo && <img src={store.logo} alt="" className="h-20 w-20 rounded-2xl border border-white/10 object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#e4b963]">Loja no Marketplace MARKA</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{store.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
                {store.verified && <span className="rounded-full border border-[#d9b36a]/40 bg-[#d9b36a]/10 px-3 py-1.5 text-[#f2d18e]">MARKA Verified</span>}
                {store.location && <span>{store.location}</span>}
                <span>{store.products.length} ofertas disponíveis</span>
              </div>
            </div>
          </div>
          {store.description && <p className="max-w-3xl px-6 pb-7 text-sm leading-7 text-white/65 sm:px-9">{store.description}</p>}
        </div>
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[.24em] text-[#e4b963]">Catálogo</p><h2 className="mt-2 text-2xl font-bold">Produtos desta loja</h2></div>
            <Link href="/marketplace" className="text-sm text-white/60 underline underline-offset-4 hover:text-white">Explorar Marketplace</Link>
          </div>
          {store.products.length ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {store.products.map((product) => (
                <Link key={product.id} href={`/produto/${product.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] transition hover:-translate-y-1 hover:border-[#d9b36a]/50">
                  <div className="aspect-[4/3] overflow-hidden bg-black/20">
                    {product.image ? <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center font-black text-[#f2d18e]">MARKA</div>}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-[#f2d18e]">{new Intl.NumberFormat("pt-AO", { style: "currency", currency: product.currency, maximumFractionDigits: 0 }).format(product.price)}</p>
                    <p className="mt-2 text-xs text-white/45">Ver produto →</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="mt-6 rounded-2xl border border-white/10 p-7 text-sm text-white/55">Esta loja ainda não tem ofertas disponíveis.</p>}
        </section>
      </div>
      <footer className="mt-16 border-t border-white/10 px-5 py-8 text-center text-xs text-white/45">MARKA · Powered By Magestade Pura Digital</footer>
    </main>
  );
}
