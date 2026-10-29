"use client";

import Link from "next/link";
import { useVendor } from "../context/VendorProvider";
import RevenuePulse from "./RevenuePulse";
import InventoryHealth from "./InventoryHealth";
import StorePerformance from "./StorePerformance";
import StoreLocationCard from "./StoreLocationCard";

export default function VendorOverview() {
  const { vendor, loading } = useVendor();

  if (loading) {
    return <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-sm text-[var(--theme-text-muted)]">A carregar o centro de negócio…</div>;
  }

  if (!vendor) {
    return (
      <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-7 sm:p-10">
        <p className="marka-kicker">MARKA / BUSINESS</p>
        <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-5xl">O seu próximo negócio começa aqui.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--theme-text-muted)]">Ainda não existe uma loja associada a esta conta. Abra uma loja, prepare o catálogo e acompanhe a aprovação comercial num único espaço.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/app/vendor/products" className="rounded-full bg-[var(--theme-text)] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-background)]">Abrir uma loja</Link>
          <Link href="/app/marketplace" className="rounded-full border border-[var(--theme-border)] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text)]">Explorar Marketplace</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="marka-kicker">MARKA / BUSINESS</p>
        <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-5xl">Vendor Command Center</h1>
        <p className="mt-3 text-[var(--theme-text-muted)]">O espaço de operação da sua loja, catálogo e atividade comercial.</p>
        <Link href="/app/vendor/products" className="mt-5 inline-flex rounded-full bg-[var(--theme-text)] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-background)]">Gerir loja e produtos</Link>
      </header>
      <RevenuePulse />
      {vendor.store ? <StoreLocationCard store={vendor.store} /> : null}
      <div className="grid gap-8 lg:grid-cols-2">
        <InventoryHealth />
        <StorePerformance />
      </div>
    </div>
  );
}
