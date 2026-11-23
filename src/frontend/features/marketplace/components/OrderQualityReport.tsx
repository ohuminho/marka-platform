"use client";

import { useState } from "react";

const reasons = [
  ["ITEM_NOT_AS_DESCRIBED", "Produto diferente da descrição"],
  ["WRONG_OR_MISSING_ITEM", "Produto errado ou em falta"],
  ["DAMAGED_OR_DEFECTIVE", "Produto danificado ou defeituoso"],
  ["QUANTITY_MISMATCH", "Quantidade incorrecta"],
  ["DELIVERY_DISCREPANCY", "Problema com a entrega"],
  ["OTHER", "Outro problema"],
] as const;

export default function OrderQualityReport({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("ITEM_NOT_AS_DESCRIBED");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/quality-report`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível registar o problema.");
      setMessage(data.message || "Problema registado."); setOpen(false); setDetails("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registar o problema.");
    } finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-[var(--theme-border)] p-4">
    <button type="button" onClick={() => { setOpen((value) => !value); setMessage(""); }} className="text-sm font-semibold underline underline-offset-4">Comunicar problema com a encomenda</button>
    {open && <div className="mt-4 space-y-3">
      <label className="block text-xs text-[var(--theme-text)]">O que aconteceu?
        <select value={reason} onChange={(event) => setReason(event.target.value as (typeof reasons)[number][0])} className="mt-2 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm">
          {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-xs text-[var(--theme-text)]">Descrição do problema (opcional)
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1200} rows={4} className="mt-2 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm" placeholder="Explique o que recebeu e em que difere do que foi comprado." />
      </label>
      <p className="text-[11px] leading-5 text-[var(--theme-text)]/50">A MARKA analisará o caso e solicitará resposta ao vendedor. A denúncia não prova, por si só, uma infracção e não gera suspensão automática.</p>
      <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold disabled:opacity-50">{busy ? "A enviar…" : "Enviar comunicação"}</button>
    </div>}
    {message && <p role="status" className="mt-3 text-xs text-[var(--theme-text)]/70">{message}</p>}
  </section>;
}
