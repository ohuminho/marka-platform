import Link from "next/link";
import type { Metadata } from "next";
import ProductGrid from "@/frontend/features/marketplace/components/ProductGrid";

export const metadata: Metadata = {
  title: "MARKA — Conecta Angola com o Mundo",
  description:
    "Compre, venda, viaje, encontre imóveis e descubra oportunidades. Tudo num só lugar, com a experiência MARKA.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MARKA — Conecta Angola com o Mundo",
    description:
      "Marketplace, mobilidade, imobiliário e serviços numa única plataforma.",
    url: "https://markaao.com",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MARKA — Conecta Angola com o Mundo",
    description:
      "Marketplace, mobilidade, imobiliário e serviços numa única plataforma.",
  },
};

const areas = [
  {
    title: "Marketplace",
    description: "Compre e venda em múltiplas categorias.",
    detail: ["Lojas e Empresas", "Produtos e Serviços", "Indústria e muito mais"],
    action: "Explorar Marketplace",
    href: "/app/marketplace",
    image:
      "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1400&q=85",
    position: "center",
  },
  {
    title: "Mobility",
    description: "Viaje, transporte e mobilidade inteligente.",
    detail: ["Táxi e Moto-Táxi", "Transporte de Carga", "Assistência Rodoviária"],
    action: "Conhecer Mobility",
    href: "/app/mobility",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=85",
    position: "center",
  },
  {
    title: "Imobiliário & Mais",
    description: "Encontre espaços, imóveis e grandes oportunidades.",
    detail: ["Casas e Apartamentos", "Espaços Comerciais", "Salas e Eventos"],
    action: "Explorar Imóveis",
    href: "/app/marketplace",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85",
    position: "center",
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
        "Plataforma digital de comércio, mobilidade, imobiliário, serviços e oportunidades.",
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

function Arrow() {
  return <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>;
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#08090c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
      />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090c]/90 backdrop-blur-2xl">
        <nav aria-label="Navegação principal" className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="MARKA início" className="flex shrink-0 items-center gap-3">
            <span className="bg-gradient-to-br from-[#fff0c2] via-[#e7b94f] to-[#9d6c20] bg-clip-text text-4xl font-black leading-none tracking-[-0.12em] text-transparent">M</span>
            <span className="leading-tight">
              <span className="block text-[22px] font-bold tracking-[-0.06em] text-[#f6d68c]">MARKA</span>
              <span className="block text-[9px] tracking-[0.13em] text-white/55">TUDO NUM SÓ LUGAR</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <Link href="/" className="text-sm font-medium text-[#f1c66e]">Início</Link>
            <a href="#sobre" className="text-sm text-white/75 transition hover:text-white">Sobre</a>
            <a href="#areas" className="text-sm text-white/75 transition hover:text-white">Categorias</a>
            <Link href="/vender" className="text-sm text-white/75 transition hover:text-white">Vender</Link>
            <Link href="/mobilidade" className="text-sm text-white/75 transition hover:text-white">Mobilidade</Link>
            <a href="#inteligencia" className="text-sm text-white/75 transition hover:text-white">MARKA AI</a>
            <a href="#servicos" className="text-sm text-white/75 transition hover:text-white">Serviços</a>
            <a href="#contactos" className="text-sm text-white/75 transition hover:text-white">Contactos</a>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/auth/login" className="hidden h-11 items-center rounded-full border border-[#d8ad5d]/70 px-5 text-sm font-semibold text-[#f4d38e] transition hover:bg-[#d8ad5d]/10 sm:inline-flex">Entrar</Link>
            <Link href="/auth/login" className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-5 text-sm font-bold text-[#17120a] shadow-[0_8px_30px_rgba(220,174,83,.2)] transition hover:brightness-110">Criar Conta <span aria-hidden="true">→</span></Link>
          </div>
        </nav>
      </header>

      <main>
        <section id="sobre" aria-labelledby="hero-title" className="relative isolate min-h-[650px] overflow-hidden border-b border-[#d7ac5d]/20 sm:min-h-[700px]">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=90')" }}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#08090c_0%,rgba(8,9,12,.96)_27%,rgba(8,9,12,.72)_52%,rgba(8,9,12,.12)_100%)]" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#08090c] via-transparent to-[#08090c]/25" />

          <div className="mx-auto grid min-h-[650px] max-w-[1600px] items-center gap-10 px-5 py-16 sm:min-h-[700px] sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:px-12 lg:py-20">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e5bc69]/55 bg-black/35 px-4 py-2 text-xs font-medium text-[#f2d18e] backdrop-blur-md">
                <span className="text-[#e9b84f]">✦</span> Plataforma Premium
              </span>
              <p className="mt-8 text-[clamp(3.6rem,8vw,7.4rem)] font-black leading-[.84] tracking-[-.075em] text-white">MARKA</p>
              <h1 id="hero-title" className="mt-4 max-w-3xl text-balance text-[clamp(2.5rem,5.6vw,5.2rem)] font-extrabold leading-[.98] tracking-[-.055em]">
                <span className="bg-gradient-to-r from-[#f8e4b7] via-[#e8b74d] to-[#c68a2c] bg-clip-text text-transparent">Conecta Angola</span>
                <span className="block text-white">com o Mundo.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
                Compre, venda, mobilidade, negócios e muito mais — de forma simples, segura e inteligente.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/app/marketplace" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ffe6b1] to-[#dca944] px-8 text-sm font-bold text-[#181208] shadow-[0_12px_38px_rgba(221,174,79,.25)] transition hover:-translate-y-0.5 hover:brightness-110">Explorar Agora <span aria-hidden="true">→</span></Link>
                <a href="#areas" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/30 bg-black/25 px-8 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#e7bd6c] hover:text-[#f5d99f]"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#e7bd6c] text-xs text-[#f5d99f]">↓</span> Descobrir a MARKA</a>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[11px] font-medium text-white/65">
                <span className="flex items-center gap-2"><span className="text-[#e9bb5d]">◆</span> Seguro e Confiável</span>
                <span className="flex items-center gap-2"><span className="text-[#e9bb5d]">✦</span> Rápido e Eficiente</span>
                <span className="flex items-center gap-2"><span className="text-[#e9bb5d]">◇</span> Experiência Premium</span>
              </div>
            </div>

            <div className="relative block h-[300px] sm:h-[400px] lg:h-[520px]">
              <div aria-hidden="true" className="absolute right-4 top-1/2 h-[480px] w-[390px] -translate-y-1/2 rounded-[48%] bg-[#d7a64d]/15 blur-[90px]" />
              <div
                role="img"
                aria-label="Profissional a utilizar a MARKA num ambiente urbano moderno"
                className="absolute inset-x-0 bottom-0 mx-auto h-[290px] w-full bg-contain bg-bottom bg-no-repeat drop-shadow-[0_25px_55px_rgba(0,0,0,.45)] sm:h-[390px] lg:right-0 lg:mx-0 lg:h-[510px] lg:w-[min(100%,520px)] lg:inset-x-auto"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1100&q=90')" }}
              />
              <div className="absolute bottom-4 left-2 rounded-2xl sm:bottom-8 lg:bottom-12 border border-white/15 bg-black/45 px-5 py-4 shadow-2xl backdrop-blur-xl">
                <p className="text-[9px] uppercase tracking-[.24em] text-[#e8bd6a]">Um só ecossistema</p>
                <p className="mt-1 text-sm font-semibold text-white">Tudo o que precisa. Num só lugar.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="areas" aria-labelledby="areas-title" className="relative mx-auto max-w-[1600px] px-5 pb-20 pt-14 sm:px-8 lg:px-12 lg:pt-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#d7ad62]">Explore o ecossistema</p>
              <h2 id="areas-title" className="mt-3 text-3xl font-bold tracking-[-.04em] text-white sm:text-4xl">Um universo de possibilidades.</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-white/55">Soluções para o dia a dia, para os negócios e para quem procura novas oportunidades.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {areas.map((area) => (
              <article key={area.title} className="group relative isolate flex min-h-[360px] overflow-hidden rounded-[25px] border border-[#d4a94f]/45 bg-[#171717] shadow-[0_20px_65px_rgba(0,0,0,.28)] transition duration-500 hover:-translate-y-1 hover:border-[#f1cc7c]/80">
                <div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${area.image}')`, backgroundPosition: area.position }} />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,6,.92)_0%,rgba(5,5,6,.68)_48%,rgba(5,5,6,.18)_100%)]" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
                <div className="flex w-full flex-col p-6 sm:p-7">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-[#e8bd6a]/60 bg-black/35 text-2xl text-[#f0c66e] backdrop-blur-md">{area.title === "Marketplace" ? "▣" : area.title === "Mobility" ? "⌁" : "⌂"}</span>
                  <div className="mt-auto max-w-[88%]">
                    <h3 className="text-2xl font-bold tracking-[-.035em] text-white sm:text-[28px]">{area.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/85">{area.description}</p>
                    <ul className="mt-4 space-y-1.5">
                      {area.detail.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-white/85"><span className="text-[#efbf5e]">✓</span>{item}</li>)}
                    </ul>
                    <Link href={area.href} className="group/link mt-6 inline-flex min-h-11 items-center gap-3 rounded-full border border-[#e8bd6a]/80 bg-black/30 px-5 text-xs font-semibold text-[#f4d38e] backdrop-blur-md transition hover:bg-[#e8bd6a] hover:text-[#17120a]">{area.action}<span aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="inteligencia" aria-labelledby="ai-title" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="relative isolate overflow-hidden rounded-[28px] border border-[#d7ad62]/40 bg-[linear-gradient(115deg,#211a10_0%,#111216_55%,#17130d_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,.25)] sm:p-9 lg:p-12">
            <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full bg-[#d8a84d]/15 blur-3xl" />
            <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#e3b968]">Inteligência artificial integrada</p>
                <h2 id="ai-title" className="mt-4 text-3xl font-bold leading-tight tracking-[-.045em] text-white sm:text-4xl lg:text-5xl">MARKA AI. Inteligência ao serviço de cada pessoa e negócio.</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  Um assistente inteligente para esclarecer dúvidas, ajudar a compreender o ecossistema MARKA, organizar ideias e orientar tarefas — numa experiência que acompanha o idioma do utilizador.
                </p>
                <Link href="/app/assistant" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-7 text-xs font-bold text-[#17120a] shadow-[0_10px_32px_rgba(220,174,83,.2)] transition hover:-translate-y-0.5 hover:brightness-110">
                  Experimentar MARKA AI <span aria-hidden="true">→</span>
                </Link>
                <p className="mt-3 text-[10px] text-white/40">O assistente requer sessão iniciada na MARKA.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  ["01", "Orientação inteligente", "Ajuda a encontrar o caminho certo dentro da plataforma."],
                  ["02", "Apoio a negócios", "Ajuda a estruturar ideias e compreender oportunidades."],
                  ["03", "Comunicação flexível", "Acompanha a língua em que o utilizador comunica."],
                ].map(([number, title, description]) => (
                  <div key={number} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <span className="pt-0.5 text-xs font-semibold text-[#e4b963]">{number}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{title}</h3>
                        <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="servicos" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="grid gap-4 rounded-[26px] border border-white/10 bg-white/[.035] p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {[
              ["COMÉRCIO", "Marketplace multi-indústria para produtos, lojas e serviços."],
              ["MOBILIDADE", "Mobilidade urbana, transporte de carga e assistência."],
              ["SERVIÇOS", "Profissionais, empresas e soluções para necessidades reais."],
              ["OPORTUNIDADES", "Um ponto de encontro entre pessoas, negócios e marcas."],
            ].map(([title, description]) => (
              <div key={title} className="border-b border-white/10 pb-4 last:border-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5 lg:last:border-0">
                <p className="text-[9px] font-bold uppercase tracking-[.25em] text-[#d9b46d]">{title}</p>
                <p className="mt-3 text-sm leading-6 text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="rounded-[26px] border border-white/10 bg-white/[.035] p-5 sm:p-8">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[.28em] text-[#d7ad62]">Descobrir</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-.04em] text-white sm:text-4xl">Explore o Marketplace.</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">Descubra produtos e serviços publicados por vendedores e empresas na MARKA.</p>
              </div>
              <Link href="/app/marketplace" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8ad5d]/60 px-5 text-xs font-semibold text-[#f2d18e] transition hover:bg-[#d8ad5d]/10">Ver Marketplace completo →</Link>
            </div>
            <ProductGrid />
          </div>
        </section>

        <section id="contactos" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="relative overflow-hidden rounded-[28px] border border-[#d5aa5c]/35 bg-[linear-gradient(120deg,#1b1711,#111216_58%,#20180d)] p-7 sm:p-10 lg:p-14">
            <div aria-hidden="true" className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#d8a84d]/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-[10px] uppercase tracking-[.3em] text-[#e0b866]">Parcerias e crescimento</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-.04em] text-white sm:text-5xl">O próximo passo do seu negócio começa aqui.</h2>
                <p className="mt-5 text-sm leading-7 text-white/60">Se representa uma empresa, uma marca, uma instituição ou um negócio local, fale connosco para conhecer as possibilidades de colaboração com a MARKA.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/advertise" className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-6 text-xs font-bold text-[#17120a] transition hover:brightness-110">Oportunidades comerciais</Link>
                <a href="mailto:info@markaao.com?subject=Parceria%20com%20a%20MARKA" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 text-xs font-semibold text-white transition hover:border-[#e8bd6a]">Contactar a equipa</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/35">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-9 text-xs text-white/45 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div>
            <p className="text-xl font-bold tracking-[-.06em] text-[#f0cc83]">MARKA</p>
            <p className="mt-2">Comércio, mobilidade e oportunidades.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/app/marketplace" className="transition hover:text-white">Marketplace</Link>
            <Link href="/app/mobility" className="transition hover:text-white">Mobility</Link>
            <Link href="/advertise" className="transition hover:text-white">Publicidade</Link>
            <a href="mailto:info@markaao.com" className="transition hover:text-white">Contacto</a>
          </div>
          <p className="text-[#e3bc70]">Powered By Magestade Pura Digital</p>
        </div>
      </footer>
    </div>
  );
}
