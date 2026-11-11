import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";
import DriverTripHistory from "@/frontend/features/mobility/components/DriverTripHistory";
import DriverOnboardingPanel from "@/frontend/features/mobility/components/DriverOnboardingPanel";

function DriverMobilityMark() {
  return (
    <svg viewBox="0 0 160 92" role="img" aria-label="Símbolo vetorial MARKA Mobility" className="h-20 w-36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="driver-mark-gold" x1="18" y1="8" x2="142" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8E4A8" />
          <stop offset=".52" stopColor="#D9AA4B" />
          <stop offset="1" stopColor="#8E6727" />
        </linearGradient>
      </defs>
      <path d="M18 59L28 48L40 24C43 18 49 14 57 14H104C112 14 118 18 122 25L135 48L144 53C148 55 150 59 150 64V72H10V66C10 63 13 60 18 59Z" fill="#10151D" stroke="url(#driver-mark-gold)" strokeWidth="3"/>
      <path d="M43 28C46 22 50 20 57 20H103C109 20 113 23 117 29L127 46H34L43 28Z" fill="#91A8B8" fillOpacity=".22" stroke="#EBD08A" strokeOpacity=".7" strokeWidth="2"/>
      <path d="M80 21V46M32 51H129" stroke="#EBD08A" strokeOpacity=".45" strokeWidth="2"/>
      <path d="M16 58H39M123 58H146" stroke="#F5D98F" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="39" cy="70" r="11" fill="#080B10" stroke="#D7DCE2" strokeWidth="3"/>
      <circle cx="121" cy="70" r="11" fill="#080B10" stroke="#D7DCE2" strokeWidth="3"/>
      <circle cx="39" cy="70" r="4" fill="#D9AA4B"/>
      <circle cx="121" cy="70" r="4" fill="#D9AA4B"/>
      <path d="M69 9H91" stroke="#F8E4A8" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export default function DriverPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-6">
          <RoleContextSummary />
          <header className="relative isolate overflow-hidden rounded-[2rem] border border-[#D9AA4B]/25 bg-[#080C12] p-5 text-white shadow-[0_24px_70px_-38px_rgba(217,170,75,.35)] sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#D9AA4B]/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[9px] font-semibold uppercase tracking-[.3em] text-[#E9BD58]">MARKA Mobility · Partner Driver</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">O seu espaço de motorista.</h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/60">Receba pedidos, aceite viagens e acompanhe cada etapa da operação num único lugar. A disponibilidade e a atribuição dependem da validação da conta e da viatura.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[.04] px-3 py-2 text-[10px] text-white/75">Viagens em tempo real</span>
                  <span className="rounded-full border border-white/15 bg-white/[.04] px-3 py-2 text-[10px] text-white/75">GPS com autorização</span>
                  <span className="rounded-full border border-[#D9AA4B]/30 bg-[#D9AA4B]/[.08] px-3 py-2 text-[10px] text-[#F2CD70]">Parceiro independente</span>
                </div>
              </div>
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:min-w-48">
                <DriverMobilityMark />
              </div>
            </div>
          </header>
          <DriverOnboardingPanel />
          <MobilityActiveTripExperience audience="driver" />
          <DriverTripHistory />
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
