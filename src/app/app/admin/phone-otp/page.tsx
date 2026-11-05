"use client";

import { useEffect, useState } from "react";

import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

type UsageSummary = {
  period: { startsAt: string; endsAt: string; currency: string };
  budget: {
    monthlyLimitAoa: number;
    spendAoa: number;
    remainingAoa: number;
    usagePercent: number;
    alertsReached: number[];
    circuitBreakerOpen: boolean;
    costCoverageComplete: boolean;
    recordsMissingCost: number;
  };
  delivery: {
    total: number;
    requested: number;
    acceptedByProvider: number;
    delivered: number;
    rejected: number;
    failed: number;
    unknown: number;
    deliveryRatePercent: number | null;
    byStatus: Array<{ status: string; count: number; spendAoa: number }>;
  };
  byCountry: Array<{ countryCode: string; count: number; spendAoa: number }>;
  provider: {
    name: string;
    smsOnly: boolean;
    enabled: boolean;
    credentialsConfigured: boolean;
    balanceAvailable: boolean;
    balanceAoa: number | null;
    note: string;
  };
};

const money = (value: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(value);

export default function PhoneOtpAdminPage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/admin/phone-otp/usage", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "Acesso reservado ao Super Admin."
              : "Não foi possível carregar os dados de SMS."
          );
        }
        const payload = (await response.json()) as UsageSummary;
        setData(payload);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Erro inesperado.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const progress = Math.min(100, data?.budget.usagePercent ?? 0);

  return (
    <DynamicBackground>
      <AppShell>
        <main className="mx-auto max-w-7xl space-y-7">
          <header className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/40">
              MARKA / Super Admin / Communications
            </p>
            <h1 className="text-3xl font-semibold text-[var(--theme-text)]">
              SMS & OTP Control
            </h1>
            <p className="max-w-2xl text-sm text-[var(--theme-text)]/55">
              Custos, entregas, limites mensais e estado da integração MIMO. O painel não envia mensagens.
            </p>
          </header>

          {loading && (
            <div className="rounded-2xl border border-[var(--theme-border)] p-6 text-sm text-[var(--theme-text)]/60">
              A carregar métricas…
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/5 p-5 text-sm text-red-300">
              {error}
            </div>
          )}

          {data && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                  <p className="text-xs text-[var(--theme-text)]/50">Despesa registada este mês</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--theme-text)]">{money(data.budget.spendAoa)}</p>
                  <p className="mt-2 text-xs text-[var(--theme-text)]/45">Limite: {money(data.budget.monthlyLimitAoa)}</p>
                </article>
                <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                  <p className="text-xs text-[var(--theme-text)]/50">SMS registadas</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--theme-text)]">{data.delivery.total}</p>
                  <p className="mt-2 text-xs text-[var(--theme-text)]/45">{data.delivery.acceptedByProvider} aceites pela API</p>
                </article>
                <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                  <p className="text-xs text-[var(--theme-text)]/50">Entregas confirmadas</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--theme-text)]">{data.delivery.delivered}</p>
                  <p className="mt-2 text-xs text-[var(--theme-text)]/45">
                    {data.delivery.deliveryRatePercent === null
                      ? "Sem dados de entrega"
                      : `${data.delivery.deliveryRatePercent}% das mensagens aceites`}
                  </p>
                </article>
                <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                  <p className="text-xs text-[var(--theme-text)]/50">Saldo MIMO</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--theme-text)]">
                    {data.provider.balanceAvailable && data.provider.balanceAoa !== null
                      ? money(data.provider.balanceAoa)
                      : "Não disponível"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--theme-text)]/45">A aguardar endpoint oficial de saldo</p>
                </article>
              </section>

              <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[var(--theme-text)]">Limite mensal</h2>
                    <p className="mt-1 text-xs text-[var(--theme-text)]/50">
                      {money(data.budget.spendAoa)} de {money(data.budget.monthlyLimitAoa)}
                    </p>
                  </div>
                  <span className={data.budget.circuitBreakerOpen ? "rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300" : "rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs text-[var(--theme-text)]/70"}>
                    {data.budget.circuitBreakerOpen ? "Limite atingido" : `${data.budget.usagePercent}% utilizado`}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--theme-surface-strong)]">
                  <div className="h-full rounded-full bg-[var(--theme-accent)]" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-xs text-[var(--theme-text)]/50">
                  Saldo orçamental estimado: {money(data.budget.remainingAoa)}.
                </p>
                {!data.budget.costCoverageComplete && (
                  <p className="mt-2 text-xs text-amber-400">
                    {data.budget.recordsMissingCost} registo(s) sem custo unitário; a despesa pode estar incompleta.
                  </p>
                )}
                {data.budget.alertsReached.length > 0 && (
                  <p className="mt-2 text-xs text-amber-400">
                    Alertas atingidos: {data.budget.alertsReached.map((value) => `${value}%`).join(", ")}.
                  </p>
                )}
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                  <h2 className="font-semibold text-[var(--theme-text)]">Estado das mensagens</h2>
                  <div className="mt-4 space-y-3">
                    {data.delivery.byStatus.length === 0 && (
                      <p className="text-sm text-[var(--theme-text)]/50">Ainda não existem envios registados.</p>
                    )}
                    {data.delivery.byStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-3 text-sm last:border-0">
                        <span className="text-[var(--theme-text)]/70">{item.status}</span>
                        <span className="text-right text-[var(--theme-text)]">{item.count} · {money(item.spendAoa)}</span>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                  <h2 className="font-semibold text-[var(--theme-text)]">Custo por país</h2>
                  <div className="mt-4 space-y-3">
                    {data.byCountry.length === 0 && (
                      <p className="text-sm text-[var(--theme-text)]/50">Sem dados por país.</p>
                    )}
                    {data.byCountry.map((item) => (
                      <div key={item.countryCode} className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-3 text-sm last:border-0">
                        <span className="text-[var(--theme-text)]/70">{item.countryCode}</span>
                        <span className="text-right text-[var(--theme-text)]">{item.count} · {money(item.spendAoa)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[var(--theme-text)]">MIMO Verify</h2>
                    <p className="mt-1 text-xs text-[var(--theme-text)]/50">{data.provider.note}</p>
                  </div>
                  <span className="rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-300">
                    {data.provider.enabled ? "Ativado por configuração" : "Desativado"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <p className="text-[var(--theme-text)]/70">Canal: SMS apenas</p>
                  <p className="text-[var(--theme-text)]/70">Credenciais: {data.provider.credentialsConfigured ? "Configuradas" : "Em falta"}</p>
                  <p className="text-[var(--theme-text)]/70">Saldo API: {data.provider.balanceAvailable ? "Disponível" : "A aguardar MIMO"}</p>
                </div>
              </section>
            </>
          )}
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
