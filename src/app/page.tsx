import Link from "next/link";
import type { Metadata } from "next";
import MarkaVehicleIllustration from "@/frontend/features/mobility/components/MarkaVehicleIllustration";

export const metadata: Metadata = {
  title: "MARKA — Comércio, mobilidade e logística",
  description:
    "Marketplace, mobilidade de passageiros e logística de carga numa única plataforma digital.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MARKA — Comércio, mobilidade e logística",
    description:
      "Descubra produtos, serviços, mobilidade e soluções de carga numa única plataforma.",
    url: "https://markaao.com",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MARKA — Comércio, mobilidade e logística",
    description:
      "Marketplace, mobilidade e logística numa experiência integrada.",
  },
};

const pillars = [
  {
    title: "MARKA Marketplace",
    description:
      "Lojas, agricultura, construção, máquinas, imobiliário, serviços, produtos novos e usados.",
    href: "/app/marketplace",
    action: "Explorar Marketplace",
  },
  {
    title: "MARKA Mobility",
    description:
      "Táxi, mototáxi e transporte executivo, com pedidos de viagem e acompanhamento.",
    href: "/app/mobility",
    action: "Abrir Mobility",
  },
  {
    title: "MARKA Logistics / Freight",
    description:
      "Transporte de carga, pickups, carrinhas, camiões, basculantes e fornecimento de água por volume.",
    href: "/app/mobility/carga",
    action: "Pedir carga ou cisterna",
  },
  {
    title: "MARKA Ads",
    description:
      "Mais visibilidade para lojas, produtos e serviços através de espaços de promoção na plataforma.",
    href: "/advertise",
    action: "Conhecer publicidade",
  },
  {
    title: "MARKA AI",
    description:
      "Assistência inteligente para orientar utilizadores e facilitar a descoberta de serviços e oportunidades.",
    href: "/app/assistant",
    action: "Conhecer MARKA AI",
  },
];

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "MARKA",
      url: "https://markaao.com",
      email: "info@markaao.com",
      description:
        "Plataforma digital de comércio, serviços, negócios, mobilidade e logística.",
      areaServed: { "@type": "Country", name: "Angola" },
      parentOrganization: {
        "@type": "Organization",
        name: "Magestade Pura Digital",
      },
    },
    {
      "@type": "WebSite",
      name: "MARKA",
      url: "https://markaao.com",
      inLanguage: "pt-AO",
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 selection:bg-[#F5C451] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData),
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070709]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="MARKA — início" className="flex items-center gap-2.5">
            <span className="text-lg font-extrabold tracking-[0.22em] text-white">
              MARKA<span className="text-[#F5C451]">.</span>
            </span>
            <span className="hidden rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#F5C451] sm:inline-block">
              Angola · Global
            </span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden items-center gap-7 text-xs font-medium text-zinc-400 md:flex">
            <Link href="/app/marketplace" className="transition hover:text-white">Marketplace</Link>
            <Link href="/app/mobility" className="transition hover:text-white">Mobility</Link>
            <Link href="/app/mobility/carga" className="transition hover:text-white">Logistics & Carga</Link>
            <Link href="/app/assistant" className="transition hover:text-white">MARKA AI</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/auth/login" className="hidden rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:text-white sm:inline-flex">
              Entrar
            </Link>
            <Link
              href="/app/mobility"
              className="rounded-xl bg-gradient-to-r from-[#F5C451] to-[#D4AF37] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-amber-500/15 transition hover:brightness-105"
            >
              Abrir MARKA
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-white/5 py-16 sm:py-24">
          <div aria-hidden="true" className="absolute -top-24 left-1/2 -z-10 h-72 w-[720px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[130px]" />
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[11px] font-medium text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-[#F5C451]" />
                Magestade Pura Digital · Plataforma tecnológica integrada
              </div>

              <h1 id="hero-title" className="max-w-4xl text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Comércio, mobilidade e logística num{" "}
                <span className="bg-gradient-to-r from-white via-[#F5C451] to-[#C99A2E] bg-clip-text text-transparent">
                  padrão global de excelência.
                </span>
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                A MARKA aproxima pessoas, negócios e prestadores de serviços.
                Descubra produtos, encontre opções de transporte e solicite
                soluções de carga numa única experiência digital, construída
                em Angola com ambição de expansão internacional.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/app/marketplace" className="rounded-2xl bg-gradient-to-r from-[#F5C451] via-[#E5B84B] to-[#C99A2E] px-6 py-3.5 text-xs font-extrabold tracking-wide text-black shadow-xl shadow-amber-500/20 transition hover:brightness-105 sm:text-sm">
                  Explorar MARKA
                </Link>
                <Link href="/app/mobility" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-semibold text-white backdrop-blur-xl transition hover:border-amber-400/40 sm:text-sm">
                  Solicitar mobilidade
                </Link>
                <Link href="/app/mobility/carga" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-semibold text-white backdrop-blur-xl transition hover:border-amber-400/40 sm:text-sm">
                  Pedir carga ou cisterna
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="space-y-4 rounded-3xl border border-amber-400/20 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F5C451]">Frota & Logística MARKA</span>
                  <span className="text-[11px] text-zinc-400">Ilustração vetorial SVG</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="EXECUTIVE_SUV" className="mx-auto h-12 w-28" active />
                    <p className="mt-1 text-center text-xs font-bold text-white">Executivo</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="WATER_TANKER" className="mx-auto h-12 w-28" active />
                    <p className="mt-1 text-center text-xs font-bold text-white">Cisterna</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="LIGHT_TRUCK" className="mx-auto h-12 w-28" active />
                    <p className="mt-1 text-center text-xs font-bold text-white">Dyna / Canter</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="TIPPER_TRUCK" className="mx-auto h-12 w-28" active />
                    <p className="mt-1 text-center text-xs font-bold text-white">Basculante</p>
                  </div>
                </div>
                <p className="text-center text-[10px] text-zinc-500">
                  Veículos e serviços disponibilizados por operadores parceiros.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="pillars-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-2xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#F5C451]">Arquitetura integrada</span>
            <h2 id="pillars-title" className="text-2xl font-extrabold text-white sm:text-3xl">
              Cinco pilares. Um único ecossistema.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-3xl border border-white/10 bg-zinc-950/75 p-6 backdrop-blur-xl transition hover:border-amber-400/35">
                <h3 className="text-base font-bold text-white">{pillar.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">{pillar.description}</p>
                <Link href={pillar.href} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#F5C451] transition hover:gap-3">
                  {pillar.action}<span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#0B0B0E] py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5C451]">Magestade Pura Digital · Portfólio tecnológico</span>
              <h2 className="text-lg font-bold text-white">
                MARKA e ZION, marcas do portfólio da Magestade Pura Digital
              </h2>
              <p className="text-xs leading-relaxed text-zinc-400">
                Soluções digitais com propósitos distintos, desenvolvidas sob a
                visão de longo prazo da Magestade Pura Digital.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/30 bg-[#070709] px-4 py-3">
                <p className="text-xs font-extrabold text-white">MARKA</p>
                <p className="mt-1 text-[10px] text-zinc-400">Comércio, mobilidade e carga</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#070709] px-4 py-3">
                <p className="text-xs font-extrabold text-[#F5C451]">ZION</p>
                <p className="mt-1 text-[10px] text-zinc-500">Ecossistema digital</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050507] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <p>MARKA · Powered By Magestade Pura Digital · <a href="https://markaao.com" className="transition hover:text-zinc-300">markaao.com</a></p>
          <div className="flex items-center gap-5">
            <Link href="/legal/privacy" className="hover:text-zinc-300">Privacidade</Link>
            <Link href="/legal/mobility-driver" className="hover:text-zinc-300">Motoristas & Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
