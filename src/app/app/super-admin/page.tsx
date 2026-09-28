import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function SuperAdminPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <RoleContextSummary />
          <header>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Control Center</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Global Platform Control</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">Global operational surface for accounts carrying SYSTEM_ADMIN.</p>
          </header>
          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Authorization", "SYSTEM_ADMIN"],
              ["Mobility", "Available"],
              ["Account", "Context-aware"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--theme-text)]/30">{label}</p>
                <p className="mt-3 text-lg text-[var(--theme-text)]">{value}</p>
              </div>
            ))}
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
