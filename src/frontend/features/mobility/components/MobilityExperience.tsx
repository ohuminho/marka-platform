"use client";

import Link from "next/link";
import MobilityAdSlot from "@/frontend/features/mobility/components/MobilityAdSlot";

const rideOptions = [
  {
    name: "MARKA Go",
    detail: "Uma opção prática para as viagens do dia a dia",
    badge: "ESSENCIAL",
    icon: "car",
  },
  {
    name: "MARKA Moto",
    detail: "Agilidade para percursos urbanos",
    badge: "ÁGIL",
    icon: "moto",
  },
  {
    name: "MARKA Business",
    detail: "Mobilidade para equipas e compromissos profissionais",
    badge: "EMPRESAS",
    icon: "business",
  },
] as const;

function VehicleIcon({ type }: { type: (typeof rideOptions)[number]["icon"] }) {
  if (type === "business") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9">
        <rect x="7" y="13" width="34" height="25" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M17 13V9h14v4M7 22h34M18 22v16M30 22v16" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (type === "moto") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9">
        <circle cx="12" cy="33" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="37" cy="33" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 33l8-13h8l9 13M20 20l-4-4h-5M28 20l4-4h4M21 28h10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9">
      <path d="M8 28l3-10a4 4 0 0 1 4-3h18a4 4 0 0 1 4 3l3 10v9h-5v-4H13v4H8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 25h22M17 15l2-5h10l2 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="15" cy="28" r="2" fill="currentColor" />
      <circle cx="33" cy="28" r="2" fill="currentColor" />
    </svg>
  );
}

function TaxiIllustration() {
  return (
    <div className="relative mx-auto flex min-h-[270px] w-full max-w-[500px] items-center justify-center sm:min-h-[340px]">
      <div aria-hidden="true" className="absolute h-52 w-52 rounded-full border border-white/10 sm:h-72 sm:w-72" />
      <div aria-hidden="true" className="absolute h-64 w-64 rounded-full border border-white/[0.06] sm:h-[23rem] sm:w-[23rem]" />
      <div aria-hidden="true" className="absolute bottom-8 h-8 w-3/4 rounded-[50%] bg-black/40 blur-xl sm:bottom-12" />
      <div className="absolute right-[12%] top-[14%] rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-white/65 backdrop-blur">
        A cidade move-se consigo
      </div>
      <svg viewBox="0 0 560 330" role="img" aria-label="Ilustração de um automóvel moderno para o serviço de táxi MARKA" className="relative z-10 w-full drop-shadow-[0_28px_30px_rgba(0,0,0,0.35)]">
        <defs>
          <linearGradient id="markaCarBody" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8f8f5" />
            <stop offset="48%" stopColor="#c9cbc7" />
            <stop offset="100%" stopColor="#777d7a" />
          </linearGradient>
          <linearGradient id="markaCarGlass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#52636a" />
            <stop offset="100%" stopColor="#141d22" />
          </linearGradient>
        </defs>
        <ellipse cx="282" cy="270" rx="192" ry="19" fill="#000" opacity=".28" />
        <path d="M102 211l24-51c8-17 25-28 44-31l72-10 58-49c12-10 25-15 41-15h53c21 0 38 10 50 27l38 52 28 15c14 7 22 20 22 36v35c0 12-10 22-22 22H111c-15 0-24-14-19-28z" fill="url(#markaCarBody)" stroke="#f4f4f0" strokeWidth="2" />
        <path d="M177 151l24-32 54-8-3 40zM271 111l42-36c7-6 15-9 24-9h33l29 85H271z" fill="url(#markaCarGlass)" stroke="#7c898d" strokeWidth="2" />
        <path d="M405 68h10c14 0 24 7 34 21l29 43h-57z" fill="url(#markaCarGlass)" stroke="#7c898d" strokeWidth="2" />
        <path d="M271 111l-1 40M397 68l10 64" stroke="#b7c0bf" strokeWidth="3" />
        <path d="M99 204l21-5 12 12-4 15-22 1z" fill="#f5e9c8" />
        <path d="M504 194l23 5v22l-25-2z" fill="#b75e4b" />
        <path d="M159 177h268" stroke="#777e7b" strokeWidth="2" opacity=".65" />
        <rect x="291" y="155" width="100" height="29" rx="7" fill="#1b2225" />
        <text x="341" y="174" textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="3" fill="#f5f5f0">MARKA</text>
        <rect x="300" y="39" width="70" height="22" rx="5" fill="#d8c18c" stroke="#f5e6bf" strokeWidth="1.5" />
        <text x="335" y="54" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="2" fill="#292720">TÁXI</text>
        <path d="M112 225h400" stroke="#303738" strokeWidth="3" opacity=".7" />
        <circle cx="171" cy="229" r="36" fill="#15191b" stroke="#6d7474" strokeWidth="3" />
        <circle cx="171" cy="229" r="21" fill="#bfc4c1" />
        <circle cx="171" cy="229" r="9" fill="#4b5252" />
        <circle cx="446" cy="229" r="36" fill="#15191b" stroke="#6d7474" strokeWidth="3" />
        <circle cx="446" cy="229" r="21" fill="#bfc4c1" />
        <circle cx="446" cy="229" r="9" fill="#4b5252" />
        <path d="M112 249h46M420 249h48" stroke="#e2d0a4" strokeWidth="3" opacity=".7" />
      </svg>
      <div className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-black/35 px-4 py-2.5 text-[10px] font-medium tracking-wide text-white/80 backdrop-blur-xl sm:bottom-3">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Mobilidade, com identidade MARKA
      </div>
    </div>
  );
}

