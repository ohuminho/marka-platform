"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrustSanctionActions from "@/frontend/features/trust/components/TrustSanctionActions";

type Signal = {
  id: string;
  userId: string | null;
  type: string;
  score: number;
  status: "OPEN" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  source: string;
  reason: string | null;
  createdAt: string;
  metadata: { productId?: string; productName?: string; orderId?: string; reason?: string; details?: string | null; vendorResponse?: { response: string; createdAt: string; vendorUserId: string | null } | null } | null;
  subject: { id: string; name: string; email: string; role: string; status: string } | null;
  history?: Array<{ status: string; note: string | null; createdAt: string; actor: { id: string; name: string; email: string } | null }>;
};

type Appeal = { id:string; userId:string|null; userName:string; userEmail:string; signalId:string; appealText:string; submittedAt:string; decision:"PENDING"|"ACCEPTED"|"REJECTED"; decisionReason:string|null };
type Metrics = { total: number; open: number; critical: number };
const statusLabels: Record<Signal["status"], string> = {
  OPEN: "Por analisar", REVIEWED: "Em análise", RESOLVED: "Resolvida", DISMISSED: "Descartada",
};
const severityLabel = (score: number) => score >= 80 ? "Crítica" : score >= 60 ? "Alta" : score >= 30 ? "Média" : "Baixa";

