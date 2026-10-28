"use client";

import Link from "next/link";
import MobilityAdSlot from "@/frontend/features/mobility/components/MobilityAdSlot";
import MobilityLiveMap from "@/frontend/features/mobility/components/MobilityLiveMap";

const vehicles = [
  { name: "MARKA Go", detail: "Rápido e confortável", price: "AOA 5.000", seats: "4", time: "2 min", image: "photo-1618843479313-40f8afb4b4d8", popular: true },
  { name: "MARKA Executive", detail: "Luxo em cada detalhe", price: "AOA 8.000", seats: "4", time: "3 min", image: "photo-1563720223185-11003d516935" },
  { name: "MARKA Business", detail: "Para grupos e empresas", price: "AOA 12.000", seats: "7", time: "4 min", image: "photo-1552519507-da3b142c6e3d" },
  { name: "MARKA Electric", detail: "Sustentável e inovador", price: "AOA 10.000", seats: "4", time: "3 min", image: "photo-1593941707882-a5bba14938c7" },
];

const carPhoto = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`flex items-center gap-2 ${small ? "" : "flex-col"}`}><span className="font-black leading-none text-[#e9bd58]" style={{ fontSize: small ? 26 : 62, letterSpacing: "-.12em" }}>M</span><span className={`font-semibold tracking-[.28em] text-white ${small ? "text-xs" : "text-3xl"}`}>MARKA</span>{!small && <span className="text-[10px] tracking-[.55em] text-[#e9bd58]">M O B I L I T Y</span>}</div>;
}

