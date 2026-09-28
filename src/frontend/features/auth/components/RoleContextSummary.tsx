"use client";

import { useAuth } from "@/frontend/providers/auth/AuthProvider";

export default function RoleContextSummary() {
  const { user, activeOrganization, authorization, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm text-[var(--theme-text-muted)]">
        Loading authenticated context…
      </div>
    );
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Account</p>
        <p className="mt-2 text-sm font-medium text-[var(--theme-text)]">{user?.name || "Authenticated user"}</p>
      </div>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Role</p>
        <p className="mt-2 text-sm font-medium text-[var(--theme-text)]">{user?.role || authorization.roles[0] || "—"}</p>
      </div>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Organization</p>
        <p className="mt-2 truncate text-sm font-medium text-[var(--theme-text)]">{activeOrganization?.name || "Platform context"}</p>
      </div>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Session</p>
        <p className="mt-2 text-sm font-medium text-[var(--theme-text)]">{session ? "ACTIVE" : "—"}</p>
      </div>
    </section>
  );
}
