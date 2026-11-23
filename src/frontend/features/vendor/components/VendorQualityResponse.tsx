"use client";

import { useState } from "react";

export default function VendorQualityResponse({ orderId, organizationId }: { orderId: string; organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/vendor/sales/${encodeURIComponent(orderId)}/quality-response`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, response: responseText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar a resposta.");
      setMessage(data.message || "Resposta registada."); setOpen(false); setResponseText("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a resposta.");
    } finally { setBusy(false); }
  }
  return <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
    <p className="text-xs leading-5 text-[var(--theme-text)]/70">Se existir uma ocorrência aberta sobre esta encomenda, pode apresentar a sua versão dos factos à equipa MARKA.</p>
    <button type="button" onClick={() => { setOpen(value => !value); setMessage(""); }} className="mt-2 text-xs font-semibold underline underline-offset-4">Responder a uma ocorrência</button>
    {open && <div className="mt-3 space-y-2">
      <textarea value={responseText} onChange={event => setResponseText(event.target.value)} maxLength={2000} rows={4} placeholder="Explique os factos e os passos que tomou para resolver a situação (mínimo 20 caracteres)." className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-sm" />
      <button type="button" disabled={busy || responseText.trim().length < 20} onClick={() => void submit()} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold disabled:opacity-40">{busy ? "A enviar…" : "Enviar resposta"}</button>
    </div>}
    {message && <p role="status" className="mt-2 text-xs text-[var(--theme-text)]/70">{message}</p>}
  </div>;
}
