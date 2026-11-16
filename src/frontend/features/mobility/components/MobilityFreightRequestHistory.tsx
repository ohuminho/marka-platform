"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type FreightRequest = {
  id: string;
  reference: string;
  requestType: "CARGO_SHIPMENT" | "WATER_DELIVERY" | "ROADSIDE_ASSISTANCE";
  status: string;
  quantity: number | null;
  quantityUnit: string | null;
  currency: string;
  quotedAmount: number | null;
  quoteExpiresAt: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  origin: { address: string | null } | null;
  destination: { address: string | null } | null;
};

const statusLabels: Record<string, string> = {
  REQUESTED: "Recebido · em análise",
  QUOTED: "Cotação disponível",
  AWAITING_PAYMENT: "A aguardar pagamento",
  PAID: "Pagamento confirmado",
  SEARCHING_PROVIDER: "A procurar prestador",
  ASSIGNED: "Prestador atribuído",
  PROVIDER_EN_ROUTE: "Prestador a caminho",
  PROVIDER_ARRIVED: "Prestador chegou",
  PICKED_UP: "Carga recolhida",
  IN_TRANSIT: "Em transporte",
  COMPLETED: "Serviço concluído",
  CANCELLED: "Pedido cancelado",
  EXCEPTION: "A exigir intervenção",
};

const requestLabels: Record<FreightRequest["requestType"], string> = {
  CARGO_SHIPMENT: "Transporte de carga",
  WATER_DELIVERY: "Entrega de água",
  ROADSIDE_ASSISTANCE: "Assistência rodoviária",
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function MobilityFreightRequestHistory() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [requests, setRequests] = useState<FreightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!organizationId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/freight/requests", {
        credentials: "include",
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar os seus pedidos.");
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar os pedidos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh(true);
    }, 20000);
    const onCreated = () => { void refresh(true); };
    window.addEventListener("marka:freight-request-created", onCreated);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("marka:freight-request-created", onCreated);
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, [requests]);

  const decideQuote = async (item: FreightRequest, decision: "ACCEPT" | "REJECT") => {
    if (!organizationId) return;
    setBusyId(item.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/freight/requests/${item.id}/quote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível registar a decisão.");
      await refresh(true);
      setNotice(decision === "ACCEPT"
        ? "Cotação aceite. O pedido permanece pendente até a MARKA disponibilizar e confirmar um canal de pagamento. Não faça transferências fora da plataforma."
        : "Cotação rejeitada. O pedido foi encerrado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registar a decisão.");
    } finally {
      setBusyId(null);
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (!organizationId || !window.confirm("Pretende cancelar este pedido? O cancelamento automático só é permitido antes do pagamento e da atribuição do prestador.")) return;
    setCancellingId(requestId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/freight/requests/${requestId}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível cancelar o pedido.");
      await refresh(true);
      setNotice("Pedido cancelado com sucesso.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao cancelar o pedido.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[#b89a5b]">Acompanhamento</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Os seus pedidos</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">Consulte o estado, reveja cotações e acompanhe a atribuição do prestador.</p>
        </div>
        <button type="button" disabled={refreshing || loading} onClick={() => void refresh(true)} className="min-h-10 rounded-full border border-[var(--theme-border)] px-4 text-xs font-semibold text-[var(--theme-text)] disabled:opacity-50">
          {refreshing ? "A actualizar…" : "Actualizar"}
        </button>
      </div>

      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.04] p-3 text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[.04] p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}

      {loading ? <p className="mt-6 text-sm text-[var(--theme-text-muted)]">A carregar pedidos…</p> : requests.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm text-[var(--theme-text-muted)]">Ainda não existem pedidos nesta organização.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {requests.map((item) => {
            const expiresAt = item.quoteExpiresAt ? new Date(item.quoteExpiresAt) : null;
            const quoteExpired = expiresAt && currentTime !== null ? expiresAt.getTime() <= currentTime : false;
            const canDecide = currentTime !== null && item.status === "QUOTED" && item.quotedAmount !== null && expiresAt !== null && Number.isFinite(expiresAt.getTime()) && !quoteExpired;
            const displayStatus = item.status === "QUOTED" && quoteExpired ? "Cotação expirada" : statusLabels[item.status] ?? item.status.replaceAll("_", " ");
            return (
              <article key={item.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b89a5b]">{requestLabels[item.requestType]}</p>
                    <h3 className="mt-1 text-sm font-semibold text-[var(--theme-text)]">{item.reference}</h3>
                  </div>
                  <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[10px] font-semibold text-[var(--theme-text)]">{displayStatus}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--theme-text-muted)] sm:grid-cols-2">
                  {item.origin?.address && <p><strong className="text-[var(--theme-text)]">Recolha:</strong> {item.origin.address}</p>}
                  {item.destination?.address && <p><strong className="text-[var(--theme-text)]">Destino:</strong> {item.destination.address}</p>}
                  {item.quantity !== null && <p><strong className="text-[var(--theme-text)]">Quantidade:</strong> {item.quantity} {item.quantityUnit}</p>}
                  <p><strong className="text-[var(--theme-text)]">Criado:</strong> {new Intl.DateTimeFormat("pt-AO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
                </div>

                {item.quotedAmount !== null && (
                  <div className="mt-4 rounded-xl border border-[#b89a5b]/25 bg-[#b89a5b]/[.06] p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#a18449]">Cotação MARKA</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-[var(--theme-text)]">{money(item.quotedAmount, item.currency)}</p>
                    {expiresAt && <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">{quoteExpired ? "Cotação expirada" : `Válida até ${new Intl.DateTimeFormat("pt-AO", { dateStyle: "medium", timeStyle: "short" }).format(expiresAt)}`}</p>}
                  </div>
                )}

                {item.status === "QUOTED" && quoteExpired && <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">Esta cotação expirou. Aguarde uma nova cotação da equipa MARKA.</p>}

                {canDecide && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={busyId === item.id} onClick={() => void decideQuote(item, "ACCEPT")} className="min-h-11 flex-1 rounded-xl bg-[#d8c18c] px-4 text-xs font-bold text-[#171814] disabled:opacity-50">{busyId === item.id ? "A registar…" : "Aceitar cotação"}</button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void decideQuote(item, "REJECT")} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 text-xs font-semibold text-[var(--theme-text)] disabled:opacity-50">Rejeitar</button>
                  </div>
                )}

                {item.status === "AWAITING_PAYMENT" && <p className="mt-3 text-[11px] leading-5 text-amber-700 dark:text-amber-300">Cotação aceite. O pedido permanece pendente até a MARKA disponibilizar e confirmar um canal de pagamento. Não faça transferências para contas pessoais.</p>}
                {item.status === "PAID" || item.status === "SEARCHING_PROVIDER" ? <p className="mt-3 text-[11px] text-[var(--theme-text-muted)]">O pagamento está registado. A atribuição do prestador está em preparação.</p> : null}
                {item.status === "COMPLETED" && <p className="mt-3 text-[11px] text-emerald-700 dark:text-emerald-300">Serviço concluído.</p>}
                {["REQUESTED", "QUOTED", "AWAITING_PAYMENT"].includes(item.status) && !item.paidAt && (
                  <button
                    type="button"
                    disabled={cancellingId === item.id || busyId === item.id}
                    onClick={() => void cancelRequest(item.id)}
                    className="mt-4 min-h-10 rounded-full border border-rose-500/25 px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-700 disabled:opacity-50 dark:text-rose-300"
                  >
                    {cancellingId === item.id ? "A cancelar…" : "Cancelar pedido"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
