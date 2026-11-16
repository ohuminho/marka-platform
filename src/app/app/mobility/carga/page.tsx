import Link from "next/link";

import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityFreightRequestForm from "@/frontend/features/mobility/components/MobilityFreightRequestForm";
import MobilityFreightRequestHistory from "@/frontend/features/mobility/components/MobilityFreightRequestHistory";

export default function MobilityFreightPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="mx-auto w-full max-w-5xl space-y-5 pb-10">
          <header className="relative isolate overflow-hidden rounded-[28px] border border-white/[.09] bg-[#09090B] px-5 py-6 text-white shadow-[0_28px_80px_-48px_rgba(0,0,0,.9)] sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(229,184,75,.16),transparent_42%)]" />
            <div className="relative">
              <Link href="/app/mobility" className="inline-flex min-h-9 items-center gap-2 text-[11px] font-medium text-white/55 transition hover:text-[#E5B84B]">
                <span aria-hidden="true">←</span> Voltar à mobilidade
              </Link>
              <p className="mt-6 text-[9px] font-bold uppercase tracking-[.24em] text-[#E5B84B]">MARKA Mobility · Logística</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Carga, água e assistência.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                Indique a quantidade, a unidade e a viatura adequada. O pedido fica registado para análise e cotação; a atribuição do prestador depende da confirmação do pagamento.
              </p>
            </div>
          </header>
          <MobilityFreightRequestForm />
          <MobilityFreightRequestHistory />
          <p className="px-1 text-center text-[9px] text-[var(--theme-text-muted)]">Powered By Magestade Pura Digital</p>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
