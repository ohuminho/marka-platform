"use client";
import { useState } from "react";
type Action = "WARNING" | "SUSPEND" | "REINSTATE";
export default function TrustSanctionActions({ signalId, accountStatus, onComplete }: { signalId: string; accountStatus: string; onComplete: () => Promise<void> | void }) {
  const [action, setAction] = useState<Action>(accountStatus === "SUSPENDED" ? "REINSTATE" : "WARNING");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canSuspend = accountStatus === "ACTIVE";
  const canReinstate = accountStatus === "SUSPENDED";
  async function submit() {
    if (reason.trim().length < 20) { setMessage("Regista uma fundamentação com pelo menos 20 caracteres."); return; }
    if (action === "SUSPEND" && !window.confirm("Confirmas a suspensão imediata e a revogação de todas as sessões desta conta?")) return;
    if (action === "REINSTATE" && !window.confirm("Confirmas a reintegração desta conta?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/trust/sanctions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId, action, reason: reason.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível aplicar a medida.");
      setMessage(action === "WARNING" ? "Advertência registada." : action === "SUSPEND" ? "Conta suspensa e sessões revogadas." : "Conta reintegrada.");
      setReason(""); await onComplete();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao aplicar a medida."); }
    finally { setBusy(false); }
  }
  const selected = "rounded-full border border-current px-3 py-2 text-xs";
  const normal = "rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs";
  return <section className="space-y-3 rounded-xl border border-[var(--theme-border)] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-semibold">Medidas disciplinares</h4><p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">Só após análise humana. A suspensão não expira automaticamente; exige revisão para reintegração.</p></div><span className="text-[10px] text-[var(--theme-text-faint)]">Conta: {accountStatus}</span></div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAction("WARNING")} className={action === "WARNING" ? selected : normal}>Advertência</button>{canSuspend && <button type="button" onClick={() => setAction("SUSPEND")} className={action === "SUSPEND" ? selected : normal}>Suspender conta</button>}{canReinstate && <button type="button" onClick={() => setAction("REINSTATE")} className={action === "REINSTATE" ? selected : normal}>Reintegrar conta</button>}</div>
    <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Fundamentação da decisão (20–1000 caracteres)" className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs" />
    <div className="flex items-center justify-between gap-3">{message && <p role="status" className="text-xs text-[var(--theme-text-muted)]">{message}</p>}<button type="button" disabled={busy || reason.trim().length < 20} onClick={() => void submit()} className="ml-auto rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold disabled:opacity-40">{busy ? "A registar…" : "Registar decisão"}</button></div>
  </section>;
}
