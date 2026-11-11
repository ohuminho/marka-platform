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
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.08] bg-[#080A0E] px-5 py-4 text-white">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[#E9BD58]">MARKA Mobility · Parceiros</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight">Espaço do motorista</h1>
            </div>
            <Link href="/app/mobility" className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:border-[#E9BD58]/50 hover:text-[#F2CD70]">Área de passageiro ↗</Link>
          </header>
          <MobilityActiveTripExperience audience="driver" />
          <DriverOnboardingPanel />
          <DriverTripHistory />
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
