"use client";

import { useMemo } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(name?: string) {
  return (name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function AccountPage() {
  const { user, session, organizations, activeOrganization, authorization, loading } = useAuth();

  const permissionGroups = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const permission of authorization.permissions) {
      const [domain] = permission.split("_");
      const current = grouped.get(domain) ?? [];
      current.push(permission);
      grouped.set(domain, current);
    }
    return Array.from(grouped.entries());
  }, [authorization.permissions]);

  if (loading) {
    return <div className="py-16 text-sm text-[var(--theme-text-muted)]">Loading account context…</div>;
  }

  if (!user) {
    return <div className="py-16 text-sm text-[var(--theme-text-muted)]">No authenticated account context.</div>;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] text-lg font-semibold text-[var(--theme-text)]">
            {initials(user.profile?.displayName || user.name)}
          </div>
          <div>
            <p className="marka-kicker">MARKA / ACCOUNT</p>
            <h1 className="marka-editorial mt-2 text-3xl text-[var(--theme-text)]">{user.profile?.displayName || user.name}</h1>
            <p className="mt-1 text-sm text-[var(--theme-text-muted)]">{user.email}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--theme-border)] px-4 py-3 text-right">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">Primary role</p>
          <p className="mt-1 text-sm font-semibold text-[var(--theme-text)]">{user.role}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
          <h2 className="text-sm font-semibold text-[var(--theme-text)]">Identity</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Status", user.status],
              ["Email verification", user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Pending"],
              ["Phone", user.profile?.phone || "Not provided"],
              ["Country", user.profile?.countryCode || "Not provided"],
              ["Locale", user.profile?.locale || "Default"],
              ["Timezone", user.profile?.timezone || "Default"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">{label}</dt>
                <dd className="mt-1 text-sm text-[var(--theme-text)]">{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
          <h2 className="text-sm font-semibold text-[var(--theme-text)]">Active context</h2>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Organization</dt>
              <dd className="mt-1 text-sm text-[var(--theme-text)]">{activeOrganization?.name || "No organization selected"}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Organization ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-[var(--theme-text-muted)]">{authorization.organizationId || "—"}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">Roles</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {authorization.roles.length ? authorization.roles.map((role) => <span key={role} className="rounded-full border border-[var(--theme-border)] px-2.5 py-1 text-[10px] text-[var(--theme-text)]">{role}</span>) : <span className="text-sm text-[var(--theme-text-muted)]">None</span>}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--theme-text)]">Session</h2>
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">Current authenticated session context.</p>
            </div>
            <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[10px] text-[var(--theme-text-muted)]">
              {session ? "ACTIVE" : "UNKNOWN"}
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ["Created", formatDate(session?.createdAt)],
              ["Last seen", formatDate(session?.lastSeenAt)],
              ["Expires", formatDate(session?.expiresAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--theme-border)] p-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">{label}</p>
                <p className="mt-2 text-sm text-[var(--theme-text)]">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--theme-text)]">Permissions</h2>
          <div className="mt-5 space-y-4">
            {permissionGroups.length ? permissionGroups.map(([group, permissions]) => (
              <div key={group}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">{group}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {permissions.map((permission) => <span key={permission} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--theme-text)]">{permission}</span>)}
                </div>
              </div>
            )) : <p className="text-sm text-[var(--theme-text-muted)]">No permissions exposed for the active organization.</p>}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--theme-text)]">Organizations</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => (
              <div key={organization.id} className={`rounded-2xl border p-4 ${organization.id === activeOrganization?.id ? "border-[var(--theme-accent)] bg-[var(--theme-surface-strong)]" : "border-[var(--theme-border)]"}`}>
                <p className="text-sm font-medium text-[var(--theme-text)]">{organization.name}</p>
                <p className="mt-1 text-xs text-[var(--theme-text-muted)]">{organization.slug}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
