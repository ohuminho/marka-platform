"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

type Vendor = {
  id: string; name: string; businessType: string | null; phone: string | null; country: string | null;
  status: string; verified: boolean; createdAt: string;
  owner: { id: string; name: string; email: string; phoneVerified: boolean };
  organization: { id: string; name: string };
  store: { id: string; name: string; status: string } | null;
};
type Payload = { vendors?: Vendor[]; message?: string };

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/vendors", { credentials: "include", cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar as candidaturas.");
      setVendors(data.vendors ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as candidaturas.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function decide(vendor: Vendor, status: "ACTIVE" | "SUSPENDED" | "CLOSED") {
    setError(""); setNotice("");
    const reason = status === "ACTIVE" ? undefined : window.prompt(status === "CLOSED" ? "Motivo obrigatório da rejeição:" : "Motivo obrigatório da suspensão:")?.trim();
    if (status !== "ACTIVE" && !reason) { setError("É necessário indicar um motivo."); return; }
    setBusyId(vendor.id);
    try {
      const response = await fetch("/api/admin/vendors", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id, status, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "A decisão não foi guardada.");
      setNotice(data.message || "Estado atualizado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A decisão não foi guardada.");
    } finally { setBusyId(null); }
  }

  const pending = vendors.filter((vendor) => vendor.status === "PENDING");
  return <DynamicBackground><AppShell><main className="space-y-7">
    <RoleContextSummary />
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--theme-text-muted)]">MARKA Marketplace · Trust & Safety</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-4xl">Moderação de lojas</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">Gere restrições, suspensões e reativações por abuso ou atividade proibida. A abertura de lojas e o selo de verificação documental são processos separados.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/app/admin/store-claims" className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Reivindicações de lojas</Link><Link href="/app/admin/compliance" className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Centro de Conformidade</Link><button onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Atualizar</button></div>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs text-[var(--theme-text-muted)]">Pendentes</p><p className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">{pending.length}</p></div>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs text-[var(--theme-text-muted)]">Ativas</p><p className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">{vendors.filter(v => v.status === "ACTIVE").length}</p></div>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"><p className="text-xs text-[var(--theme-text-muted)]">Suspensas / fechadas</p><p className="mt-2 text-2xl font-semibold text-[var(--theme-text)]">{vendors.filter(v => v.status === "SUSPENDED" || v.status === "CLOSED").length}</p></div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-[var(--theme-text)]">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-[var(--theme-text)]">{notice}</p>}
    {loading && <p className="text-sm text-[var(--theme-text-muted)]">A carregar candidaturas…</p>}
    {!loading && vendors.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">Ainda não existem candidaturas de lojas.</div>}
    <section className="space-y-4">{vendors.map((vendor) => <article key={vendor.id} className="space-y-4 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">{vendor.organization.name} · {vendor.businessType === "COMPANY" ? "Empresa" : "Vendedor individual"}</p><h2 className="mt-2 text-xl font-semibold text-[var(--theme-text)]">{vendor.store?.name || vendor.name}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">{vendor.owner.name} · {vendor.owner.email}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{vendor.owner.phoneVerified ? "Telefone confirmado" : "Telefone por confirmar"} · {vendor.verified ? "Identidade/documentação verificada" : "Sem selo de identidade verificada"}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{vendor.phone || "Sem telefone"} · {vendor.country || "País não indicado"}</p><p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">Submetida em {new Date(vendor.createdAt).toLocaleString("pt-PT")}</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs font-semibold text-[var(--theme-text)]">{vendor.status}</span></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-4"><p className="max-w-2xl text-xs leading-5 text-[var(--theme-text-muted)]">{vendor.status === "PENDING" ? "A loja ainda está pendente por um estado legado. A ativação comercial não atribui selo Verified; use a área de Conformidade para rever documentação." : vendor.status === "ACTIVE" ? (vendor.verified ? "Loja ativa. A verificação documental é gerida separadamente." : "Loja aprovada com verificação limitada por revisão humana.") : vendor.status === "SUSPENDED" ? "Loja suspensa." : "Candidatura encerrada/rejeitada."}</p><div className="flex flex-wrap gap-2"><button disabled={busyId !== null || vendor.status === "ACTIVE"} onClick={() => void decide(vendor, "ACTIVE")} className="rounded-xl bg-[var(--theme-text)] px-4 py-3 text-sm font-semibold text-[var(--theme-background)] disabled:cursor-not-allowed disabled:opacity-40">Aprovar e ativar</button><button disabled={busyId !== null || vendor.status === "SUSPENDED"} onClick={() => void decide(vendor, "SUSPENDED")} className="rounded-xl border border-amber-500/40 px-4 py-3 text-sm text-amber-500 disabled:opacity-40">Suspender</button><button disabled={busyId !== null || vendor.status === "CLOSED"} onClick={() => void decide(vendor, "CLOSED")} className="rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-400 disabled:opacity-40">Rejeitar</button></div></div>
    </article>)}</section>
  </main></AppShell></DynamicBackground>;
}
