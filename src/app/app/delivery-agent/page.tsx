import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function DeliveryAgentPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <RoleContextSummary />
          <header>
            <p className="marka-kicker">MARKA / DELIVERY</p>
            <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)]">Área do estafeta</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">Área operacional dos estafetas.</p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <a href="/app/delivery-agent/offers" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
              <p className="text-lg text-[var(--theme-text)]">Ofertas de entrega</p>
              <p className="mt-2 text-sm text-[var(--theme-text)]/40">Consultar e aceitar ofertas de entrega.</p>
            </a>
            <a href="/app/delivery-agent/deliveries" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
              <p className="text-lg text-[var(--theme-text)]">As minhas entregas</p>
              <p className="mt-2 text-sm text-[var(--theme-text)]/40">Acompanhar e concluir entregas atribuídas.</p>
            </a>
          </div>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