export default function MobilityExperience() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--theme-text-faint)]">Um universo. Três experiências.</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-3xl">Explore a MARKA</h2>
          </div>
          <span className="hidden text-xs text-[var(--theme-text-muted)] sm:block">Deslize para explorar <span aria-hidden="true">→</span></span>
        </div>
        <div aria-label="Experiências MARKA. Deslize horizontalmente para mudar de painel." className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin]">
          <a href="/app/marketplace" className="group relative min-h-[255px] min-w-[86%] snap-center overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#171814] p-6 text-white sm:min-w-[48%] sm:p-8 lg:min-w-[32%]">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_10%,rgba(216,193,140,0.30),transparent_45%),linear-gradient(145deg,transparent,rgba(0,0,0,0.72))]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-4 bottom-0 h-44 w-44 opacity-90 transition duration-500 group-hover:scale-105 sm:h-52 sm:w-52">
              <svg viewBox="0 0 220 220" className="h-full w-full" fill="none">
                <circle cx="120" cy="110" r="83" stroke="#d8c18c" strokeOpacity=".18" />
                <circle cx="120" cy="110" r="61" stroke="#d8c18c" strokeOpacity=".14" />
                <path d="M73 75h68l19 23v58H73z" fill="#d8c18c" fillOpacity=".10" stroke="#d8c18c" strokeOpacity=".75" strokeWidth="1.5"/>
                <path d="M86 75V60h42v15M73 99h87M107 99v57" stroke="#e9d7a8" strokeWidth="1.5" strokeOpacity=".85"/>
                <path d="M94 112h23m-23 10h32m-32 10h19" stroke="#e9d7a8" strokeWidth="2" strokeLinecap="round" strokeOpacity=".65"/>
                <path d="M146 55l7 7 14-17" stroke="#e9d7a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="relative flex h-full min-h-[205px] flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d8c18c]">01 / Marketplace</span>
              <h3 className="mt-5 max-w-xs text-3xl font-semibold leading-tight tracking-[-0.04em]">Descubra. Compare. Escolha.</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">Produtos e serviços num só lugar, com uma experiência simples e organizada.</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[#d8c18c]">Explorar Marketplace <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </div>
          </a>
          <a href="#ride-request" className="group relative min-h-[255px] min-w-[86%] snap-center overflow-hidden rounded-[1.8rem] border border-[#d8c18c]/35 bg-[#10110f] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:min-w-[48%] sm:p-8 lg:min-w-[32%]">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_15%,rgba(216,193,140,0.30),transparent_45%),linear-gradient(150deg,transparent_30%,rgba(0,0,0,0.52))]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-5 bottom-0 h-44 w-64 opacity-90 transition duration-500 group-hover:translate-x-1 sm:h-52 sm:w-72">
              <svg viewBox="0 0 300 190" className="h-full w-full" fill="none">
                <ellipse cx="158" cy="151" rx="116" ry="12" fill="#000" fillOpacity=".32"/>
                <path d="M36 124l17-34c5-10 14-17 25-19l43-6 34-31c7-6 15-9 24-9h29c13 0 23 6 31 16l24 32 18 10c8 5 13 12 13 22v21c0 7-6 13-13 13H43c-9 0-13-8-7-15z" fill="#d8d9d5" fillOpacity=".16" stroke="#e8d7ad" strokeOpacity=".9" strokeWidth="1.5"/>
                <path d="M91 70l15-22 35-4-2 27zM150 44l25-23h22l18 47h-65zM220 22h7c9 0 15 5 21 13l17 26h-33z" fill="#101719" stroke="#e8d7ad" strokeOpacity=".48"/>
                <path d="M140 45v26m67-49l6 47" stroke="#e8d7ad" strokeOpacity=".5"/>
                <rect x="157" y="77" width="58" height="18" rx="4" fill="#d8c18c"/>
                <text x="186" y="89" textAnchor="middle" fontSize="8" fontWeight="700" letterSpacing="1.5" fill="#171814">MARKA</text>
                <circle cx="82" cy="132" r="22" fill="#111" stroke="#777b76" strokeWidth="2"/><circle cx="82" cy="132" r="12" fill="#c4c6bf"/><circle cx="82" cy="132" r="5" fill="#505552"/>
                <circle cx="250" cy="132" r="22" fill="#111" stroke="#777b76" strokeWidth="2"/><circle cx="250" cy="132" r="12" fill="#c4c6bf"/><circle cx="250" cy="132" r="5" fill="#505552"/>
              </svg>
            </div>
            <div className="relative flex h-full min-h-[205px] flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d8c18c]">02 / Mobility</span>
              <h3 className="mt-5 max-w-xs text-3xl font-semibold leading-tight tracking-[-0.04em]">A cidade. O seu ritmo.</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">Peça uma viagem e acompanhe o percurso numa experiência premium.</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[#d8c18c]">Pedir viagem <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </div>
          </a>
          <a href="/app/mobility/parceiros" className="group relative min-h-[255px] min-w-[86%] snap-center overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#20211d] p-6 text-white sm:min-w-[48%] sm:p-8 lg:min-w-[32%]">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_10%,rgba(255,255,255,0.14),transparent_42%),linear-gradient(145deg,transparent,rgba(0,0,0,0.62))]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-3 bottom-0 h-44 w-52 opacity-85 transition duration-500 group-hover:scale-105 sm:h-52 sm:w-60">
              <svg viewBox="0 0 240 210" className="h-full w-full" fill="none">
                <circle cx="126" cy="105" r="86" stroke="#e4e5df" strokeOpacity=".12"/>
                <circle cx="126" cy="105" r="64" stroke="#e4e5df" strokeOpacity=".10"/>
                <path d="M38 148V86a9 9 0 0 1 9-9h143a9 9 0 0 1 9 9v62" stroke="#d8c18c" strokeOpacity=".72" strokeWidth="1.5"/>
                <path d="M27 148h174v12H27z" fill="#d8c18c" fillOpacity=".13" stroke="#d8c18c" strokeOpacity=".72"/>
                <path d="M56 77V61h42v16M118 77V48h42v29" stroke="#e4e5df" strokeOpacity=".7" strokeWidth="1.5"/>
                <rect x="50" y="94" width="37" height="31" rx="3" fill="#d8c18c" fillOpacity=".13" stroke="#d8c18c" strokeOpacity=".7"/>
                <rect x="101" y="94" width="37" height="31" rx="3" fill="#d8c18c" fillOpacity=".13" stroke="#d8c18c" strokeOpacity=".7"/>
                <rect x="152" y="94" width="29" height="54" rx="3" fill="#d8c18c" fillOpacity=".18" stroke="#d8c18c" strokeOpacity=".7"/>
                <path d="M60 108h17m-17 7h12m40-7h17m-17 7h12" stroke="#e9d7a8" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="relative flex h-full min-h-[205px] flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">03 / MARKA Business</span>
              <h3 className="mt-5 max-w-xs text-3xl font-semibold leading-tight tracking-[-0.04em]">Cresça connosco.</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">Uma porta de entrada para motoristas, frotas parceiras e mobilidade profissional.</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[#d8c18c]">Conhecer parcerias <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </div>
          </a>
        </div>
        <p className="px-1 text-[10px] text-[var(--theme-text-faint)] sm:hidden">Deslize para a esquerda ou direita para mudar de painel.</p>
      </div>
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#10110f] text-white shadow-[0_30px_100px_rgba(0,0,0,0.24)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_12%,rgba(214,185,121,0.18),transparent_38%),linear-gradient(115deg,rgba(255,255,255,0.035),transparent_52%)]" />
        <div className="relative grid min-h-[420px] items-center gap-8 px-5 py-7 sm:px-9 sm:py-10 lg:grid-cols-[1fr_0.9fr] lg:px-12">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.045] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d8c18c]" /> MARKA Mobility <span className="text-white/25">/</span> Angola
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-[3.7rem]">
              A sua cidade.<br /><span className="text-[#d8c18c]">O seu ritmo.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/60 sm:text-base">
              Peça, acompanhe e chegue ao destino. Uma experiência de mobilidade directa, transparente e feita para o dia a dia em Angola.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#ride-request" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#d8c18c] px-6 py-3 text-sm font-semibold text-[#171814] transition hover:brightness-105">
                Pedir viagem <span aria-hidden="true">↗</span>
              </a>
              <Link href="/app/mobility/parceiros" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.07]">
                Ser parceiro
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[9px] font-medium uppercase tracking-[0.15em] text-white/40">
              <span>Pedido simples</span><span>Preço claro</span><span>Parceiros independentes</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[440px]">
            <div aria-hidden="true" className="absolute inset-6 rounded-[2.5rem] bg-[#d8c18c]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/12 bg-[#1b1c19] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div><p className="text-[9px] uppercase tracking-[0.22em] text-white/40">A sua próxima viagem</p><p className="mt-1 text-base font-semibold tracking-tight">Para onde vamos?</p></div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c18c]/30 bg-[#d8c18c]/10 text-lg text-[#d8c18c]" aria-hidden="true">↗</span>
              </div>
              <div className="relative mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-[#d8c18c]" aria-hidden="true">●</span>
                  <div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[0.16em] text-white/40">Partida</p><p className="mt-1 text-sm text-white/80">Defina o local de recolha</p></div>
                  <span className="text-white/30" aria-hidden="true">⌖</span>
                </div>
                <div className="ml-7 h-4 border-l border-dashed border-white/20" aria-hidden="true" />
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d8c18c]/10 text-[#d8c18c]" aria-hidden="true">◆</span>
                  <div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[0.16em] text-white/40">Destino</p><p className="mt-1 text-sm text-white/80">Para onde pretende ir?</p></div>
                  <span className="text-white/30" aria-hidden="true">⌖</span>
                </div>
              </div>
              <a href="#ride-request" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#d8c18c] px-4 text-sm font-semibold text-[#171814] transition hover:brightness-105">Começar pedido <span className="ml-2" aria-hidden="true">→</span></a>
              <div className="mt-4 flex items-center justify-between text-[9px] text-white/35"><span>Mobilidade à sua maneira</span><span>MARKA · AO</span></div>
            </div>
            <div className="relative mt-3 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/40"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Serviços sujeitos à disponibilidade de parceiros</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {rideOptions.map((option) => (
          <a
            key={option.name}
            href="#ride-request"
            className="group flex min-h-36 items-center gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--theme-text-muted)]"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-text)] transition group-hover:border-[var(--theme-text-muted)]">
              <VehicleIcon type={option.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[var(--theme-text)]">{option.name}</span>
                <span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[8px] tracking-[0.14em] text-[var(--theme-text-faint)]">{option.badge}</span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-[var(--theme-text-muted)]">{option.detail}</span>
            </span>
            <span aria-hidden="true" className="text-lg text-[var(--theme-text-faint)] transition group-hover:translate-x-1">→</span>
          </a>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Para quem conduz</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--theme-text)]">A sua experiência também merece uma plataforma melhor.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Conheça o percurso de adesão, os documentos a preparar, a verificação de identidade e os pontos que devem constar no contrato antes de começar a aceitar viagens.</p>
          <Link href="/app/mobility/parceiros" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--theme-text)] px-5 py-3 text-sm font-semibold text-[var(--theme-background)]">Centro de motoristas e parceiros <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Confiança e conformidade</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Segurança visível. Regras claras.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">KYC, documentação do veículo, termos contratuais, suporte e registos devem fazer parte da operação real — não apenas da apresentação visual.</p>
          <Link href="/app/mobility/parceiros#processo" className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--theme-text)]">Ver processo e lista de controlo <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Equidade nas viagens</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Ouvir as duas partes. Decidir com provas.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">A reclamação de um passageiro ou de um motorista merece análise imparcial. A responsabilidade é individual e as medidas devem ser proporcionais à conduta e às evidências.</p>
          <Link href="/app/mobility/justica" className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--theme-text)]">Conhecer os princípios de justiça <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
        <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--theme-text-faint)]">Preço transparente</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Poupar tem de ser real, não uma promessa vazia.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">A ambição da MARKA é apresentar tarifas competitivas e mostrar o valor antes da confirmação. Qualquer campanha de desconto — incluindo uma diferença de 1.000 Kz — deve ser aplicada e validada no sistema de preços antes de ser anunciada.</p>
          <a href="#ride-request" className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--theme-text)]">Consultar uma viagem <span aria-hidden="true" className="ml-2">→</span></a>
        </div>
      </div>
      <MobilityAdSlot />
      <p className="px-1 text-[10px] leading-5 text-[var(--theme-text-faint)]">
        *A verificação e a disponibilidade dos serviços dependem do estado operacional real da plataforma. A publicidade só aparece quando o AdSense está configurado e autorizado.
      </p>
    </section>
  );
}
