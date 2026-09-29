"use client";

import { useEffect, useState } from "react";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import { useVendor, VendorProvider } from "@/frontend/features/vendor/context/VendorProvider";

type Metrics = { revenue?: { current?: number; currency?: string }; sales?: { totalOrders?: number }; inventory?: { totalProducts?: number }; store?: { customers?: number } };

function AnalyticsContent() {
  const { vendor, loading: vendorLoading } = useVendor();
  const [metrics, setMetrics] = useState<Metrics>();
  const vendorId = vendor?.id ?? null;
  const loading = vendorLoading || (vendorId !== null && !metrics);

  useEffect(() => {
    const currentVendorId = vendorId;
    if (currentVendorId === null) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/vendors/" + currentVendorId + "/analytics", { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load analytics");
        const data = (await response.json()) as Metrics;
        if (!cancelled) setMetrics(data);
      } catch { if (!cancelled) setMetrics(undefined); }
      finally { /* loading is derived from vendor context and metrics */ }
    }
    void load();
    return () => { cancelled = true; };
  }, [vendorId, vendorLoading]);

  const cards = [
    ["Revenue", metrics?.revenue?.current != null ? String(metrics.revenue.current) + " " + (metrics.revenue.currency ?? "AOA") : "—"],
    ["Orders", metrics?.sales?.totalOrders ?? "—"],
    ["Products", metrics?.inventory?.totalProducts ?? "—"],
    ["Customers", metrics?.store?.customers ?? "—"],
  ];

  return <main className="space-y-8"><header><p className="text-[10px] uppercase tracking-[0.28em] text-white/30">Vendor</p><h1 className="mt-2 text-3xl font-semibold text-white">Analytics</h1><p className="mt-2 text-sm text-white/45">Live metrics from the existing VendorAnalyticsService.</p></header>{loading ? <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 text-sm text-white/40">Loading vendor metrics…</div> : !vendor ? <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 text-sm text-white/40">No vendor context is available for the active account.</div> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-[10px] uppercase tracking-[0.22em] text-white/30">{label}</p><p className="mt-3 text-2xl font-semibold text-white">{value}</p></div>)}</section>}</main>;
}

export default function VendorAnalyticsPage() {
  return <DynamicBackground><AppShell><VendorProvider><AnalyticsContent /></VendorProvider></AppShell></DynamicBackground>;
}
