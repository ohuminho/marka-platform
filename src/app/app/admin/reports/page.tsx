import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

export default function AdminReportsPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <header>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Administration</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Reports</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">Platform intelligence workspace for administrative reporting.</p>
          </header>
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--theme-text)]/30">Control plane</p>
            <p className="mt-3 text-lg text-[var(--theme-text)]">Route exposed</p>
            <p className="mt-2 text-sm text-[var(--theme-text)]/40">Reporting widgets will consume dedicated report contracts as those APIs are exposed.</p>
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
