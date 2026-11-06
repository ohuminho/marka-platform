"use client";

import { FormEvent, useState } from "react";

export default function StoreClaimForm({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ claimantName: "", claimantPhone: "", claimantEmail: "", businessType: "INDIVIDUAL", reason: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/marketplace/stores/${encodeURIComponent(storeId)}/claim`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar o pedido.");
      setMessage(data.message || "Pedido enviado para análise.");
      setForm({ claimantName: "", claimantPhone: "", claimantEmail: "", businessType: "INDIVIDUAL", reason: "" });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o pedido.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">É o proprietário desta loja?</p><p className="mt-1 text-xs leading-5 text-white/55">Pode solicitar a recuperação da gestão. A titularidade só muda depois de confirmação pela MARKA.</p></div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full border border-[#d9b36a]/50 px-4 py-2 text-xs font-semibold text-[#f2d18e]">{open ? "Fechar" : "Reivindicar loja"}</button>
      </div>
      {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      {open && <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/70">Nome completo<input required minLength={2} maxLength={120} value={form.claimantName} onChange={(e) => setForm({ ...form, claimantName: e.target.value })} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white" /></label>
        <label className="text-xs text-white/70">Telefone de contacto<input required minLength={6} maxLength={40} value={form.claimantPhone} onChange={(e) => setForm({ ...form, claimantPhone: e.target.value })} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white" /></label>
        <label className="text-xs text-white/70">E-mail (opcional)<input type="email" maxLength={160} value={form.claimantEmail} onChange={(e) => setForm({ ...form, claimantEmail: e.target.value })} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white" /></label>
        <label className="text-xs text-white/70">Tipo de titular<select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="mt-1 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-sm text-white"><option value="INDIVIDUAL">Pessoa singular</option><option value="COMPANY">Empresa</option></select></label>
        <label className="text-xs text-white/70 sm:col-span-2">Explique a sua ligação à loja e como pode comprovar que é o proprietário<textarea required minLength={20} maxLength={2000} rows={4} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white" /></label>
        <p className="text-[11px] leading-5 text-white/45 sm:col-span-2">Não envie documentos pessoais por mensagem pública. A equipa MARKA indicará um canal privado para a prova documental, se necessário.</p>
        <button disabled={busy} className="rounded-full bg-[#e4b963] px-5 py-3 text-sm font-bold text-[#17120a] disabled:opacity-50 sm:col-span-2">{busy ? "A enviar…" : "Enviar pedido de reivindicação"}</button>
      </form>}
    </section>
  );
}
