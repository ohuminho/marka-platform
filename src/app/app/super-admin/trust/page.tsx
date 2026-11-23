"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Signal = {
  id: string;
  userId: string | null;
  type: string;
  score: number;
  status: "OPEN" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  source: string;
  reason: string | null;
  createdAt: string;
  metadata: { productId?: string; productName?: string; reason?: string } | null;
  subject: { id: string; name: string; email: string; role: string; status: string } | null;
};

type Metrics = { total: number; open: number; critical: number };
const statusLabels: Record<Signal["status"], string> = {
  OPEN: "Por analisar", REVIEWED: "Em análise", RESOLVED: "Resolvida", DISMISSED: "Descartada",
};
const severityLabel = (score: number) => score >= 80 ? "Crítica" : score >= 60 ? "Alta" : score >= 30 ? "Média" : "Baixa";

export default function TrustCenterPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, open: 0, critical: 0 });
  const [filter, setFilter] = useState("OPEN");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/trust", { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sem acesso ao Centro de Confiança.");
      setSignals(Array.isArray(data.signals) ? data.signals : []);
      setMetrics(data.metrics || { total: 0, open: 0, critical: 0 });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar ocorrências.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);

  const visible = useMemo(() => filter === "ALL" ? signals : signals.filter(item => item.status === filter), [filter, signals]);

  async function updateStatus(id: string, status: Signal["status"]) {
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/trust", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível actualizar a ocorrência.");
      setMessage("Estado actualizado e decisão registada no histórico administrativo.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao actualizar ocorrência.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 p-5 text-[var(--theme-text)] sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">MARKA · Trust & Safety</p>
          <h1 className="marka-editorial mt-2 text-4xl sm:text-5xl">Centro de Confiança</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Analisa violações bloqueadas, acompanha reincidências e regista decisões administrativas. O conteúdo das mensagens não é apresentado nesta área.</p>
        </div>
        <Link href="/app/super-admin" className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">Voltar ao controlo global</Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Indicadores de confiança">
        {[
          { label: "Ocorrências registadas", value: metrics.total },
          { label: "A aguardar análise", value: metrics.open },
          { label: "Críticas em aberto", value: metrics.critical },
        ].map(item => <article key={item.label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">{item.label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{item.value.toLocaleString("pt-PT")}</p></article>)}
      </section>

      {message && <p role="status" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm">{message}</p>}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Fila de ocorrências</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Últimas 100 ocorrências de conduta.</p></div>
          <select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-xs">
            <option value="OPEN">Por analisar</option><option value="REVIEWED">Em análise</option><option value="RESOLVED">Resolvidas</option><option value="DISMISSED">Descartadas</option><option value="ALL">Todas</option>
          </select>
        </div>
        {visible.length === 0 ? <div className="rounded-2xl border border-[var(--theme-border)] p-7 text-sm text-[var(--theme-text-muted)]">Não existem ocorrências nesta vista.</div> : visible.map(signal => (
          <article key={signal.id} className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{signal.type.replace("CONDUCT_", "").replaceAll("_", " ")}</h3><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase">{severityLabel(signal.score)}</span><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase">{statusLabels[signal.status]}</span></div><p className="mt-2 text-xs text-[var(--theme-text-muted)]">{signal.reason || "Violação bloqueada pela política de conduta."}</p>
                {signal.metadata?.productId && <p className="mt-2 text-xs"><span className="text-[var(--theme-text-faint)]">Anúncio: </span><Link className="underline underline-offset-2" href={`/app/marketplace/products/${encodeURIComponent(signal.metadata.productId)}`}>{signal.metadata.productName || signal.metadata.productId}</Link></p>}</div>
              <p className="text-[10px] text-[var(--theme-text-faint)]">{new Date(signal.createdAt).toLocaleString("pt-PT")}</p>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <p><span className="text-[var(--theme-text-faint)]">Conta: </span>{signal.subject?.name || "Conta indisponível"}</p>
              <p><span className="text-[var(--theme-text-faint)]">Tipo: </span>{signal.subject?.role || "—"}</p>
              <p><span className="text-[var(--theme-text-faint)]">Canal: </span>{signal.source.replaceAll("_", " ")}</p>
            </div>
            {signal.subject?.email && <p className="text-[11px] text-[var(--theme-text-muted)]">{signal.subject.email}</p>}
            <div className="flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-3">
              {signal.status === "OPEN" && <button disabled={busyId === signal.id} onClick={() => void updateStatus(signal.id, "REVIEWED")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs disabled:opacity-50">Iniciar análise</button>}
              {(signal.status === "OPEN" || signal.status === "REVIEWED") && <><button disabled={busyId === signal.id} onClick={() => void updateStatus(signal.id, "RESOLVED")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs disabled:opacity-50">Marcar resolvida</button><button disabled={busyId === signal.id} onClick={() => void updateStatus(signal.id, "DISMISSED")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs disabled:opacity-50">Descartar ocorrência</button></>}
              {signal.status !== "OPEN" && signal.status !== "REVIEWED" && <button disabled={busyId === signal.id} onClick={() => void updateStatus(signal.id, "OPEN")} className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs disabled:opacity-50">Reabrir</button>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
