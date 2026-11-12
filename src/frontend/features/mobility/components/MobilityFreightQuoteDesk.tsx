"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

interface FreightQuoteRequest {
  id: string;
  reference: string;
  requestType: string;
  status: string;
  originAddress: string | null;
  destinationAddress: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  currency: string;
  quotedAmount: number | null;
  quoteExpiresAt: string | null;
  quoteExpired: boolean;
  requester: { name: string | null };
}

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

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MobilityFreightQuoteDesk() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [requests, setRequests] = useState<FreightQuoteRequest[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setRequests([]);
      setError("Selecione uma organização ativa.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/freight/admin/requests", {
        credentials: "include",
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar os pedidos.");
      setRequests(data.requests as FreightQuoteRequest[]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const issueQuote = async (requestId: string) => {
    if (!organizationId) return;
    const amount = Number(amounts[requestId]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Indique um valor de cotação superior a zero.");
      return;
    }
    setSavingId(requestId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/freight/admin/requests", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({ requestId, amount, validityHours: 24 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível emitir a cotação.");
      setNotice(`Cotação emitida para ${requestId}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao emitir cotação.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">Freight operations</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Pedidos e cotações</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--theme-text-muted)]">Emita uma cotação válida por 24 horas. A emissão não confirma pagamento nem autoriza despacho.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="h-10 rounded-full border border-[var(--theme-border)] px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]">Actualizar</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{notice}</p>}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">A carregar pedidos…</p>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">Não existem pedidos pendentes de cotação ou pagamento.</p>
        ) : requests.map((item) => {
          const quoteActive = item.status === "QUOTED" && !item.quoteExpired;
          const canQuote = item.status === "REQUESTED" || (item.status === "QUOTED" && item.quoteExpired);
          return (
            <article key={item.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)]/20 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--theme-text)]">{item.reference}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-[var(--theme-text-faint)]">{label(item.requestType)} · {item.requester.name || "Cliente"}</p>
                </div>
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">{label(item.status)}</span>
              </div>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">Recolha</p>
                  <p className="mt-1 text-[var(--theme-text-muted)]">{item.originAddress || "Não aplicável"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">Destino</p>
                  <p className="mt-1 text-[var(--theme-text-muted)]">{item.destinationAddress || "Não indicado"}</p>
                </div>
              </div>
              {item.quantity !== null && <p className="mt-3 text-[10px] text-[var(--theme-text-faint)]">Quantidade: {item.quantity.toLocaleString("pt-PT")} {item.quantityUnit || ""}</p>}
              {item.quotedAmount !== null && <p className="mt-3 text-sm font-semibold text-[var(--theme-text)]">{money(item.quotedAmount, item.currency)} <span className="text-[10px] font-normal text-[var(--theme-text-faint)]">· cotação actual</span></p>}
              {item.quoteExpiresAt && <p className="mt-1 text-[10px] text-[var(--theme-text-faint)]">Validade até {new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.quoteExpiresAt))}</p>}
              {canQuote && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--theme-border)] px-3 py-2">
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">Valor ({item.currency})</span>
                    <input
                      aria-label={`Valor da cotação ${item.reference}`}
                      type="number"
                      min="1"
                      step="1"
                      inputMode="decimal"
                      value={amounts[item.id] ?? ""}
                      onChange={(event) => setAmounts((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="w-full min-w-0 bg-transparent text-sm text-[var(--theme-text)] outline-none"
                      placeholder="Introduzir valor"
                    />
                  </label>
                  <button type="button" disabled={savingId === item.id} onClick={() => void issueQuote(item.id)} className="h-11 rounded-full bg-[var(--theme-text)] px-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-background)] disabled:opacity-50">
                    {savingId === item.id ? "A guardar…" : "Emitir cotação"}
                  </button>
                </div>
              )}
              {item.status === "AWAITING_PAYMENT" && <p className="mt-4 text-[10px] text-[var(--theme-text-muted)]">Cotação aceite/aguarda pagamento. O despacho permanece bloqueado até confirmação server-side do pagamento.</p>}
              {item.status === "QUOTED" && quoteActive && <p className="mt-4 text-[10px] text-[var(--theme-text-faint)]">Cotação válida; aguarda decisão do cliente.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
