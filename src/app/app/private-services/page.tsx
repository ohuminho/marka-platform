"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/frontend/shell/AppShell";

type Offer = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "SELECTED" | "WITHDRAWN";
  createdAt: string;
  expiresAt: string;
  request: {
    id: string;
    reference: string;
    serviceType: string;
    specialty: string;
    region: string | null;
    status: string;
    createdAt: string;
  };
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const statusLabels: Record<string, string> = {
  PENDING: "A aguardar resposta",
  ACCEPTED: "Aceitaste — aguarda escolha do cliente",
  DECLINED: "Recusado",
  EXPIRED: "Convite expirado",
  SELECTED: "Foste seleccionado",
  WITHDRAWN: "Atribuído a outro profissional",
};

export default function PrivateServicesInboxPage() {
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/private-services/offers", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar os pedidos.");
      setItems(data.items ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = window.setInterval(() => void load(), 15000);
    return () => { window.clearTimeout(initial); window.clearInterval(refresh); };
  }, [load]);

  async function respond(item: Offer, action: "ACCEPT" | "DECLINE") {
    if (busyId) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/private-services/${encodeURIComponent(item.request.id)}/offers/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível responder.");
      setNotice(action === "ACCEPT" ? "Interesse registado. Aguarda a escolha do cliente." : "Convite recusado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao responder ao convite.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[var(--theme-text-faint)]">MARKA · REDE PROFISSIONAL</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-.045em] text-[var(--theme-text)] sm:text-4xl">Pedidos privados</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--theme-text-muted)]">Analisa convites compatíveis com as tuas especialidades e decide se tens disponibilidade para aceitar.</p>
            </div>
            <span className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-[10px] uppercase tracking-[.16em] text-[var(--theme-text-muted)]">{items.filter((item) => item.status === "PENDING").length} por responder</span>
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-600">{notice}</p>}

        {loading ? (
          <div className="rounded-2xl border border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">A carregar convites…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-10 text-center">
            <h2 className="text-lg font-semibold text-[var(--theme-text)]">Ainda não tens convites</h2>
            <p className="mt-2 text-sm text-[var(--theme-text-muted)]">Quando surgir um pedido compatível com o teu perfil verificado, receberás uma notificação nesta conta.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[9px] font-semibold uppercase tracking-[.2em] text-[var(--theme-text-faint)]">{item.request.reference}</span>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${item.status === "PENDING" ? "bg-amber-500/10 text-amber-600" : item.status === "SELECTED" ? "bg-emerald-500/10 text-emerald-600" : "bg-[var(--theme-background)] text-[var(--theme-text-muted)]"}`}>{statusLabels[item.status] ?? item.status}</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Pedido de {item.request.specialty}</h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--theme-text-muted)]">
                  <span>{item.request.serviceType === "LEGAL" ? "Assistência jurídica" : "Apoio psicológico"}</span>
                  {item.request.region && <span>{item.request.region}</span>}
                  <span>Recebido {dateLabel(item.createdAt)}</span>
                </div>
                <p className="mt-3 text-xs text-[var(--theme-text-faint)]">O conteúdo confidencial do caso não é apresentado neste convite.</p>
                {item.status === "PENDING" && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" disabled={busyId === item.id} onClick={() => void respond(item, "DECLINE")} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-5 text-xs font-semibold text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-background)] disabled:opacity-50">Recusar</button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void respond(item, "ACCEPT")} className="min-h-11 rounded-xl bg-[var(--theme-accent)] px-5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50">{busyId === item.id ? "A processar…" : "Aceitar pedido"}</button>
                  </div>
                )}
                {item.status === "SELECTED" && (
                  <Link href={`/app/private-services/${item.request.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--theme-accent)] px-5 text-xs font-semibold text-white">Abrir processo autorizado</Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
