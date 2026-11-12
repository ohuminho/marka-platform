"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type CustomerFreightRequest = {
  id: string;
  reference: string;
  requestType: string;
  status: string;
  currency: string;
  quotedAmount: number | null;
  quoteExpiresAt: string | null;
  createdAt: string;
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString("pt-PT")} ${currency}`;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function serviceLabel(value: string) {
  return ({
    CARGO_SHIPMENT: "Transporte de carga",
    WATER_DELIVERY: "Entrega de água",
    ROADSIDE_ASSISTANCE: "Assistência rodoviária",
  } as Record<string, string>)[value] ?? value;
}

export default function MobilityFreightCustomerQuotes() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [requests, setRequests] = useState<CustomerFreightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setRequests([]);
      setError("Seleccione uma organização activa para consultar os pedidos.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/freight/requests", {
        credentials: "include",
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível consultar os pedidos.");
      setRequests((data.requests as CustomerFreightRequest[]).filter((item) =>
        ["QUOTED", "AWAITING_PAYMENT", "PAID", "SEARCHING_PROVIDER", "ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "COMPLETED", "EXCEPTION"].includes(item.status),
      ));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao consultar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decide = async (requestId: string, decision: "ACCEPT" | "REJECT") => {
    if (!organizationId) return;
    setBusyId(requestId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/freight/requests/${requestId}/quote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível registar a decisão.");
      setNotice(data.message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registar a decisão.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--theme-text-faint)]">Carga · Assistência · Água</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">As minhas cotações</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--theme-text-muted)]">Consulte propostas e decida directamente. Aceitar uma cotação não equivale a pagar nem inicia o despacho.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="h-10 rounded-full border border-[var(--theme-border)] px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]">Actualizar</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{notice}</p>}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="py-6 text-center text-xs text-[var(--theme-text-faint)]">A consultar as suas cotações…</p>
        ) : requests.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--theme-text-faint)]">Ainda não existem cotações ou serviços de carga activos.</p>
        ) : requests.map((item) => {
          const actionable = item.status === "QUOTED" && !!item.quoteExpiresAt && new Date(item.quoteExpiresAt) > new Date();
          return (
            <article key={item.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)]/20 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--theme-text)]">{item.reference}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--theme-text-faint)]">{serviceLabel(item.requestType)}</p>
                </div>
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">{item.status.replaceAll("_", " ")}</span>
              </div>
              {item.quotedAmount !== null && <p className="mt-4 text-lg font-semibold text-[var(--theme-text)]">{money(item.quotedAmount, item.currency)}</p>}
              {item.quoteExpiresAt && <p className="mt-1 text-[10px] text-[var(--theme-text-faint)]">Cotação válida até {formatDate(item.quoteExpiresAt)}</p>}
              {actionable && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busyId === item.id} onClick={() => void decide(item.id, "ACCEPT")} className="min-h-10 rounded-full bg-[var(--theme-text)] px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--theme-background)] disabled:opacity-50">{busyId === item.id ? "A registar…" : "Aceitar cotação"}</button>
                  <button type="button" disabled={busyId === item.id} onClick={() => void decide(item.id, "REJECT")} className="min-h-10 rounded-full border border-[var(--theme-border)] px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--theme-text-muted)] disabled:opacity-50">Rejeitar</button>
                </div>
              )}
              {item.status === "AWAITING_PAYMENT" && <p className="mt-4 text-xs leading-5 text-[var(--theme-text-muted)]">Cotação aceite. O pedido aguarda instruções e confirmação de pagamento. Ainda não foi enviado para os prestadores.</p>}
              {item.status === "QUOTED" && !actionable && <p className="mt-4 text-xs text-[var(--theme-text-muted)]">Esta cotação expirou. Contacte a equipa MARKA para solicitar uma nova proposta.</p>}
              {["PAID", "SEARCHING_PROVIDER", "ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "COMPLETED", "EXCEPTION"].includes(item.status) && <p className="mt-4 text-xs leading-5 text-[var(--theme-text-muted)]">Estado operacional: {item.status.replaceAll("_", " ").toLowerCase()}.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
