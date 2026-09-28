import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

export default function AdminUsersPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <header>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Administration</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Users</h1>
            <p className="mt-2 text-sm text-[var(--theme-text)]/45">User administration surface controlled by USER_READ and USER_UPDATE.</p>
          </header>
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--theme-text)]/30">Backend surface</p>
            <p className="mt-3 text-lg text-[var(--theme-text)]">UserService available</p>
            <p className="mt-2 text-sm text-[var(--theme-text)]/40">The current /api/users contract is creation-oriented; no fabricated listing is shown.</p>
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
