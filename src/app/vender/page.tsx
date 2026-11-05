import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vender online em Angola: crie a sua loja",
  description: "Abra uma loja na MARKA, publique produtos ou serviços e alcance potenciais compradores. Comece com um registo simples e solicite verificação quando estiver preparado.",
  alternates: { canonical: "/vender" },
  openGraph: {
    title: "Venda online com a sua loja MARKA",
    description: "Crie a sua loja e apresente produtos e serviços a novos clientes.",
    url: "https://markaao.com/vender",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
};

const steps = [
  ["1. Crie a sua loja", "Registe-se e escolha o tipo de atividade. O percurso deve ser simples para vendedores individuais e empresas."],
  ["2. Publique o catálogo", "Adicione fotografias, descrições, preços e informação de disponibilidade para ajudar o cliente a decidir."],
  ["3. Reforce a confiança", "Solicite a verificação MARKA quando estiver preparado. O selo só é atribuído após análise e aprovação."],
  ["4. Cresça com visibilidade", "Acompanhe o desempenho das suas ofertas e candidate um produto elegível a destaque na MARKA."],
];

export default function SellerLandingPage() {
  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#f2d18e]">MARKA</Link>
          <Link href="/auth/login" className="rounded-full border border-white/20 px-4 py-2 text-sm">Entrar</Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-[#e4b963]">Para vendedores e empresas</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">A sua loja online pode começar aqui.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Leve os seus produtos e serviços para um marketplace multi-indústria. Comece por criar a loja e preparar o catálogo; a verificação é um processo distinto, com critérios claros.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/app/vendor/products" className="rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-7 py-4 text-sm font-bold text-[#17120a]">Criar a minha loja →</Link>
          <Link href="/marketplace" className="rounded-full border border-white/25 px-7 py-4 text-sm font-semibold">Conhecer o Marketplace</Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl font-bold sm:text-3xl">Do registo ao crescimento</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {steps.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
              <h3 className="font-semibold text-[#f2d18e]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-8 sm:p-10">
          <h2 className="text-2xl font-bold">Uma loja simples de abrir. Uma reputação construída com confiança.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">A MARKA deve permitir que vendedores individuais participem sem exigir uma estrutura empresarial desnecessária. A documentação adicional será solicitada de forma proporcional ao tipo de vendedor, atividade e risco da oferta.</p>
          <Link href="/app/vendor/products" className="mt-7 inline-flex rounded-full bg-[#e4b963] px-6 py-3.5 text-sm font-bold text-[#17120a]">Abrir loja na MARKA →</Link>
        </div>
      </section>
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/45">MARKA · Powered By Magestade Pura Digital</footer>
    </main>
  );
}
