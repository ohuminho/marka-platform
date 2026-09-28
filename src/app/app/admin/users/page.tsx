import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

export default function AdminUsersPage() {
  return <DynamicBackground><AppShell><main className="space-y-8"><header><p className="text-[10px] uppercase tracking-[0.28em] text-white/30">Administration</p><h1 className="mt-2 text-3xl font-semibold text-white">Users</h1><p className="mt-2 text-sm text-white/45">User administration surface controlled by USER_READ and USER_UPDATE.</p></header><section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Backend surface</p><p className="mt-3 text-lg text-white">UserService available</p><p className="mt-2 text-sm text-white/40">The current /api/users contract is creation-oriented; no fabricated listing is shown.</p></section></main></AppShell></DynamicBackground>;
}
