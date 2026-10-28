import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";
import MobilityActiveTripExperience from "@/frontend/features/mobility/components/MobilityActiveTripExperience";

export default function DriverPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <RoleContextSummary />
          <MobilityActiveTripExperience audience="driver" />
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-muted)]">MARKA partner network</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-3xl">Driver Workspace</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Uma experiência operacional focada no motorista parceiro: viagem atribuída, percurso registado, informação do passageiro e estado da operação. Os motores de dispatch, segurança e liquidação continuam a ser a fonte de verdade.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/40 p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--theme-text-faint)]">Modelo</p><p className="mt-2 text-sm font-medium text-[var(--theme-text)]">Parceiro independente</p></div>
              <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/40 p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--theme-text-faint)]">Operação</p><p className="mt-2 text-sm font-medium text-[var(--theme-text)]">Viagens atribuídas</p></div>
              <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/40 p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--theme-text-faint)]">Prioridade</p><p className="mt-2 text-sm font-medium text-[var(--theme-text)]">Segurança e confiança</p></div>
            </div>
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
