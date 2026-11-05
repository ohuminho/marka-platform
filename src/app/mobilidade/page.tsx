import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mobilidade e transporte em Angola",
  description: "Conheça a MARKA Mobility: uma experiência integrada para pedidos de táxi, moto-táxi, transporte de carga e assistência rodoviária, conforme disponibilidade.",
  alternates: { canonical: "/mobilidade" },
  openGraph: {
    title: "MARKA Mobility | Mobilidade e transporte",
    description: "Mobilidade urbana, transporte de carga e assistência numa experiência integrada.",
    url: "https://markaao.com/mobilidade",
    siteName: "MARKA",
    locale: "pt_AO",
    type: "website",
  },
};

const services = [
  ["Táxi", "Consulte as opções de mobilidade disponíveis na plataforma."],
  ["Moto-táxi", "Uma alternativa de deslocação para trajetos adequados."],
  ["Transporte de carga", "Solicite transporte para mercadorias e volumes."],
  ["Assistência rodoviária", "Encontre apoio para situações de avaria e assistência na estrada."],
];

export default function MobilityLandingPage() {
  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#f2d18e]">MARKA</Link>
          <Link href="/auth/login" className="rounded-full border border-white/20 px-4 py-2 text-sm">Entrar</Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-[#e4b963]">MARKA Mobility</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Mobilidade, transporte e assistência num só ecossistema.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Uma experiência integrada na MARKA para ligar passageiros, condutores e prestadores de serviços de transporte, de acordo com a cobertura e disponibilidade operacional.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/app/mobility" className="rounded-full bg-gradient-to-r from-[#f8dfaa] to-[#d9a947] px-7 py-4 text-sm font-bold text-[#17120a]">Abrir MARKA Mobility →</Link>
          <Link href="/legal/mobility-driver" className="rounded-full border border-white/25 px-7 py-4 text-sm font-semibold">Informação para condutores</Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl font-bold sm:text-3xl">Serviços de mobilidade</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
              <h3 className="font-semibold text-[#f2d18e]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl border border-[#d9a947]/30 bg-[#17130d] p-8 sm:p-10">
          <h2 className="text-2xl font-bold">É condutor ou prestador de transporte?</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Consulte os requisitos e o processo de adesão antes de iniciar a atividade na plataforma.</p>
          <Link href="/legal/mobility-driver" className="mt-7 inline-flex rounded-full bg-[#e4b963] px-6 py-3.5 text-sm font-bold text-[#17120a]">Consultar requisitos →</Link>
        </div>
      </section>
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/45">MARKA · Powered By Magestade Pura Digital</footer>
    </main>
  );
}
