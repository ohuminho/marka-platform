"use client";

import { useState } from "react";

type Reason = "MISLEADING_DESCRIPTION" | "IMAGE_MISMATCH" | "WRONG_CATEGORY" | "PROHIBITED_OR_ILLEGAL" | "SUSPECTED_COUNTERFEIT" | "OTHER";
const reasons: { value: Reason; label: string }[] = [
  { value: "MISLEADING_DESCRIPTION", label: "Descrição enganosa" },
  { value: "IMAGE_MISMATCH", label: "Fotografia não corresponde ao produto" },
  { value: "WRONG_CATEGORY", label: "Categoria incorrecta" },
  { value: "PROHIBITED_OR_ILLEGAL", label: "Produto proibido ou ilegal" },
  { value: "SUSPECTED_COUNTERFEIT", label: "Suspeita de contrafacção" },
  { value: "OTHER", label: "Outro motivo" },
];

export default function ProductListingReport({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("MISLEADING_DESCRIPTION");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/report`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar a denúncia.");
      setMessage(data.message || "Denúncia enviada."); setOpen(false); setDetails("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar a denúncia."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-xl border border-[var(--theme-border)] p-4">
    <button type="button" onClick={() => { setOpen((value) => !value); setMessage(""); }} className="text-xs font-medium text-[var(--theme-text)]/60 underline underline-offset-4">Denunciar anúncio</button>
    {open && <div className="mt-3 space-y-3">
      <label className="block text-xs text-[var(--theme-text)]">Motivo da denúncia
        <select value={reason} onChange={(event) => setReason(event.target.value as Reason)} className="mt-2 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm">
          {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="block text-xs text-[var(--theme-text)]">Detalhes adicionais (opcional)
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={800} rows={3} className="mt-2 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm" placeholder="Descreva o problema observado, sem incluir dados pessoais." />
      </label>
      <p className="text-[11px] leading-5 text-[var(--theme-text)]/50">A denúncia será analisada pela equipa MARKA. Uma denúncia isolada não remove automaticamente o anúncio nem penaliza o vendedor.</p>
      <button type="button" disabled={busy} onClick={submit} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold disabled:opacity-50">{busy ? "A enviar..." : "Enviar denúncia"}</button>
    </div>}
    {message && <p role="status" className="mt-3 text-xs text-[var(--theme-text)]/70">{message}</p>}
  </section>;
}
