import Link from "next/link";
import type { Metadata } from "next";
import MarkaVehicleIllustration from "@/frontend/features/mobility/components/MarkaVehicleIllustration";

const siteUrl = "https://markaao.com";

export const metadata: Metadata = {
  title: { absolute: "MARKA AO | Marketplace, Mobilidade e Logística em Angola" },
  description:
    "MARKA AO é uma plataforma digital em Angola para descobrir produtos, lojas e serviços, solicitar táxi e mototáxi e encontrar soluções de transporte de carga.",
  applicationName: "MARKA",
  keywords: [
    "MARKA",
    "MARKA AO",
    "MARKA Angola",
    "MARKA plataforma",
    "marketplace Angola",
    "comprar e vender online Angola",
    "lojas e serviços Angola",
    "táxi Angola",
    "mototáxi Angola",
    "transporte de carga Angola",
    "logística Angola",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "MARKA AO | Comércio, Mobilidade e Logística em Angola",
    description:
      "Descubra produtos, lojas e serviços. Explore mobilidade de passageiros e soluções de carga numa única plataforma digital angolana.",
    url: siteUrl,
    siteName: "MARKA AO",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MARKA AO | A plataforma digital de Angola",
    description:
      "Marketplace, mobilidade e logística numa experiência integrada. Conheça a MARKA em markaao.com.",
  },
};

