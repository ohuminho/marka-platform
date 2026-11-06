"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

type Claim = {
  id: string; status: string; claimantName: string; claimantPhone: string; claimantEmail: string | null;
  businessType: string; reason: string; decisionNote: string | null; createdAt: string;
  store: { id: string; name: string; vendor: { id: string; ownerId: string; name: string } };
  claimant: { id: string; name: string; email: string; phoneVerified: boolean };
};

export default function AdminStoreClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/store-claims", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar os pedidos.");
      setClaims(Array.isArray(data.claims) ? data.claims : []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar os pedidos.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(claim: Claim, action: "APPROVE" | "REJECT") {
    const decisionNote = window.prompt(action === "APPROVE" ? "Nota interna da transferência (opcional):" : "Motivo da rejeição:")?.trim() || "";
    if (action === "REJECT" && !decisionNote) { setError("Indique o motivo da rejeição."); return; }
    if (action === "APPROVE" && !window.confirm("Confirmou a titularidade por contacto e evidência fora desta página? A gestão da loja será transferida para esta conta.")) return;
    setBusy(claim.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/store-claims", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.id, action, decisionNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível guardar a decisão.");
      setNotice(data.message || "Pedido atualizado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao guardar a decisão.");
    } finally { setBusy(null); }
  }

  const pending = claims.filter((claim) => claim.status === "PENDING");
  return <DynamicBackground><AppShell><main className="space-y-6">
    <RoleContextSummary />
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[var(--theme-text-muted)]">Marketplace · Trust & Safety</p><h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Reivindicações de lojas</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">Confirme a titularidade antes de transferir a gestão. A aprovação deste pedido não atribui selo MARKA Verified.</p></div><div className="flex gap-2"><Link href="/app/admin/vendors" className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm">Gestão de vendedores</Link><button onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm">Atualizar</button></div></header>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs text-[var(--theme-text-muted)]">Por analisar</p><p className="mt-2 text-2xl font-semibold">{pending.length}</p></div><div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs text-[var(--theme-text-muted)]">Aprovados</p><p className="mt-2 text-2xl font-semibold">{claims.filter((claim) => claim.status === "APPROVED").length}</p></div><div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs text-[var(--theme-text-muted)]">Rejeitados</p><p className="mt-2 text-2xl font-semibold">{claims.filter((claim) => claim.status === "REJECTED").length}</p></div></div>
    {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">{notice}</p>}
    {loading && <p className="text-sm text-[var(--theme-text-muted)]">A carregar pedidos…</p>}
    {!loading && !claims.length && <p className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">Ainda não existem pedidos de reivindicação.</p>}
    <section className="space-y-4">{claims.map((claim) => <article key={claim.id} className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.2em] text-[var(--theme-text-muted)]">Loja em disputa</p><Link href={`/loja/${claim.store.id}`} target="_blank" className="mt-1 inline-block text-xl font-semibold underline decoration-[var(--theme-border)] underline-offset-4">{claim.store.name}</Link><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Titular atual: {claim.store.vendor.name}</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs">{claim.status}</span></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[var(--theme-background)] p-4"><p className="text-[9px] uppercase tracking-[.16em] text-[var(--theme-text-muted)]">Requerente</p><p className="mt-2 text-sm font-semibold">{claim.claimantName}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{claim.claimantPhone} · {claim.claimantEmail || claim.claimant.email}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{claim.businessType === "COMPANY" ? "Empresa" : "Pessoa singular"} · {claim.claimant.phoneVerified ? "Telefone confirmado" : "Telefone não confirmado"}</p></div><div className="rounded-xl bg-[var(--theme-background)] p-4"><p className="text-[9px] uppercase tracking-[.16em] text-[var(--theme-text-muted)]">Conta MARKA</p><p className="mt-2 text-sm">{claim.claimant.name}</p><p className="mt-1 break-all text-xs text-[var(--theme-text-muted)]">{claim.claimant.email}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Enviado em {new Date(claim.createdAt).toLocaleString("pt-PT")}</p></div></div>
      <div><p className="text-[9px] uppercase tracking-[.16em] text-[var(--theme-text-muted)]">Declaração de titularidade</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{claim.reason}</p></div>
      {claim.decisionNote && <p className="text-xs text-[var(--theme-text-muted)]">Nota: {claim.decisionNote}</p>}
      {claim.status === "PENDING" && <div className="flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-4"><button disabled={busy === claim.id} onClick={() => void decide(claim, "APPROVE")} className="rounded-full bg-[var(--theme-text)] px-4 py-2 text-xs font-semibold text-[var(--theme-background)] disabled:opacity-50">{busy === claim.id ? "A guardar…" : "Confirmar titularidade e transferir"}</button><button disabled={busy === claim.id} onClick={() => void decide(claim, "REJECT")} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs disabled:opacity-50">Rejeitar</button></div>}
    </article>)}</section>
  </main></AppShell></DynamicBackground>;
}
