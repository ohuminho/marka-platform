"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED";
type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organizationName: string | null;
  leadType: string;
  message: string | null;
  status: LeadStatus;
  internalNotes: string | null;
  createdAt: string;
};

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "Novo" },
  { value: "CONTACTED", label: "Contactado" },
  { value: "QUALIFIED", label: "Qualificado" },
  { value: "CONVERTED", label: "Convertido" },
  { value: "DISQUALIFIED", label: "Não qualificado" },
];

const leadTypeLabels: Record<string, string> = {
  ADVERTISER: "Publicidade",
  MERCHANT: "Comércio / vendedor",
  LOGISTICS: "Logística / entregas",
  SUPPLIER: "Fornecedor",
  SERVICE_PROVIDER: "Prestador de serviços",
  STRATEGIC_PARTNER: "Parceria estratégica",
  OTHER: "Outro",
};

export default function AdminCommercialLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("NEW");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/admin/commercial-leads?status=" + encodeURIComponent(filter),
        { cache: "no-store" },
      );
      if (response.status === 401 || response.status === 403) {
        throw new Error("Esta área está reservada à administração autorizada.");
      }
      if (!response.ok) throw new Error("Não foi possível carregar os contactos comerciais.");
      const result = await response.json() as { leads: Lead[] };
      setLeads(result.leads);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  }

  async function save(lead: Lead) {
    setSavingId(lead.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/commercial-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          status: lead.status,
          internalNotes: lead.internalNotes ?? "",
        }),
      });
      if (!response.ok) throw new Error("Não foi possível guardar as alterações.");
      setNotice("Pedido comercial actualizado.");
      if (filter !== "ALL" && filter !== lead.status) {
        setLeads((current) => current.filter((item) => item.id !== lead.id));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao guardar.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <DynamicBackground>
      <AppShell>
        <main className="space-y-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text)]/30">Administration · Growth</p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Commercial Leads</h1>
              <p className="mt-2 text-sm text-[var(--theme-text)]/45">Pedidos persistentes de anunciantes, comerciantes, fornecedores e parceiros.</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/app/admin" className="text-xs text-[var(--theme-text)]/55 underline underline-offset-4">Admin Center</Link>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs text-[var(--theme-text)]">
                <option value="NEW">Novos</option>
                <option value="CONTACTED">Contactados</option>
                <option value="QUALIFIED">Qualificados</option>
                <option value="CONVERTED">Convertidos</option>
                <option value="DISQUALIFIED">Não qualificados</option>
                <option value="ALL">Todos</option>
              </select>
              <button type="button" onClick={() => void load()} disabled={loading} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text)] disabled:opacity-50">Actualizar</button>
            </div>
          </header>

          {error ? <p role="alert" className="rounded-xl border border-rose-400/30 p-4 text-sm text-rose-400">{error}</p> : null}
          {notice ? <p role="status" className="rounded-xl border border-[var(--theme-border)] p-4 text-sm text-[var(--theme-text)]">{notice}</p> : null}
          {loading ? <p className="rounded-2xl border border-[var(--theme-border)] p-6 text-sm text-[var(--theme-text)]/50">A carregar pedidos comerciais…</p>
            : leads.length === 0 ? <p className="rounded-2xl border border-[var(--theme-border)] p-6 text-sm text-[var(--theme-text)]/50">Não existem pedidos neste filtro.</p>
            : <section className="grid gap-4">
              {leads.map((lead) => (
                <article key={lead.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.035] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--theme-text)]">{lead.name}</h2>
                      <p className="mt-1 text-xs text-[var(--theme-text)]/45">{lead.organizationName || "Sem organização"} · {leadTypeLabels[lead.leadType] || lead.leadType}</p>
                      <p className="mt-2 text-sm text-[var(--theme-text)]">{lead.email || "Sem e-mail"} · {lead.phone || "Sem telefone"}</p>
                      <p className="mt-1 text-[11px] text-[var(--theme-text)]/35">{new Date(lead.createdAt).toLocaleString("pt-AO")}</p>
                    </div>
                    <select aria-label={"Estado de " + lead.name} value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value as LeadStatus })} className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs text-[var(--theme-text)]">
                      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  {lead.message ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--theme-text)]/75">{lead.message}</p> : null}
                  <label className="mt-5 block text-xs text-[var(--theme-text)]/50">
                    Notas internas
                    <textarea value={lead.internalNotes || ""} onChange={(event) => updateLead(lead.id, { internalNotes: event.target.value })} maxLength={5000} rows={2} className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-sm text-[var(--theme-text)]" />
                  </label>
                  <div className="mt-4 flex justify-end">
                    <button type="button" onClick={() => void save(lead)} disabled={savingId === lead.id} className="rounded-full bg-[var(--theme-text)] px-5 py-2.5 text-xs font-semibold text-[var(--theme-background)] disabled:opacity-50">
                      {savingId === lead.id ? "A guardar…" : "Guardar alterações"}
                    </button>
                  </div>
                </article>
              ))}
            </section>}
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
