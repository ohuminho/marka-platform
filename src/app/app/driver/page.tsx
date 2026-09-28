import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

export default function DriverPage() {
  return <DynamicBackground><AppShell><main className="space-y-8"><RoleContextSummary /><header><p className="text-[10px] uppercase tracking-[0.28em] text-white/30">Driver</p><h1 className="mt-2 text-3xl font-semibold text-white">Driver Workspace</h1><p className="mt-2 text-sm text-white/45">Driver-facing entry point for mobility operations.</p></header><section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Operational model</p><p className="mt-3 text-lg text-white">Partner driver · no owned fleet</p><p className="mt-2 text-sm text-white/40">Dispatch, trip state and financial settlement remain delegated to the closed Mobility and Finance engines.</p></section></main></AppShell></DynamicBackground>;
}