export default function MobilityExperience() {
  return <section className="space-y-6 text-white">
    <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08090c] px-4 py-3">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e9bd58]/60 bg-[#17140c] text-xl text-[#e9bd58]">☰</div><BrandMark small /></div>
      <button aria-label="Notificações" className="relative rounded-full border border-white/10 p-3 text-lg">♧<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"/></button>
    </header>

    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#e9bd58]/25 bg-[#05070b] shadow-[0_25px_90px_rgba(0,0,0,.45)]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070b]/5 via-[#05070b]/30 to-[#05070b]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(233,189,88,.14),transparent_55%)]" />
      <div className="relative grid items-center gap-2 lg:grid-cols-[.8fr_1.2fr]">
        <div className="z-10 px-6 pb-2 pt-8 sm:px-10 lg:py-12">
          <BrandMark />
          <p className="mt-5 text-center text-lg leading-7 text-white/85 sm:text-xl">Mais do que uma viagem.<br/><span className="text-[#e9bd58]">É uma experiência.</span></p>
          <a href="#ride-request" className="mt-7 flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#f5d47c] to-[#dca83d] px-6 font-bold text-[#17130a] shadow-[0_4px_24px_rgba(233,189,88,.2)]">Pedir uma viagem　›</a>
          <p className="mt-4 text-center text-[10px] tracking-wide text-white/45">MARKA · Mais que uma viagem</p>
        </div>
        <div className="relative min-h-[260px] overflow-hidden sm:min-h-[360px] lg:min-h-[480px]">
          <img src={carPhoto("photo-1618843479313-40f8afb4b4d8")} alt="Automóvel premium preto para a experiência MARKA Mobility" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070b] via-[#05070b]/15 to-transparent lg:bg-gradient-to-r lg:from-[#05070b]/60 lg:via-transparent lg:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#05070b] to-transparent"/>
          <span className="absolute bottom-5 right-5 rounded-full border border-[#e9bd58]/50 bg-black/65 px-4 py-2 text-[10px] uppercase tracking-[.2em] text-[#f3d582]">Mobilidade premium</span>
        </div>
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <div className="rounded-[1.8rem] border border-white/10 bg-[#0a0c11] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.24em] text-[#e9bd58]">A sua viagem</p><h2 className="mt-1 text-xl font-semibold">Para onde vamos?</h2></div><span className="rounded-full border border-white/10 px-3 py-2 text-lg">⌖</span></div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3"><span className="text-xl text-blue-400">●</span><div className="flex-1"><p className="text-[10px] text-white/45">Partida</p><p className="text-sm">Minha localização</p></div><span className="text-xl">⌖</span></div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3"><span className="text-xl text-[#e9bd58]">⚑</span><div className="flex-1"><p className="text-[10px] text-white/45">Destino</p><p className="text-sm">Para onde pretende ir?</p></div><span className="text-xl">＋</span></div>
        </div>
        <a href="#ride-request" className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#f5d47c] to-[#dca83d] font-bold text-[#17130a]">Pedir viagem　›</a>
        <div className="mt-4"><MobilityLiveMap /></div>
      </div>
      <div className="rounded-[1.8rem] border border-white/10 bg-[#0a0c11] p-4 sm:p-6">
        <div className="mb-4"><p className="text-[10px] uppercase tracking-[.24em] text-[#e9bd58]">Escolha um veículo</p><h2 className="mt-1 text-xl font-semibold">Encontre a sua viagem</h2></div>
        <div className="space-y-3">
          {vehicles.map((v) => <a key={v.name} href="#ride-request" className="group relative flex min-h-[105px] overflow-hidden rounded-2xl border border-white/10 bg-[#121419] transition hover:border-[#e9bd58]/70">
            <img src={carPhoto(v.image)} alt={v.name} className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-70"/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#08090c] via-[#08090c]/55 to-transparent"/>
            <div className="relative flex w-full items-end justify-between gap-2 p-3 sm:p-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{v.name}</h3>{v.popular && <span className="rounded-full bg-[#e9bd58] px-2 py-1 text-[8px] font-bold text-black">POPULAR</span>}</div><p className="mt-1 text-xs text-white/70">{v.detail}</p><p className="mt-2 text-[10px] text-white/65">♟ {v.seats} passageiros　◷ {v.time}</p></div><span className="whitespace-nowrap text-sm font-bold text-[#f2cd70]">{v.price}</span></div>
          </a>)}
        </div>
        <Link href="/app/mobility/parceiros" className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-[#e9bd58]/70 text-sm font-semibold text-[#f2cd70]">Ser parceiro MARKA　→</Link>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/app/mobility/parceiros" className="group relative min-h-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] p-5"><img src={carPhoto("photo-1552519507-da3b142c6e3d")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/60 to-transparent"/><div className="relative"><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">MARKA Business</p><h3 className="mt-3 text-xl font-semibold">Mobilidade para empresas</h3><p className="mt-2 text-sm text-white/65">Frotas, equipas e compromissos profissionais.</p></div></Link>
      <Link href="/app/marketplace" className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5 transition hover:border-[#e9bd58]/60"><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">Marketplace</p><h3 className="mt-3 text-xl font-semibold">Descubra e escolha</h3><p className="mt-2 text-sm leading-6 text-white/60">Produtos e serviços num só lugar, com uma experiência simples.</p><span className="mt-5 inline-block text-sm font-semibold text-[#e9bd58]">Explorar　→</span></Link>
      <Link href="/app/mobility/parceiros" className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5 transition hover:border-[#e9bd58]/60"><p className="text-[9px] uppercase tracking-[.2em] text-[#e9bd58]">Para motoristas</p><h3 className="mt-3 text-xl font-semibold">Conduza com a MARKA</h3><p className="mt-2 text-sm leading-6 text-white/60">Conheça o processo de adesão e os requisitos para parceiros.</p><span className="mt-5 inline-block text-sm font-semibold text-[#e9bd58]">Conhecer processo　→</span></Link>
    </div>
    <MobilityAdSlot />
    <p className="px-1 text-[10px] leading-5 text-white/35">A disponibilidade de viagens e tarifas depende do estado operacional real e da disponibilidade dos parceiros.</p>
  </section>;
}
