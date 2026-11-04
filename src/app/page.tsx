import Link from "next/link";
import type { Metadata } from "next";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import MarkaHero from "@/frontend/features/landing/components/MarkaHero";
import ProductGrid from "@/frontend/features/marketplace/components/ProductGrid";

export const metadata: Metadata = {
  title: "Comércio, mobilidade e oportunidades numa só plataforma",
  description:
    "Descubra a MARKA: marketplace multi-indústria, mobilidade, serviços e oportunidades para pessoas e empresas em Angola.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MARKA — A nova economia digital",
    description:
      "Comércio, mobilidade, serviços e oportunidades reunidos numa única plataforma.",
    url: "https://markaao.com",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MARKA — A nova economia digital",
    description:
      "Comércio, mobilidade, serviços e oportunidades reunidos numa única plataforma.",
  },
};

const pathways = [
  {
    number: "01",
    eyebrow: "PARA COMPRADORES",
    title: "Descubra o que precisa.",
    description:
      "Explore produtos, lojas, serviços e oportunidades de diferentes sectores num único espaço digital.",
    action: "Explorar Marketplace",
    href: "/app/marketplace",
  },
  {
    number: "02",
    eyebrow: "PARA VENDEDORES",
    title: "Leve o seu negócio mais longe.",
    description:
      "Apresente os seus produtos ou serviços e comece a construir a presença digital do seu negócio.",
    action: "Começar a vender",
    href: "/app/vendor/products",
  },
  {
    number: "03",
    eyebrow: "PARA MOBILIDADE",
    title: "Faça parte do movimento.",
    description:
      "Aceda à área MARKA para mobilidade, transporte e serviços associados. A adesão profissional está sujeita a validação.",
    action: "Conhecer a MARKA",
    href: "/app/mobility",
  },
  {
    number: "04",
    eyebrow: "PARA MARCAS E EMPRESAS",
    title: "Aproxime-se dos seus clientes.",
    description:
      "Conheça as oportunidades de presença comercial e publicidade no ecossistema MARKA.",
    action: "Explorar publicidade",
    href: "/advertise",
  },
];

const pillars = [
  ["COMÉRCIO", "Marketplace multi-indústria para produtos, lojas e serviços."],
  ["MOBILIDADE", "Mobilidade urbana, transporte de carga e assistência."],
  ["SERVIÇOS", "Profissionais, empresas e soluções para necessidades reais."],
  ["OPORTUNIDADES", "Um ponto de encontro entre pessoas, negócios e marcas."],
];

export default function Home() {
  return (
    <DynamicBackground>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-background)]/85 backdrop-blur-2xl">
          <nav aria-label="Navegação principal" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" aria-label="MARKA início" className="text-xl font-semibold tracking-[-0.08em] text-[var(--theme-text)]">MARKA<span className="ml-1 text-[var(--theme-accent)]">.</span></Link>
            <div className="hidden items-center gap-7 md:flex">
              <Link href="/app/marketplace" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Marketplace</Link>
              <Link href="/app" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Mobilidade e serviços</Link>
              <Link href="/advertise" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Para empresas</Link>
              <a href="mailto:info@markaao.com" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Contacto</a>
            </div>
            <Link href="/app" className="inline-flex h-10 items-center rounded-full bg-[var(--theme-text)] px-5 text-xs font-semibold text-[var(--theme-background)] transition hover:opacity-85">Entrar na MARKA</Link>
          </nav>
        </header>

        <MarkaHero />

        <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <section aria-labelledby="pathways-title" className="py-12 sm:py-16">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">Encontre o seu lugar</p>
                <h2 id="pathways-title" className="marka-editorial mt-3 text-3xl sm:text-5xl">Uma plataforma. Muitas possibilidades.</h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[var(--theme-text-muted)]">Quer esteja a comprar, a vender, a trabalhar ou a fazer crescer uma marca, comece pelo caminho certo.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pathways.map((item) => (
                <article key={item.number} className="group flex min-h-64 flex-col rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-background)]/65 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[var(--theme-accent)]/40 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[0.2em] text-[var(--theme-text-faint)]">{item.number}</span>
                    <span className="text-[9px] font-semibold tracking-[0.2em] text-[var(--theme-text-muted)]">{item.eyebrow}</span>
                  </div>
                  <h3 className="marka-editorial mt-8 text-2xl sm:text-3xl">{item.title}</h3>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--theme-text-muted)]">{item.description}</p>
                  <Link href={item.href} className="mt-auto inline-flex w-fit items-center gap-2 pt-7 text-xs font-semibold text-[var(--theme-text)] transition group-hover:gap-3">{item.action}<span aria-hidden="true">→</span></Link>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="Áreas da MARKA" className="grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-border)] sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map(([title, description]) => (
              <div key={title} className="bg-[var(--theme-background)]/90 p-6 sm:p-7">
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--theme-text-faint)]">{title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">{description}</p>
              </div>
            ))}
          </section>

          <section aria-label="Descobrir produtos e serviços" className="mt-16 rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-background)]/70 p-4 backdrop-blur-xl sm:p-8">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--theme-text-faint)]">Descobrir</p>
                <h2 className="marka-editorial mt-2 text-3xl sm:text-4xl">Explore o Marketplace.</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--theme-text-muted)]">Veja os produtos e serviços disponíveis. A oferta apresentada depende das publicações reais dos vendedores.</p>
              </div>
              <Link href="/app/marketplace" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--theme-border)] px-5 text-xs font-semibold transition hover:border-[var(--theme-text)]">Ver Marketplace completo →</Link>
            </div>
            <ProductGrid />
          </section>

          <section className="mt-16 overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-7 sm:p-10 lg:p-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">Parcerias e crescimento</p>
                <h2 className="marka-editorial mt-4 text-3xl sm:text-5xl">O próximo passo do seu negócio começa aqui.</h2>
                <p className="mt-5 text-sm leading-7 text-[var(--theme-text-muted)]">Se representa uma empresa, uma marca, uma instituição ou um negócio local, fale connosco para conhecer as possibilidades de colaboração com a MARKA.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/advertise" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--theme-text)] px-6 text-xs font-semibold text-[var(--theme-background)] transition hover:opacity-85">Oportunidades comerciais</Link>
                <a href="mailto:info@markaao.com?subject=Parceria%20com%20a%20MARKA" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--theme-border)] px-6 text-xs font-semibold transition hover:border-[var(--theme-text)]">Contactar a equipa</a>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-[var(--theme-border)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-9 text-xs text-[var(--theme-text-faint)] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold tracking-[0.18em] text-[var(--theme-text)]">MARKA</p>
              <p className="mt-2">Comércio, mobilidade e oportunidades.</p>
              <p className="mt-1">Powered By Magestade Pura Digital</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <Link href="/app/marketplace" className="transition hover:text-[var(--theme-text)]">Marketplace</Link>
              <Link href="/advertise" className="transition hover:text-[var(--theme-text)]">Publicidade</Link>
              <a href="https://markaao.com" className="transition hover:text-[var(--theme-text)]">markaao.com</a>
              <a href="mailto:info@markaao.com" className="transition hover:text-[var(--theme-text)]">info@markaao.com</a>
            </div>
          </div>
        </footer>
      </div>
    </DynamicBackground>
  );
}
