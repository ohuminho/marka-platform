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
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Delivery</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Delivery Agent Workspace</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">Operational entry point for delivery agents.</p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <a href="/app/delivery-agent/offers" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
              <p className="text-lg text-[var(--theme-text)]">Available Deliveries</p>
              <p className="mt-2 text-sm text-[var(--theme-text)]/40">Review and accept delivery offers.</p>
            </a>
            <a href="/app/delivery-agent/deliveries" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
              <p className="text-lg text-[var(--theme-text)]">My Deliveries</p>
              <p className="mt-2 text-sm text-[var(--theme-text)]/40">Operate assigned deliveries.</p>
            </a>
          </div>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