export default function TrustCenterPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, open: 0, critical: 0 });
  const [filter, setFilter] = useState("OPEN");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch("/api/admin/trust?" + params.toString(), { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sem acesso ao Centro de Confiança.");
      setSignals(Array.isArray(data.signals) ? data.signals : []);
      setAppeals(Array.isArray(data.appeals) ? data.appeals : []);
      setMetrics(data.metrics || { total: 0, open: 0, critical: 0 });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar ocorrências.");
    }
  }, [search]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);

  const visible = useMemo(() => filter === "ALL" ? signals : signals.filter(item => item.status === filter), [filter, signals]);

  async function decideAppeal(appeal: Appeal, action: "ACCEPT_APPEAL" | "REJECT_APPEAL") {
    const reason = window.prompt("Fundamentação da decisão (mínimo 20 caracteres):");
    if (!reason || reason.trim().length < 20) { setMessage("A decisão exige uma fundamentação com pelo menos 20 caracteres."); return; }
    setBusyId(appeal.id); setMessage("");
    try {
      const response = await fetch("/api/admin/trust/sanctions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId: appeal.signalId, appealEventId: appeal.id, action, reason: reason.trim() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Não foi possível decidir o recurso.");
      setMessage(action === "ACCEPT_APPEAL" ? "Recurso aceite. Conta reintegrada." : "Recurso rejeitado. Conta mantém-se suspensa."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na decisão."); } finally { setBusyId(""); }
  }

  async function updateStatus(id: string, status: Signal["status"]) {
    const decisionNote = status === "RESOLVED" || status === "DISMISSED"
      ? window.prompt(status === "RESOLVED" ? "Justifique a resolução (mínimo 10 caracteres):" : "Justifique o descarte (mínimo 10 caracteres):")
      : undefined;
    if ((status === "RESOLVED" || status === "DISMISSED") && (!decisionNote || decisionNote.trim().length < 10)) {
      setMessage("A decisão exige uma justificação com pelo menos 10 caracteres.");
      return;
    }
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/trust", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(decisionNote ? { decisionNote: decisionNote.trim() } : {}) }),
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
        <div><h2 className="text-xl font-semibold">Recursos de utilizadores</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Acessos verificados por e-mail, decisão humana e histórico auditável.</p></div>
        {appeals.length===0?<div className="rounded-2xl border border-[var(--theme-border)] p-5 text-sm text-[var(--theme-text-muted)]">Não existem recursos submetidos.</div>:appeals.map(appeal=><article key={appeal.id} className="space-y-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{appeal.userName}</h3><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{appeal.userEmail} · {new Date(appeal.submittedAt).toLocaleString("pt-PT")}</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[10px] uppercase">{appeal.decision==="PENDING"?"A aguardar decisão":appeal.decision==="ACCEPTED"?"Aceite":"Rejeitado"}</span></div><p className="whitespace-pre-wrap rounded-xl border border-[var(--theme-border)] p-4 text-sm leading-6">{appeal.appealText}</p><p className="text-[10px] text-[var(--theme-text-faint)]">Ocorrência: {appeal.signalId}</p>{appeal.decision==="PENDING"&&<div className="flex flex-wrap gap-2"><button disabled={busyId===appeal.id} onClick={()=>void decideAppeal(appeal,"ACCEPT_APPEAL")} className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs disabled:opacity-50">Aceitar e reintegrar</button><button disabled={busyId===appeal.id} onClick={()=>void decideAppeal(appeal,"REJECT_APPEAL")} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs disabled:opacity-50">Rejeitar recurso</button></div>}{appeal.decisionReason&&<p className="text-xs text-[var(--theme-text-muted)]">Fundamentação: {appeal.decisionReason}</p>}</article>)}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Fila de ocorrências</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Até 100 ocorrências por consulta, com pesquisa e histórico.</p></div>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar ocorrência ou conta" aria-label="Pesquisar ocorrências" className="min-w-48 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-xs" />
          <select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-xs">
            <option value="OPEN">Por analisar</option><option value="REVIEWED">Em análise</option><option value="RESOLVED">Resolvidas</option><option value="DISMISSED">Descartadas</option><option value="ALL">Todas</option>
          </select>
        </div>
        {visible.length === 0 ? <div className="rounded-2xl border border-[var(--theme-border)] p-7 text-sm text-[var(--theme-text-muted)]">Não existem ocorrências nesta vista.</div> : visible.map(signal => (
          <article key={signal.id} className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{signal.type.replace("CONDUCT_", "").replaceAll("_", " ")}</h3><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase">{severityLabel(signal.score)}</span><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase">{statusLabels[signal.status]}</span></div><p className="mt-2 text-xs text-[var(--theme-text-muted)]">{signal.reason || "Violação bloqueada pela política de conduta."}</p>
                {signal.metadata?.productId && <p className="mt-2 text-xs"><span className="text-[var(--theme-text-faint)]">Anúncio: </span><Link className="underline underline-offset-2" href={`/app/marketplace/products/${encodeURIComponent(signal.metadata.productId)}`}>{signal.metadata.productName || signal.metadata.productId}</Link></p>}
                {signal.metadata?.orderId && <p className="mt-2 text-xs"><span className="text-[var(--theme-text-faint)]">Encomenda: </span><Link className="underline underline-offset-2" href={`/app/orders/${encodeURIComponent(signal.metadata.orderId)}`}>{signal.metadata.orderId}</Link></p>}
                {signal.metadata?.details && <p className="mt-3 rounded-xl border border-[var(--theme-border)] p-3 text-xs leading-5"><span className="font-semibold">Elementos fornecidos pelo denunciante: </span>{signal.metadata.details}</p>}
                {signal.metadata?.vendorResponse && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-5"><p className="font-semibold">Resposta do vendedor · {new Date(signal.metadata.vendorResponse.createdAt).toLocaleString("pt-PT")}</p><p className="mt-2 whitespace-pre-wrap">{signal.metadata.vendorResponse.response}</p></div>}</div>
              <p className="text-[10px] text-[var(--theme-text-faint)]">{new Date(signal.createdAt).toLocaleString("pt-PT")}</p>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <p><span className="text-[var(--theme-text-faint)]">Conta: </span>{signal.subject?.name || "Conta indisponível"}</p>
              <p><span className="text-[var(--theme-text-faint)]">Tipo: </span>{signal.subject?.role || "—"}</p>
              <p><span className="text-[var(--theme-text-faint)]">Canal: </span>{signal.source.replaceAll("_", " ")}</p>
            </div>
            {signal.subject?.email && <p className="text-[11px] text-[var(--theme-text-muted)]">{signal.subject.email}</p>}
            {signal.history && signal.history.length > 0 && <div className="rounded-xl border border-[var(--theme-border)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-text-faint)]">Histórico administrativo</p>
              <ol className="mt-2 space-y-2">{signal.history.map((entry, index) => <li key={index} className="border-l-2 border-[var(--theme-border)] pl-3 text-xs">
                <p className="font-medium">{statusLabels[entry.status as Signal["status"]] || entry.status} · {new Date(entry.createdAt).toLocaleString("pt-PT")}</p>
                <p className="text-[var(--theme-text-muted)]">{entry.actor?.name || entry.actor?.email || "Administrador"}</p>
                {entry.note && <p className="mt-1 whitespace-pre-wrap">{entry.note}</p>}
              </li>)}</ol>
            </div>}
            {signal.status === "REVIEWED" && signal.userId && signal.subject && !signal.subject.role.toUpperCase().includes("ADMIN") && <TrustSanctionActions signalId={signal.id} accountStatus={signal.subject.status} onComplete={load} />}
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
