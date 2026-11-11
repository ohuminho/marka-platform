import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import MobilityControlCenter from "@/frontend/features/mobility/components/MobilityControlCenter";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function MobilityAdminPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <RoleContextSummary />
          <header className="border-b border-[var(--theme-border)] pb-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">MARKA Mobility · Operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-4xl">Centro de controlo</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Monitorização de corridas, despacho, segurança, pagamentos e recuperação operacional. O acesso e as ações são validados pelas permissões do servidor.</p>
          </header>
          <MobilityControlCenter />
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
