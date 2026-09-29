"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PremiumCard from "@/design-system/components/cards/PremiumCard";
import MetricDisplay from "@/design-system/components/data-display/MetricDisplay";
import FadeIn from "@/design-system/motion/FadeIn";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

const ecosystem = [
  { title: "Marketplace", description: "Commerce and discovery", route: "/app/marketplace", index: "01" },
  { title: "Wallet", description: "Digital financial infrastructure", route: "/app/wallet", index: "02" },
  { title: "Mobility", description: "Rides, safety, dispatch and financial orchestration", route: "/app/mobility", index: "03" },
  { title: "Business", description: "Enterprise and merchant tools", route: "/app/vendor", index: "04" },
];

type DashboardMetrics = {
  activeUsers: number;
  completedTransactions: number;
  revenueMinor: string;
  revenueCurrency: string;
  activeMarkets: number;
};

export default function ExecutiveDashboard() {
  const { user, authorization, loading } = useAuth();
  const displayName = user?.profile?.displayName || user?.name || "MARKA user";
  const primaryRole = authorization.roles[0] || user?.role || "CUSTOMER";
  const [metrics, setMetrics] = useState<DashboardMetrics>();

  useEffect(() => {
    if (loading) return;
    fetch("/api/dashboard/summary", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((data) => setMetrics(data?.metrics))
      .catch((error) => console.error("[DASHBOARD_METRICS_ERROR]", error));
  }, [loading]);

  const formatMoney = (minor: string, currency: string) => {
    const value = Number(minor) / 100;
    return `${currency} ${value.toLocaleString("pt-AO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <FadeIn>
      <div className="space-y-12">
        <section className="relative overflow-hidden border-b border-[var(--theme-border)] pb-10 pt-2 sm:pb-12 lg:pb-14">
          <div className="relative max-w-5xl">
            <p className="marka-kicker">MARKA · Global Digital Economy</p>
            <h1 className="marka-editorial mt-5 text-5xl leading-[0.98] text-[var(--theme-text)] sm:text-6xl lg:text-7xl">
              Tudo o que importa,<br className="hidden sm:block" /> num só lugar.
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--theme-text-muted)] sm:text-base">
              Olá, {displayName}. Esta é a tua visão central da experiência MARKA — comércio, mobilidade, serviços e infraestrutura financeira.
            </p>
          </div>

          <div className="relative mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link
              href="/app/mobility"
              className="group inline-flex items-center gap-3 border-b border-[var(--theme-text)] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text)] transition-opacity hover:opacity-65"
            >
              Abrir Mobility
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
              {primaryRole}
            </span>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-accent-strong)]" />
              Plataforma operacional
            </span>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between gap-5">
            <div>
              <p className="marka-kicker">Visão geral</p>
              <h2 className="marka-editorial mt-2 text-3xl text-[var(--theme-text)]">Agora</h2>
            </div>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)] sm:block">Indicadores da plataforma</span>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-border)] sm:grid-cols-2 xl:grid-cols-4">
            <FadeIn><PremiumCard className="rounded-none border-0 bg-[var(--theme-surface)]"><MetricDisplay label="Utilizadores ativos" value={metrics ? metrics.activeUsers.toLocaleString("pt-AO") : "—"} /></PremiumCard></FadeIn>
            <FadeIn><PremiumCard className="rounded-none border-0 bg-[var(--theme-surface)]"><MetricDisplay label="Transações" value={metrics ? metrics.completedTransactions.toLocaleString("pt-AO") : "—"} /></PremiumCard></FadeIn>
            <FadeIn><PremiumCard className="rounded-none border-0 bg-[var(--theme-surface)]"><MetricDisplay label="Receita" value={metrics ? formatMoney(metrics.revenueMinor, metrics.revenueCurrency) : "—"} /></PremiumCard></FadeIn>
            <FadeIn><PremiumCard className="rounded-none border-0 bg-[var(--theme-surface)]"><MetricDisplay label="Mercados" value={metrics ? metrics.activeMarkets.toLocaleString("pt-AO") : "—"} /></PremiumCard></FadeIn>
          </div>
        </section>

        <section>
          <div className="mb-6">
            <p className="marka-kicker">Experiências MARKA</p>
            <h2 className="marka-editorial mt-2 text-3xl text-[var(--theme-text)]">Escolher uma experiência</h2>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-border)] md:grid-cols-2">
            {ecosystem.map((item) => (
              <Link
                key={item.title}
                href={item.route}
                className="group relative min-h-[190px] bg-[var(--theme-surface)] p-7 transition-colors duration-300 hover:bg-[var(--theme-surface-strong)] sm:p-8"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[9px] tracking-[0.24em] text-[var(--theme-text-faint)]">{item.index}</span>
                  <span className="text-lg text-[var(--theme-text-faint)] transition-transform duration-300 group-hover:translate-x-1">↗</span>
                </div>
                <div className="mt-12 max-w-sm">
                  <h3 className="marka-editorial text-2xl text-[var(--theme-text)]">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-[var(--theme-text-muted)]">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[var(--theme-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">African born · Globally built</p>
          <div className="flex flex-col gap-1 text-right">
            <p className="text-[10px] text-[var(--theme-text-faint)]">MARKA Global Digital Economy</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">Powered By Magestade Pura Digital</p>
          </div>
        </footer>
      </div>
    </FadeIn>
  );

}
