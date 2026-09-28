import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

export default function VendorProductsPage() {
  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <header><p className="text-[10px] uppercase tracking-[0.28em] text-white/30">Vendor</p><h1 className="mt-2 text-3xl font-semibold text-white">Product Catalogue</h1><p className="mt-2 text-sm text-white/45">Manage the catalogue exposed by your store through the existing catalog API.</p></header>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Catalogue API</p><p className="mt-3 text-lg text-white">Connected</p><p className="mt-2 text-sm text-white/40">Product routes are available under /api/products.</p></div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/30">Operations</p><p className="mt-3 text-lg text-white">Create · Update · Delete</p><p className="mt-2 text-sm text-white/40">Visibility remains permission-gated.</p></div>
          </section>
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