const pillars = [
  {
    number: "01",
    title: "MARKA Marketplace",
    eyebrow: "COMÉRCIO · LOJAS · SERVIÇOS",
    description:
      "Descubra produtos, lojas, agricultura, construção, máquinas, imóveis, serviços profissionais e oportunidades comerciais.",
    href: "/marketplace",
    action: "Explorar Marketplace",
  },
  {
    number: "02",
    title: "MARKA Mobility",
    eyebrow: "TÁXI · MOTO-TÁXI · EXECUTIVO",
    description:
      "Peça uma viagem e encontre opções de mobilidade, com pedidos digitais e acompanhamento conforme a disponibilidade.",
    href: "/mobilidade",
    action: "Conhecer Mobility",
  },
  {
    number: "03",
    title: "MARKA Logistics",
    eyebrow: "CARGA · TRANSPORTE · CISTERNAS",
    description:
      "Solicite transporte de mercadorias, pickups, carrinhas, Dyna/Canter, camiões, basculantes e fornecimento de água por volume.",
    href: "/app/mobility/carga",
    action: "Pedir carga ou cisterna",
  },
  {
    number: "04",
    title: "MARKA Ads",
    eyebrow: "PUBLICIDADE · CRESCIMENTO",
    description:
      "Apresente a sua marca, promova produtos e explore oportunidades de comunicação comercial dentro do ecossistema.",
    href: "/advertise",
    action: "Explorar parcerias",
  },
  {
    number: "05",
    title: "MARKA AI",
    eyebrow: "INTELIGÊNCIA · ASSISTÊNCIA",
    description:
      "Uma camada inteligente para ajudar na descoberta, orientação e evolução contínua da experiência MARKA.",
    href: "/app/assistant",
    action: "Conhecer MARKA AI",
  },
];

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "MARKA",
      legalName: "MARKA",
      alternateName: ["MARKA AO", "MARKA Angola"],
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/marka-icon.svg`,
      },
      email: "info@markaao.com",
      description:
        "MARKA AO é uma plataforma digital angolana que aproxima comércio, serviços, mobilidade e logística.",
      areaServed: {
        "@type": "Country",
        name: "Angola",
      },
      parentOrganization: {
        "@type": "Organization",
        name: "Magestade Pura Digital",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "info@markaao.com",
        availableLanguage: ["Portuguese"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "MARKA AO",
      alternateName: "MARKA",
      url: siteUrl,
      inLanguage: "pt-AO",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: "MARKA AO | Marketplace, Mobilidade e Logística em Angola",
      description:
        "Conheça a MARKA AO: marketplace, mobilidade de passageiros e logística de carga numa única plataforma digital.",
      inLanguage: "pt-AO",
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

const safeStructuredData = JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c");

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#070709] text-zinc-100 selection:bg-[#F5C451] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeStructuredData }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070709]/85 backdrop-blur-2xl">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
        >
          <Link href="/" aria-label="MARKA AO — página inicial" className="flex items-center gap-2.5">
            <span className="text-lg font-extrabold tracking-[0.22em] text-white">
              MARKA<span className="text-[#F5C451]">.</span>
            </span>
            <span className="hidden rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#F5C451] sm:inline-block">
              Angola · Global
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-xs font-medium text-zinc-400 md:flex">
            <Link href="/marketplace" className="transition hover:text-white">Marketplace</Link>
            <Link href="/mobilidade" className="transition hover:text-white">Mobility</Link>
            <Link href="/app/mobility/carga" className="transition hover:text-white">Logistics & Carga</Link>
            <Link href="/advertise" className="transition hover:text-white">Parcerias</Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/auth/login" className="hidden rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:text-white sm:inline-flex">
              Entrar
            </Link>
            <Link
              href="/app"
              className="rounded-xl bg-gradient-to-r from-[#F5C451] to-[#D4AF37] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-amber-500/15 transition hover:brightness-105"
            >
              Abrir MARKA
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-white/5">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-32 -z-10 h-[34rem] w-[34rem] rounded-full bg-amber-400/10 blur-[130px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 left-[-10rem] -z-10 h-[28rem] w-[28rem] rounded-full bg-amber-100/[0.06] blur-[120px]" />

          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-12 lg:gap-8 lg:py-28">
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[11px] font-medium text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-[#F5C451]" />
                Magestade Pura Digital · Plataforma tecnológica integrada
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#D8BD83] sm:text-[11px]">
                MARKA AO · Construída em Angola, pensada para crescer
              </p>
              <h1 id="hero-title" className="max-w-4xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Comércio, mobilidade e logística num{" "}
                <span className="bg-gradient-to-r from-white via-[#F5C451] to-[#C99A2E] bg-clip-text text-transparent">
                  novo padrão de experiência.
                </span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-300/75 sm:text-base sm:leading-8">
                A MARKA é uma plataforma digital em Angola que aproxima pessoas,
                comerciantes, prestadores de serviços e operadores de transporte.
                Descubra produtos e lojas, encontre serviços, solicite táxi ou
                mototáxi e organize o transporte de carga — num único ecossistema.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/marketplace" className="rounded-2xl bg-gradient-to-r from-[#F5C451] via-[#E5B84B] to-[#C99A2E] px-6 py-3.5 text-xs font-extrabold tracking-wide text-black shadow-xl shadow-amber-500/20 transition hover:brightness-105 sm:text-sm">
                  Explorar Marketplace
                </Link>
                <Link href="/mobilidade" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-semibold text-white backdrop-blur-xl transition hover:border-amber-400/40 sm:text-sm">
                  Solicitar mobilidade
                </Link>
                <Link href="/app/mobility/carga" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-semibold text-white backdrop-blur-xl transition hover:border-amber-400/40 sm:text-sm">
                  Pedir carga ou cisterna
                </Link>
              </div>
              <p className="max-w-xl text-[11px] leading-5 text-zinc-500">
                A MARKA é a plataforma de ligação. Os veículos e serviços de transporte
                são disponibilizados por operadores e parceiros independentes.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="space-y-4 rounded-3xl border border-amber-400/20 bg-zinc-950/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#F5C451]">Mobilidade & Logística</p>
                    <p className="mt-1 text-[10px] text-zinc-500">Soluções ligadas numa única plataforma</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-zinc-400">SVG · Leve</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="EXECUTIVE_SUV" className="mx-auto h-12 w-28" active />
                    <p className="mt-2 text-center text-xs font-bold text-white">Executivo</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="WATER_TANKER" className="mx-auto h-12 w-28" active />
                    <p className="mt-2 text-center text-xs font-bold text-white">Cisterna</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="LIGHT_TRUCK" className="mx-auto h-12 w-28" active />
                    <p className="mt-2 text-center text-xs font-bold text-white">Dyna / Canter</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
                    <MarkaVehicleIllustration category="TIPPER_TRUCK" className="mx-auto h-12 w-28" active />
                    <p className="mt-2 text-center text-xs font-bold text-white">Basculante</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3">
                  <span className="text-[10px] font-medium text-zinc-300">Uma plataforma. Várias possibilidades.</span>
                  <span className="text-[10px] font-bold tracking-wider text-[#F5C451]">MARKA AO</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="pillars-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5C451]">O ecossistema MARKA</p>
              <h2 id="pillars-title" className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Cinco pilares. Uma experiência integrada.
              </h2>
            </div>
            <p className="max-w-sm text-xs leading-6 text-zinc-400">
              Da descoberta à mobilidade, do comércio à logística, tudo começa num só lugar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.number} className="group rounded-3xl border border-white/10 bg-zinc-950/75 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-400/35 hover:bg-zinc-900/90">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.22em] text-[#F5C451]">{pillar.number}</span>
                  <span className="h-px w-12 bg-gradient-to-r from-amber-400/60 to-transparent" />
                </div>
                <p className="mt-7 text-[9px] font-semibold tracking-[0.2em] text-zinc-500">{pillar.eyebrow}</p>
                <h3 className="mt-2 text-lg font-bold text-white">{pillar.title}</h3>
                <p className="mt-3 min-h-[72px] text-xs leading-6 text-zinc-400 sm:text-sm">{pillar.description}</p>
                <Link href={pillar.href} className="mt-6 inline-flex items-center gap-3 text-xs font-semibold text-[#E8C77F] transition-all group-hover:gap-5">
                  {pillar.action}<span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="mission-title" className="border-y border-white/[0.08] bg-[#0B0B0E]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5C451]">A nossa missão</p>
              <h2 id="mission-title" className="mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                Mais oportunidades.
                <span className="block text-[#D8BD83]">Menos distância.</span>
              </h2>
            </div>
            <div className="max-w-3xl">
              <p className="text-sm leading-8 text-zinc-300/70 sm:text-base">
                Encontrar o que precisa, chegar a novos clientes ou organizar uma deslocação
                ainda pode significar procurar em vários lugares. A MARKA AO aproxima estas
                experiências numa única plataforma digital, dando visibilidade aos negócios
                e tornando o acesso a produtos, serviços e mobilidade mais simples.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="border-l border-[#D8BD83]/60 pl-5">
                  <h3 className="text-sm font-semibold text-white">Para pessoas</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">Descobrir produtos, encontrar serviços e aceder a opções de mobilidade.</p>
                </div>
                <div className="border-l border-[#D8BD83]/60 pl-5">
                  <h3 className="text-sm font-semibold text-white">Para negócios</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">Apresentar lojas, divulgar produtos e aproximar-se de novos clientes.</p>
                </div>
                <div className="border-l border-[#D8BD83]/60 pl-5">
                  <h3 className="text-sm font-semibold text-white">Para prestadores</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">Dar visibilidade aos serviços e encontrar novas oportunidades de trabalho.</p>
                </div>
                <div className="border-l border-[#D8BD83]/60 pl-5">
                  <h3 className="text-sm font-semibold text-white">Para operadores</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">Ligar motoristas e proprietários de veículos a pedidos de transporte.</p>
                </div>
              </div>
              <p className="mt-8 border-t border-white/10 pt-6 text-xs leading-6 text-zinc-500">
                Desenvolvida em Angola, com uma visão de longo prazo para criar soluções digitais
                relevantes em África e noutros mercados.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="partners-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5C451]">Magestade Pura Digital · Portfólio tecnológico</p>
              <h2 id="partners-title" className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Tecnologia com visão de longo prazo.
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                A MARKA integra o portfólio da Magestade Pura Digital, ao lado da ZION.
                São plataformas com missões próprias, desenvolvidas sob padrões comuns
                de engenharia, segurança e evolução tecnológica.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-36 rounded-2xl border border-amber-400/30 bg-[#070709] px-5 py-4">
                <p className="text-sm font-extrabold tracking-wider text-white">MARKA<span className="text-[#F5C451]">.</span></p>
                <p className="mt-1 text-[10px] text-zinc-500">Comércio · Mobilidade · Carga</p>
              </div>
              <div className="min-w-36 rounded-2xl border border-white/10 bg-[#070709] px-5 py-4">
                <p className="text-sm font-extrabold tracking-wider text-[#F5C451]">ZION</p>
                <p className="mt-1 text-[10px] text-zinc-500">Plataforma irmã</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="partnership-cta-title" className="border-y border-white/[0.08] bg-[#10100F]">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5C451]">Crescemos através de boas ligações</p>
              <h2 id="partnership-cta-title" className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Vamos criar novas oportunidades juntos?
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Procuramos comerciantes, prestadores de serviços, operadores de mobilidade
                e organizações interessadas em construir relações comerciais e parcerias.
              </p>
            </div>
            <Link href="/advertise" className="inline-flex min-h-12 w-fit shrink-0 items-center justify-center rounded-full bg-[#D8BD83] px-7 text-xs font-bold text-[#17130C] transition hover:bg-[#EAD5A6]">
              Explorar parcerias <span aria-hidden="true" className="ml-3">→</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="ai-title" className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#F5C451]">Inteligência integrada</p>
            <h2 id="ai-title" className="mt-2 text-xl font-bold tracking-tight text-white">Precisa de orientação?</h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-zinc-400">A MARKA AI ajuda a encontrar o caminho dentro da plataforma.</p>
          </div>
          <Link href="/app/assistant" className="inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-white/20 px-6 text-xs font-semibold text-white transition hover:border-[#D8BD83] hover:text-[#EAD5A6]">
            Conhecer MARKA AI <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050507]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <div>
            <p className="font-semibold tracking-[0.12em] text-zinc-300">MARKA AO</p>
            <p className="mt-1">Powered By Magestade Pura Digital · <a href="https://markaao.com" className="transition hover:text-zinc-300">markaao.com</a></p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/marketplace" className="transition hover:text-zinc-300">Marketplace</Link>
            <Link href="/mobilidade" className="transition hover:text-zinc-300">Mobilidade</Link>
            <Link href="/legal/privacy" className="transition hover:text-zinc-300">Privacidade</Link>
            <Link href="/legal/mobility-driver" className="transition hover:text-zinc-300">Motoristas & Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
