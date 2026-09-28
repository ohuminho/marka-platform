import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function SuperAdminPage() {
  return <DynamicBackground><AppShell><main className="space-y-8"><RoleContextSummary /><header><p className="text-[10px] uppercase tracking-[0.28em] text-white/30">Control Center</p><h1 className="mt-2 text-3xl font-semibold text-white">Global Platform Control</h1><p className="mt-2 text-sm text-white/45">Global operational surface for accounts carrying SYSTEM_ADMIN.</p></header><section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Authorization</p><p className="mt-3 text-lg text-white">SYSTEM_ADMIN</p></div><div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Mobility</p><p className="mt-3 text-lg text-white">Available</p></div><div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Account</p><p className="mt-3 text-lg text-white">Context-aware</p></div></section></main></AppShell></DynamicBackground>;
}
