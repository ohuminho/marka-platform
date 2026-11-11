import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";
import DriverTripHistory from "@/frontend/features/mobility/components/DriverTripHistory";
import DriverOnboardingPanel from "@/frontend/features/mobility/components/DriverOnboardingPanel";

export default function DriverPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-5">
          <header className="relative isolate overflow-hidden rounded-[28px] border border-white/[.09] bg-[#080B10] px-5 py-6 text-white shadow-[0_28px_90px_-48px_rgba(0,0,0,.9)] sm:px-7 sm:py-7">
            <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-[#E9BD58]/[.08] blur-3xl"/>
            <div className="relative flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-2xl">
                <p className="text-[9px] font-bold uppercase tracking-[.27em] text-[#E9BD58]">MARKA MOBILITY · REDE DE PARCEIROS</p>
                <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.7rem)] font-semibold leading-[1.04] tracking-[-.05em]">Conduza com foco.<br className="hidden sm:block"/> Acompanhe tudo num só lugar.</h1>
                <p className="mt-3 max-w-xl text-xs leading-5 text-white/45">Viagens, disponibilidade, conformidade e histórico reunidos numa experiência operacional simples e segura.</p>
              </div>
              <Link href="/app/mobility" className="group inline-flex min-h-11 items-center gap-3 rounded-full border border-white/[.13] bg-white/[.035] px-5 text-xs font-semibold text-white/75 transition hover:border-[#E9BD58]/45 hover:bg-[#E9BD58]/[.06] hover:text-[#F2CD70]">Mudar para passageiro <span className="transition-transform group-hover:translate-x-1">↗</span></Link>
            </div>
          </header>
          <MobilityActiveTripExperience audience="driver" />
          <DriverOnboardingPanel />
          <DriverTripHistory />
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
