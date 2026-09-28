import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

export default function AdminSystemPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <header>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Administration</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">System</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">Protected system-management surface for SYSTEM_ADMIN.</p>
          </header>
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--theme-text)]/30">Access model</p>
            <p className="mt-3 text-lg text-[var(--theme-text)]">Permission gated</p>
            <p className="mt-2 text-sm text-[var(--theme-text)]/40">Operational controls are not mocked where no backend contract exists.</p>
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
