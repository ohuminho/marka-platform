import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";
import DriverTripHistory from "@/frontend/features/mobility/components/DriverTripHistory";
import DriverOnboardingPanel from "@/frontend/features/mobility/components/DriverOnboardingPanel";

const workspaceLinks = [
  { href: "#operacao", index: "01", label: "Operação", detail: "Viagens e disponibilidade" },
  { href: "#candidatura", index: "02", label: "Perfil", detail: "Documentos e viatura" },
  { href: "#historico", index: "03", label: "Histórico", detail: "Registo de atividade" },
];

export default function DriverPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="relative space-y-5 pb-8">
          <header className="relative isolate overflow-hidden rounded-[30px] border border-white/[.09] bg-[#070A0F] text-white shadow-[0_32px_100px_-54px_rgba(0,0,0,.95)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_0%,rgba(222,183,94,.18),transparent_38%),radial-gradient(ellipse_at_0%_100%,rgba(74,105,145,.12),transparent_42%)]" />
            <div className="pointer-events-none absolute -right-20 top-12 h-72 w-72 rounded-full border border-white/[.045]" />
            <div className="pointer-events-none absolute -right-8 top-24 h-48 w-48 rounded-full border border-[#e9bd58]/[.10]" />
            <div className="relative px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8 lg:px-10 lg:pt-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e9bd58]/20 bg-[#e9bd58]/[.055] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e9bd58] shadow-[0_0_10px_rgba(233,189,88,.7)]" />
                  <span className="text-[9px] font-bold uppercase tracking-[.25em] text-[#f0d58e]">MARKA Mobility</span>
                </div>
                <Link href="/app/mobility" className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[.14] bg-white/[.045] px-4 text-[11px] font-semibold text-white/75 transition hover:border-[#e9bd58]/45 hover:bg-[#e9bd58]/[.07] hover:text-[#f2d48c]">
                  Área de passageiro <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">↗</span>
                </Link>
              </div>

              <div className="mt-9 grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="max-w-3xl">
                  <p className="text-[9px] font-semibold uppercase tracking-[.3em] text-white/35">Centro de comando do parceiro</p>
                  <h1 className="mt-3 text-[clamp(2.1rem,5.2vw,4.15rem)] font-semibold leading-[.98] tracking-[-.065em]">
                    A estrada é sua.<br />
                    <span className="bg-gradient-to-r from-[#fff1c8] via-[#e9bd58] to-[#b98735] bg-clip-text text-transparent">O controlo também.</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/50 sm:text-[15px]">
                    Tudo o que precisa para operar na rede MARKA, organizado para decidir depressa, conduzir com atenção e manter o seu perfil em conformidade.
                  </p>
                </div>
                <div className="hidden min-w-[170px] pb-1 text-right lg:block">
                  <p className="text-[9px] uppercase tracking-[.24em] text-white/30">A sua plataforma</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-.05em] text-white/85">MARKA<span className="text-[#e9bd58]">.</span></p>
                  <p className="mt-1 text-[9px] tracking-[.16em] text-white/35">MOBILITY NETWORK</p>
                </div>
              </div>

              <nav aria-label="Navegação do espaço do parceiro" className="mt-8 grid gap-2 border-t border-white/[.09] pt-4 sm:grid-cols-3">
                {workspaceLinks.map((item) => (
                  <a key={item.href} href={item.href} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-white/[.09] hover:bg-white/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9bd58]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e9bd58]/20 bg-[#e9bd58]/[.06] text-[10px] font-semibold text-[#e9bd58]">{item.index}</span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white/85">{item.label}</span>
                      <span className="mt-1 block truncate text-[10px] text-white/35">{item.detail}</span>
                    </span>
                    <span aria-hidden="true" className="ml-auto text-white/25 transition group-hover:translate-x-1 group-hover:text-[#e9bd58]">→</span>
                  </a>
                ))}
              </nav>
            </div>
          </header>

          <section id="operacao" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <span className="h-5 w-1 rounded-full bg-[#e9bd58]" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[var(--theme-text-muted)]">01 · Centro operacional</p>
                <h2 className="mt-0.5 text-base font-semibold tracking-tight text-[var(--theme-text)]">Viagem e disponibilidade</h2>
              </div>
            </div>
            <MobilityActiveTripExperience audience="driver" />
          </section>

          <section id="candidatura" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <span className="h-5 w-1 rounded-full bg-[#e9bd58]" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[var(--theme-text-muted)]">02 · Identidade e conformidade</p>
                <h2 className="mt-0.5 text-base font-semibold tracking-tight text-[var(--theme-text)]">Perfil de parceiro</h2>
              </div>
            </div>
            <DriverOnboardingPanel />
          </section>

          <section id="historico" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <span className="h-5 w-1 rounded-full bg-[#e9bd58]" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[var(--theme-text-muted)]">03 · Atividade</p>
                <h2 className="mt-0.5 text-base font-semibold tracking-tight text-[var(--theme-text)]">Histórico de viagens</h2>
              </div>
            </div>
            <DriverTripHistory />
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
