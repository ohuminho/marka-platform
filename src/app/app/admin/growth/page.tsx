"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

type Analytics = {
  period: { from: string; to: string; days: number };
  totals: {
    events: number;
    uniqueVisitors: number;
    pageViews: number;
    marketplaceViews: number;
    productViews: number;
    storeViews: number;
    searches: number;
    addToCart: number;
  };
  funnel: {
    productViewToCartEventRate: number | null;
    cartToPurchaseEventRate: number | null;
  };
  aiCore: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number }>;
    truncated: boolean;
  };
  note: string;
};

function number(value: number): string {
  return new Intl.NumberFormat("pt-AO").format(value);
}

function percentage(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("pt-AO", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function GrowthAnalyticsContent() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/growth/analytics", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("Esta área está reservada a Founder, Super Admin e Admin.");
      }
      if (!response.ok) throw new Error("Não foi possível carregar as métricas.");
      const result = await response.json() as Analytics;
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao consultar analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const events = data ? [
    ["Visualizações de página", data.totals.pageViews],
    ["Visitas ao Marketplace", data.totals.marketplaceViews],
    ["Visualizações de produtos", data.totals.productViews],
    ["Visualizações de lojas", data.totals.storeViews],
    ["Pesquisas", data.totals.searches],
    ["Adições ao carrinho", data.totals.addToCart],
  ] as const : [];
  const maxEvent = Math.max(1, ...events.map(([, value]) => value));
  const modelEntries = Object.entries(data?.aiCore.byModel ?? {});

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/35">Administração · Growth intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Analytics MARKA</h1>
          <p className="mt-2 text-sm text-[var(--theme-text)]/50">Aquisição, actividade do Marketplace e utilização do AI Core — últimos 30 dias.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/admin" className="text-xs text-[var(--theme-text)]/55 underline underline-offset-4">Admin Center</Link>
          <button type="button" onClick={() => void load(true)} disabled={refreshing || loading} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)] disabled:opacity-40">{refreshing ? "A actualizar…" : "Actualizar"}</button>
        </div>
      </header>

      {loading ? <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6 text-sm text-[var(--theme-text)]/50">A carregar métricas reais…</section>
      : error ? <section role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] p-6"><p className="text-sm text-[var(--theme-text)]">{error}</p><button type="button" onClick={() => void load(true)} className="mt-4 rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text)]">Tentar novamente</button></section>
      : data ? <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Visitantes únicos", data.totals.uniqueVisitors],
            ["Eventos registados", data.totals.events],
            ["Pedidos AI Core", data.aiCore.requests],
            ["Tokens AI Core", data.aiCore.totalTokens],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--theme-text)]/35">{label}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--theme-text)]">{number(Number(value))}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[var(--theme-text)]">Actividade do Marketplace</h2><span className="text-[10px] text-[var(--theme-text)]/35">30 dias</span></div>
            <div className="mt-6 space-y-5">
              {events.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-[var(--theme-text)]/65">{label}</span><strong className="tabular-nums text-[var(--theme-text)]">{number(value)}</strong></div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-text)]/10"><div className="h-full rounded-full bg-[#c9a66b]" style={{ width: ((value / maxEvent) * 100) + "%" }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
            <h2 className="text-lg font-semibold text-[var(--theme-text)]">Conversão observada</h2>
            <p className="mt-1 text-xs text-[var(--theme-text)]/40">Rácios de eventos, não utilizadores únicos.</p>
            <div className="mt-7 grid grid-cols-2 gap-4">
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-[var(--theme-text)]/35">Produto → carrinho</p><p className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">{percentage(data.funnel.productViewToCartEventRate)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.15em] text-[var(--theme-text)]/35">Carrinho → compra</p><p className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">—</p></div>
            </div>
            <p className="mt-6 text-xs leading-5 text-[var(--theme-text)]/45">A compra só será apresentada quando o evento estiver ligado à confirmação efectiva do pagamento. Não contamos redireccionamentos como vendas.</p>
          </article>
        </section>

        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[var(--theme-text)]">AI Core · consumo e modelos</h2><span className="text-xs text-[var(--theme-text)]/40">{number(data.aiCore.inputTokens)} entrada · {number(data.aiCore.outputTokens)} saída</span></div>
          {modelEntries.length === 0 ? <p className="mt-5 text-sm text-[var(--theme-text)]/45">Ainda não existem chamadas AI Core registadas neste período.</p> : <div className="mt-5 divide-y divide-[var(--theme-border)]">{modelEntries.map(([model, metrics]) => <div key={model} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="font-medium text-[var(--theme-text)]">{model}</span><span className="text-xs tabular-nums text-[var(--theme-text)]/50">{number(metrics.requests)} pedidos · {number(metrics.inputTokens + metrics.outputTokens)} tokens</span></div>)}</div>}
          {data.aiCore.truncated && <p className="mt-3 text-xs text-amber-500">A amostra de utilização atingiu 10.000 registos; os totais podem estar incompletos.</p>}
        </section>

        <p className="text-xs leading-5 text-[var(--theme-text)]/35">{data.note}</p>
      </> : null}
    </main>
  );
}

export default function AdminGrowthAnalyticsPage() {
  return <DynamicBackground><AppShell><GrowthAnalyticsContent /></AppShell></DynamicBackground>;
}
