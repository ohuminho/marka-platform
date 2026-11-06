import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/database/client/prisma";
import { getPublicSellerVerification } from "@/services/compliance/public-seller-verification.service";

type PageProps = { params: Promise<{ id: string }> };

async function getPublicProfile(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, status: "ACTIVE" },
    select: {
      id: true, name: true,
      profile: { select: { displayName: true, avatarUrl: true, countryCode: true } },
      vendors: {
        where: { status: "ACTIVE", store: { status: "ACTIVE" } },
        select: {
          id: true, ownerId: true, organizationId: true, businessType: true, status: true,
          store: { select: { id: true, name: true, description: true, logo: true, location: true, _count: { select: { products: true } } } },
        },
      },
    },
  });
  if (!user) return null;
  const verification = await getPublicSellerVerification(user.vendors.map((vendor) => ({
    id: vendor.id, ownerId: vendor.ownerId, organizationId: vendor.organizationId,
    businessType: vendor.businessType, status: vendor.status,
  })));
  return {
    id: user.id, name: user.profile?.displayName || user.name, avatarUrl: user.profile?.avatarUrl,
    countryCode: user.profile?.countryCode,
    stores: user.vendors.filter((vendor) => vendor.store).map((vendor) => ({
      ...vendor.store!, verified: verification.get(vendor.id) ?? false,
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) return { title: "Perfil indisponível", robots: { index: false, follow: true } };
  return {
    title: `${profile.name} | Perfil MARKA`,
    description: `Conheça o perfil público de ${profile.name} e as suas lojas no Marketplace MARKA.`,
    alternates: { canonical: `/perfil/${profile.id}` },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();
  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <header className="border-b border-white/10"><nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Link href="/" className="text-2xl font-black text-[#f2d18e]">MARKA</Link><Link href="/marketplace" className="text-sm text-white/65">Marketplace</Link></nav></header>
      <div className="mx-auto max-w-5xl px-5 py-12">
        <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-white/10 bg-white/[.035] p-7 sm:p-10">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full border border-white/10 object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-bold text-[#f2d18e]">{profile.name.slice(0,1).toUpperCase()}</div>}
          <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e4b963]">Perfil público MARKA</p><h1 className="mt-2 text-3xl font-black">{profile.name}</h1>{profile.countryCode && <p className="mt-2 text-xs text-white/50">{profile.countryCode}</p>}</div>
        </section>
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Lojas deste vendedor</h2>
          {profile.stores.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{profile.stores.map((store) => <Link key={store.id} href={`/loja/${store.id}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 hover:border-[#d9b36a]/40">{store.logo ? <img src={store.logo} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 font-bold text-[#f2d18e]">M</div>}<div className="min-w-0"><h3 className="font-semibold">{store.name}</h3><p className="mt-1 text-xs text-white/55">{store.verified ? "MARKA Verified" : "Loja não verificada"} · {store._count.products} anúncios</p>{store.location && <p className="mt-1 text-xs text-white/40">{store.location}</p>}</div></Link>)}</div> : <p className="mt-4 rounded-2xl border border-white/10 p-6 text-sm text-white/55">Este perfil ainda não tem lojas públicas.</p>}
        </section>
      </div>
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/45">MARKA · Powered By Magestade Pura Digital</footer>
    </main>
  );
}
