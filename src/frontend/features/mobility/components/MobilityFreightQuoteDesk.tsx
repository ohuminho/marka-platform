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
  paymentReference: string | null;
  paidAt: string | null;
  assignedAt: string | null;
  updatedAt: string;
  latestException: { note: string | null; createdAt: string } | null;
  latestExceptionReview: { note: string; reviewedAt: string; reviewedBy: string | null } | null;
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
  return ({
    REQUESTED: "Novo pedido",
    QUOTED: "Cotação emitida",
    AWAITING_PAYMENT: "A aguardar pagamento",
    PAID: "Pagamento confirmado",
    SEARCHING_PROVIDER: "A procurar prestador",
    ASSIGNED: "Prestador atribuído",
    PROVIDER_EN_ROUTE: "Prestador a caminho",
    PROVIDER_ARRIVED: "Prestador chegou",
    PICKED_UP: "Recolha confirmada",
    IN_TRANSIT: "Em transporte",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    EXCEPTION: "Requer intervenção",
  } as Record<string, string>)[value] ?? value.replaceAll("_", " ");
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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
    const interval = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load]);

  const operationalCounts = {
    newRequests: requests.filter((item) => item.status === "REQUESTED").length,
    awaitingPayment: requests.filter((item) => item.status === "AWAITING_PAYMENT").length,
    activeServices: requests.filter((item) => ["PAID", "SEARCHING_PROVIDER", "ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT", "EXCEPTION"].includes(item.status)).length,
    completed: requests.filter((item) => item.status === "COMPLETED").length,
  };

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

  const reviewException = async (requestId: string) => {
    if (!organizationId) return;
    const note = (reviewNotes[requestId] ?? "").trim();
    if (note.length < 5) {
      setError("Registe uma análise com pelo menos cinco caracteres.");
      return;
    }
    setReviewingId(requestId);
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
        body: JSON.stringify({ action: "REVIEW_EXCEPTION", requestId, note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível registar a análise.");
      setReviewNotes((current) => ({ ...current, [requestId]: "" }));
      setNotice("Análise da ocorrência registada no histórico.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registar a análise.");
    } finally {
      setReviewingId(null);
    }
  };

  const resolveException = async (requestId: string) => {
    if (!organizationId) return;
    const note = (resolutionNotes[requestId] ?? "").trim();
    if (note.length < 5) {
      setError("Registe a decisão administrativa com pelo menos cinco caracteres.");
      return;
    }
    setResolvingId(requestId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/freight/admin/requests/${requestId}/resolve-exception`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({ note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível resolver a ocorrência.");
      setResolutionNotes((current) => ({ ...current, [requestId]: "" }));
      setNotice(`Ocorrência resolvida para ${data.request?.reference ?? requestId}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao resolver a ocorrência.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">Freight operations</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Pedidos e cotações</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--theme-text-muted)]">Gira cotações e acompanhe o ciclo operacional. O despacho só é autorizado após confirmação financeira no servidor.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="h-10 rounded-full border border-[var(--theme-border)] px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]">Actualizar</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{notice}</p>}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Novos pedidos", value: operationalCounts.newRequests },
          { label: "A aguardar pagamento", value: operationalCounts.awaitingPayment },
          { label: "Serviços activos", value: operationalCounts.activeServices },
          { label: "Concluídos", value: operationalCounts.completed },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[var(--theme-border)] px-3 py-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--theme-text)]">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">A carregar pedidos…</p>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">Ainda não existem pedidos nesta organização.</p>
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
              {item.status === "AWAITING_PAYMENT" && <p className="mt-4 text-[10px] text-[var(--theme-text-muted)]">Cotação aceite. O despacho permanece bloqueado até confirmação financeira server-side.</p>}
              {item.status === "QUOTED" && quoteActive && <p className="mt-4 text-[10px] text-[var(--theme-text-faint)]">Cotação válida; aguarda decisão do cliente.</p>}
              {item.paidAt && <p className="mt-3 text-[10px] text-[var(--theme-text-muted)]">Pagamento confirmado em {dateTime(item.paidAt)}{item.paymentReference ? ` · Referência: ${item.paymentReference}` : ""}</p>}
              {item.assignedAt && <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">Prestador atribuído em {dateTime(item.assignedAt)}.</p>}
              {item.status === "SEARCHING_PROVIDER" && <p className="mt-3 text-[10px] text-[var(--theme-text-muted)]">Pagamento confirmado; o sistema está a procurar um prestador compatível.</p>}
              {["ASSIGNED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "PICKED_UP", "IN_TRANSIT"].includes(item.status) && <p className="mt-3 text-[10px] text-[var(--theme-text-muted)]">Serviço em execução. Estado actualizado em {dateTime(item.updatedAt)}.</p>}
              {item.status === "COMPLETED" && <p className="mt-3 text-[10px] text-[var(--theme-text-muted)]">Serviço concluído em {dateTime(item.updatedAt)}.</p>}
              {item.status === "EXCEPTION" && (
                <div role="alert" className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--theme-text-muted)]">Ocorrência reportada pelo prestador</p>
                  {item.latestException?.note && <p className="mt-2 text-xs text-[var(--theme-text)]">{item.latestException.note}</p>}
                  {item.latestException?.createdAt && <p className="mt-2 text-[9px] text-[var(--theme-text-faint)]">{dateTime(item.latestException.createdAt)}</p>}
                  {!item.latestException?.note && <p className="mt-2 text-xs text-[var(--theme-text-muted)]">Este serviço requer intervenção operacional.</p>}
                  {item.latestExceptionReview ? (
                    <div className="mt-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--theme-text-muted)]">Última análise administrativa</p>
                      <p className="mt-2 text-xs text-[var(--theme-text)]">{item.latestExceptionReview.note}</p>
                      <p className="mt-2 text-[9px] text-[var(--theme-text-faint)]">{dateTime(item.latestExceptionReview.reviewedAt)}{item.latestExceptionReview.reviewedBy ? ` · ${item.latestExceptionReview.reviewedBy}` : ""}</p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <label htmlFor={`freight-review-${item.id}`} className="block text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--theme-text-muted)]">Análise e instruções operacionais</label>
                      <textarea
                        id={`freight-review-${item.id}`}
                        rows={3}
                        maxLength={2000}
                        value={reviewNotes[item.id] ?? ""}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder="Registe a avaliação e os próximos passos acordados…"
                        className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs text-[var(--theme-text)] outline-none focus:border-[#b89a5b]"
                      />
                      <button type="button" disabled={reviewingId === item.id || (reviewNotes[item.id] ?? "").trim().length < 5} onClick={() => void reviewException(item.id)} className="min-h-10 rounded-lg bg-[#d8c18c] px-4 text-[10px] font-bold text-[#171814] disabled:opacity-50">
                        {reviewingId === item.id ? "A registar…" : "Registar análise"}
                      </button>
                    </div>
                  )}
                  <div className="mt-4 space-y-2 border-t border-amber-500/20 pt-3">
                    <label htmlFor={`freight-resolution-${item.id}`} className="block text-[9px] font-semibold uppercase tracking-[.12em] text-[var(--theme-text-muted)]">Decisão administrativa para retomar</label>
                    <textarea
                      id={`freight-resolution-${item.id}`}
                      rows={2}
                      maxLength={1000}
                      value={resolutionNotes[item.id] ?? ""}
                      onChange={(event) => setResolutionNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="Registe a verificação efectuada e a decisão de retoma…"
                      className="w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs text-[var(--theme-text)] outline-none focus:border-[#b89a5b]"
                    />
                    <button
                      type="button"
                      disabled={resolvingId === item.id || (resolutionNotes[item.id] ?? "").trim().length < 5}
                      onClick={() => void resolveException(item.id)}
                      className="min-h-10 w-full rounded-full bg-[#d8c18c] px-4 text-[9px] font-semibold uppercase tracking-[.12em] text-[#171814] disabled:opacity-50"
                    >
                      {resolvingId === item.id ? "A registar decisão…" : "Aprovar retoma do serviço"}
                    </button>
                    <p className="text-[9px] leading-4 text-[var(--theme-text-faint)]">A retoma só é permitida se o prestador continuar verificado e a viatura atribuída estiver activa. O estado anterior é recuperado do histórico.</p>
                  </div>
                  <p className="mt-3 text-[9px] text-[var(--theme-text-faint)]">A análise fica no histórico. O cancelamento de serviços pagos permanece dependente do processo de reembolso do prestador de pagamentos.</p>
                </div>
              )}
              {item.status === "CANCELLED" && <p className="mt-3 text-[10px] text-[var(--theme-text-muted)]">Pedido cancelado.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
