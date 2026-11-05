import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace em Angola: produtos, lojas e serviços",
  description: "Descubra lojas, produtos, serviços e oportunidades de diferentes setores no Marketplace MARKA. Explore ofertas ou comece a vender.",
  alternates: { canonical: "/marketplace" },
  openGraph: {
    title: "Marketplace em Angola | MARKA",
    description: "Explore produtos, lojas e serviços de vários setores numa única plataforma.",
    url: "https://markaao.com/marketplace",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
};

const categories = [
  ["Tecnologia e eletrónica", "Telemóveis, computadores, acessórios e equipamentos."],
  ["Casa, construção e decoração", "Materiais, mobiliário, iluminação e soluções para obras."],
  ["Agricultura e indústria", "Equipamentos, ferramentas, consumíveis e fornecimentos."],
  ["Moda e comércio", "Vestuário, calçado, bebidas e produtos de consumo."],
  ["Imóveis e espaços", "Casas, espaços comerciais, armazéns e salas."],
  ["Serviços profissionais", "Profissionais, eventos, assistência e serviços especializados."],
];

export default function MarketplaceLandingPage() {
  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#f2d18e]">MARKA</Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="rounded-full border border-white/20 px-4 py-2 text-sm">Entrar</Link>
            <Link href="/app/marketplace" className="rounded-full bg-[#e4b963] px-4 py-2 text-sm font-bold text-[#17120a]">Explorar ofertas</Link>
          </div>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-[#e4b963]">Marketplace MARKA</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Produtos, lojas e serviços. Descubra novas oportunidades em Angola.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Explore diferentes setores, compare ofertas e encontre vendedores num único espaço digital. Se tem um negócio, também pode abrir a sua loja e apresentar os seus produtos.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/app/marketplace" className="rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-7 py-4 text-sm font-bold text-[#17120a]">Encontrar produtos e serviços →</Link>
          <Link href="/vender" className="rounded-full border border-white/25 px-7 py-4 text-sm font-semibold">Quero vender na MARKA</Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl font-bold sm:text-3xl">Explore por setor</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Uma plataforma preparada para aproximar compradores e vendedores de diferentes áreas da economia.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([name, description]) => (
            <article key={name} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
              <h3 className="font-semibold text-[#f2d18e]">{name}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{description}</p>
              <Link href="/app/marketplace" className="mt-5 inline-flex text-sm font-semibold text-white underline decoration-[#d9a947] underline-offset-4">Ver Marketplace</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl border border-[#d9a947]/30 bg-[#17130d] p-8 sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Tem produtos ou serviços para oferecer?</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Crie a sua loja, organize o catálogo e apresente as suas ofertas. A verificação MARKA é um percurso separado para reforçar a confiança dos compradores.</p>
          <Link href="/vender" className="mt-7 inline-flex rounded-full bg-[#e4b963] px-6 py-3.5 text-sm font-bold text-[#17120a]">Começar a vender →</Link>
        </div>
      </section>
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/45">MARKA · Powered By Magestade Pura Digital</footer>
    </main>
  );
}
