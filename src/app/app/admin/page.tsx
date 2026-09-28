import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function AdminPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <RoleContextSummary />
          <header>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Administration</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">MARKA Admin Center</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">Central entry point for platform administration and operational control.</p>
          </header>
          <section className="grid gap-4 md:grid-cols-3">
            <a href="/app/admin/users" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6"><p className="text-lg text-[var(--theme-text)]">Users</p><p className="mt-2 text-sm text-[var(--theme-text)]/40">Community administration.</p></a>
            <a href="/app/admin/delivery-agents" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6"><p className="text-lg text-[var(--theme-text)]">Delivery Agents</p><p className="mt-2 text-sm text-[var(--theme-text)]/40">Delivery operations.</p></a>
            <a href="/app/admin/reports" className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6"><p className="text-lg text-[var(--theme-text)]">Reports</p><p className="mt-2 text-sm text-[var(--theme-text)]/40">Platform intelligence.</p></a>
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
