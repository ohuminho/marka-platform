import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MARKA — Descubra mais. Num só lugar.",
  description:
    "Explore o Marketplace e a Mobility da MARKA. Comércio, serviços, negócios e mobilidade numa experiência simples.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MARKA — Descubra mais. Num só lugar.",
    description:
      "Comércio, serviços, negócios e mobilidade numa experiência simples.",
    url: "https://markaao.com",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MARKA — Descubra mais. Num só lugar.",
    description:
      "Comércio, serviços, negócios e mobilidade numa experiência simples.",
  },
};

const destinations = [
  {
    eyebrow: "COMÉRCIO · SERVIÇOS · NEGÓCIOS",
    title: "Marketplace",
    description:
      "Descubra produtos, lojas, serviços, imóveis e oportunidades de negócio.",
    href: "/app/marketplace",
    action: "Explorar Marketplace",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1500&q=85",
    imageAlt: "Espaço comercial contemporâneo",
  },
  {
    eyebrow: "TÁXI · MOTO-TÁXI · TRANSPORTE",
    title: "Mobility",
    description:
      "Peça uma viagem, organize um transporte ou encontre assistência na estrada.",
    href: "/app/mobility",
    action: "Abrir Mobility",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1500&q=85",
    imageAlt: "Automóvel premium numa estrada",
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
        "Plataforma digital de comércio, serviços, negócios e mobilidade.",
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

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090909] text-[#f5f1e8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData),
        }}
      />

      <header className="relative z-20 border-b border-white/[0.08] bg-[#090909]/85 backdrop-blur-xl">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"
        >
          <Link href="/" aria-label="MARKA — início" className="flex items-center gap-3">
            <span className="text-[34px] font-semibold leading-none tracking-[-0.12em] text-[#d8bd83]">
              M.
            </span>
            <span className="text-[17px] font-semibold tracking-[0.19em] text-white">
              MARKA
            </span>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            <Link
              href="/app/marketplace"
              className="text-[13px] text-white/70 transition hover:text-white"
            >
              Marketplace
            </Link>
            <Link
              href="/app/mobility"
              className="text-[13px] text-white/70 transition hover:text-white"
            >
              Mobility
            </Link>
            <Link
              href="/app/assistant"
              className="text-[13px] text-white/70 transition hover:text-white"
            >
              MARKA AI
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden px-3 py-2 text-[13px] text-white/75 transition hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#d8bd83] px-5 text-[12px] font-semibold text-[#17130c] transition hover:bg-[#ead5a6]"
            >
              Criar conta
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section
          aria-labelledby="hero-title"
          className="relative isolate flex min-h-[620px] items-center overflow-hidden sm:min-h-[690px]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=85')",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(9,9,9,.96)_0%,rgba(9,9,9,.78)_48%,rgba(9,9,9,.34)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t from-[#090909] via-transparent to-[#090909]/25"
          />

          <div className="mx-auto w-full max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12">
            <div className="max-w-[780px]">
              <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-[#d8bd83] sm:text-[11px]">
                A plataforma que aproxima possibilidades
              </p>
              <h1
                id="hero-title"
                className="mt-7 max-w-[760px] text-balance text-[clamp(3.4rem,8vw,7rem)] font-medium leading-[0.98] tracking-[-0.075em] text-white"
              >
                Descubra mais.
                <span className="mt-1 block font-normal text-[#d8bd83]">
                  Num só lugar.
                </span>
              </h1>
              <p className="mt-7 max-w-[510px] text-[15px] leading-7 text-white/70 sm:text-[17px] sm:leading-8">
                Do que procura ao que precisa. Explore comércio, serviços,
                negócios e mobilidade numa experiência simples.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/marketplace"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d8bd83] px-7 text-[13px] font-semibold text-[#17130c] transition hover:bg-[#ead5a6]"
                >
                  Explorar MARKA <span aria-hidden="true" className="ml-3">→</span>
                </Link>
                <Link
                  href="/app/mobility"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-black/15 px-7 text-[13px] font-medium text-white transition hover:border-[#d8bd83] hover:text-[#ead5a6]"
                >
                  Conhecer Mobility
                </Link>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d8bd83]/50 to-transparent" />
        </section>

        <section
          aria-labelledby="destinations-title"
          className="mx-auto max-w-[1440px] px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:px-12 lg:pt-24"
        >
          <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#bda575]">
                Explore
              </p>
              <h2
                id="destinations-title"
                className="mt-3 text-[32px] font-medium tracking-[-0.055em] text-white sm:text-[42px]"
              >
                Um ponto de partida.
              </h2>
            </div>
            <p className="max-w-[360px] text-[13px] leading-6 text-white/50">
              Escolha por onde quer começar. O resto fica simples.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {destinations.map((destination) => (
              <article
                key={destination.title}
                className="group relative isolate flex min-h-[390px] overflow-hidden rounded-[22px] border border-white/[0.11] bg-[#151515] sm:min-h-[440px]"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-20 bg-cover bg-center transition duration-700 group-hover:scale-[1.035]"
                  style={{ backgroundImage: `url('${destination.image}')` }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,7,7,.9)_0%,rgba(7,7,7,.64)_58%,rgba(7,7,7,.2)_100%)]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-transparent to-black/10"
                />
                <div className="flex w-full flex-col justify-end p-7 sm:p-10">
                  <p className="text-[9px] font-medium tracking-[0.24em] text-[#e0c995] sm:text-[10px]">
                    {destination.eyebrow}
                  </p>
                  <h3 className="mt-4 text-[34px] font-medium tracking-[-0.055em] text-white sm:text-[42px]">
                    {destination.title}
                  </h3>
                  <p className="mt-3 max-w-[390px] text-[13px] leading-6 text-white/70 sm:text-[14px]">
                    {destination.description}
                  </p>
                  <Link
                    href={destination.href}
                    className="mt-7 inline-flex min-h-11 w-fit items-center gap-4 border-b border-[#d8bd83]/70 pb-1 text-[12px] font-medium text-[#ead5a6] transition hover:gap-6"
                  >
                    {destination.action}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-white/[0.025]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#bda575]">
                Inteligência integrada
              </p>
              <h2 className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-white">
                Precisa de orientação?
              </h2>
              <p className="mt-2 max-w-[520px] text-[13px] leading-6 text-white/55">
                A MARKA AI ajuda-o a encontrar o caminho dentro da plataforma.
              </p>
            </div>
            <Link
              href="/app/assistant"
              className="inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-white/20 px-6 text-[12px] font-medium text-white transition hover:border-[#d8bd83] hover:text-[#ead5a6]"
            >
              Conhecer MARKA AI <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#090909]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link href="/" className="text-[15px] font-semibold tracking-[0.19em] text-[#d8bd83]">
            MARKA
          </Link>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-[11px] text-white/50">
            <Link href="/app/marketplace" className="transition hover:text-white">Marketplace</Link>
            <Link href="/app/mobility" className="transition hover:text-white">Mobility</Link>
            <Link href="/advertise" className="transition hover:text-white">Parcerias</Link>
            <a href="mailto:info@markaao.com" className="transition hover:text-white">Contacto</a>
          </div>
          <p className="text-[10px] tracking-[0.04em] text-white/35">
            Powered By Magestade Pura Digital
          </p>
        </div>
      </footer>
    </div>
  );
}
