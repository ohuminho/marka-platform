"use client";

import Link from "next/link";
import MobilityAdSlot from "@/frontend/features/mobility/components/MobilityAdSlot";

const rideOptions = [
  {
    name: "MARKA Taxi",
    detail: "Conforto para as deslocações do dia a dia",
    badge: "POPULAR",
    icon: "car",
  },
  {
    name: "Moto-táxi",
    detail: "Uma alternativa ágil para a cidade",
    badge: "ÁGIL",
    icon: "moto",
  },
  {
    name: "Mobilidade empresarial",
    detail: "Transporte para equipas e negócios",
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
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[#101414] text-white shadow-[0_28px_90px_rgba(0,0,0,0.22)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_35%,rgba(205,184,133,0.16),transparent_43%),linear-gradient(125deg,rgba(255,255,255,0.035),transparent_55%)]" />
        <div className="relative grid min-h-[440px] items-center gap-2 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-14">
          <div className="relative z-20 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d8c18c]" />
              MARKA Mobility · Angola
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
              A cidade é sua.<br />
              <span className="text-[#d8c18c]">Vamos a caminho.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/60 sm:text-base">
              Peça uma viagem, acompanhe a sua mobilidade e chegue ao seu destino com uma experiência simples, moderna e com a identidade MARKA.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#ride-request" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#d8c18c] px-6 py-3 text-sm font-semibold text-[#171814] transition hover:brightness-105">
                Pedir uma viagem <span aria-hidden="true">→</span>
              </a>
              <Link href="/app/marketplace" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06]">
                Explorar Marketplace
              </Link>
              <Link href="/app/mobility/parceiros" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d8c18c]/35 px-6 py-3 text-sm font-medium text-[#e4d2a8] transition hover:bg-white/[0.06]">
                Conduzir com a MARKA
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[10px] uppercase tracking-[0.16em] text-white/45">
              <span>Mobilidade urbana</span>
              <span>Motoristas verificados*</span>
              <span>Uma só plataforma</span>
            </div>
          </div>
          <TaxiIllustration />
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
