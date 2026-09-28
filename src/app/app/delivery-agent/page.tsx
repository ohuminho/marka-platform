import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

export default function DeliveryAgentPage() {
  return <DynamicBackground><AppShell><main className="space-y-8"><header><p className="text-[10px] uppercase tracking-[0.28em] text-white/30">Delivery</p><h1 className="mt-2 text-3xl font-semibold text-white">Delivery Agent Workspace</h1><p className="mt-2 text-sm text-white/45">Operational entry point for delivery agents.</p></header><div className="grid gap-4 md:grid-cols-2"><a href="/app/delivery-agent/offers" className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-lg text-white">Available Deliveries</p><p className="mt-2 text-sm text-white/40">Review and accept delivery offers.</p></a><a href="/app/delivery-agent/deliveries" className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-lg text-white">My Deliveries</p><p className="mt-2 text-sm text-white/40">Operate assigned deliveries.</p></a></div></main></AppShell></DynamicBackground>;
}
