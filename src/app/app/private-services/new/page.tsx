"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/frontend/shell/AppShell";

type Offer = { id: string; status: string; createdAt: string; proposedFeeKz: number | null; proposalAvailability: string | null; proposalApproach: string | null; professional: { publicName: string; region: string | null } };
type ServiceRequest = {
  id: string; reference: string; serviceType: string; specialty: string; title: string;
  summary: string; region: string | null; status: string; createdAt: string; expiresAt: string; offers: Offer[];
};
const specialties = {
  LEGAL: ["Direito de Família", "Direito Civil", "Direito Penal", "Direito Laboral", "Direito Empresarial"],
  PSYCHOLOGY: ["Psicologia Individual", "Psicologia Familiar", "Psicologia de Casal"],
};
const statusLabel: Record<string, string> = {
  SUBMITTED: "Recebido", MATCHING: "À procura de profissionais", OFFERED: "Convites enviados",
  IN_REVIEW: "A aguardar a tua escolha", PROFESSIONAL_SELECTED: "Profissional seleccionado",
  ENGAGED: "Acompanhamento iniciado", CLOSED: "Encerrado", CANCELLED: "Cancelado",
};

export default function PrivateServiceRequestPage() {
  const [serviceType, setServiceType] = useState<"LEGAL" | "PSYCHOLOGY">("LEGAL");
  const [specialty, setSpecialty] = useState(specialties.LEGAL[0]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [region, setRegion] = useState("");
  const [consent, setConsent] = useState(false);
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyOffer, setBusyOffer] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/private-services", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar os teus pedidos.");
      setItems(data.items ?? []);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar pedidos."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function changeType(value: "LEGAL" | "PSYCHOLOGY") {
    setServiceType(value);
    setSpecialty(specialties[value][0]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/private-services", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, specialty, title, summary, region, consent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível submeter o pedido.");
      setNotice("Pedido submetido: " + data.request.reference + ". " + (data.invitedCount ? data.invitedCount + " profissionais foram convidados." : "A MARKA está à procura de profissionais elegíveis."));
      setTitle(""); setSummary(""); setConsent(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao submeter pedido."); }
    finally { setSaving(false); }
  }

  async function selectProfessional(item: ServiceRequest, offer: Offer) {
    setBusyOffer(offer.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/private-services/" + encodeURIComponent(item.id), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SELECT_PROFESSIONAL", offerId: offer.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível seleccionar o profissional.");
      setNotice("Profissional seleccionado. O processo privado foi autorizado.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao seleccionar profissional."); }
    finally { setBusyOffer(""); }
  }

  async function acceptProposal(item: ServiceRequest, offer: Offer) {
    const confirmed = window.confirm(
      "Confirmas a aceitação da proposta de " + offer.professional.publicName +
      " por " + new Intl.NumberFormat("pt-AO").format(offer.proposedFeeKz ?? 0) +
      " Kz? A aceitação fica registada no processo. Não cria, por si só, um contrato jurídico assinado."
    );
    if (!confirmed) return;
    setBusyOffer("accept-" + offer.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/private-services/" + encodeURIComponent(item.id), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT_PROPOSAL" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível aceitar a proposta.");
      setNotice("Proposta aceite. A aceitação e os termos apresentados ficaram registados no processo privado.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao aceitar proposta."); }
    finally { setBusyOffer(""); }
  }

  return <AppShell><main className="mx-auto max-w-5xl space-y-7">
    <header className="rounded-[26px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
      <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[var(--theme-text-faint)]">MARKA · SERVIÇOS PRIVADOS</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-4xl">Encontra apoio profissional com confidencialidade</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Submete o pedido uma única vez. A MARKA encaminha convites a profissionais verificados. Só depois de escolheres um profissional é que o conteúdo completo do caso fica acessível a essa pessoa.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">{notice}</p>}
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div><h2 className="text-lg font-semibold text-[var(--theme-text)]">Novo pedido confidencial</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Evita incluir números de documentos, moradas completas ou outros identificadores no resumo inicial.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Área de apoio</label><select value={serviceType} onChange={(e) => changeType(e.target.value as "LEGAL" | "PSYCHOLOGY")} className="min-h-12 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm text-[var(--theme-text)]"><option value="LEGAL">Assistência jurídica</option><option value="PSYCHOLOGY">Apoio psicológico</option></select></div>
        <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Especialidade</label><select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm text-[var(--theme-text)]">{specialties[serviceType].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      </div>
      <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Título do pedido</label><input required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-4 text-sm text-[var(--theme-text)]" placeholder="Ex.: Preciso de orientação numa questão familiar" /></div>
      <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Resumo confidencial</label><textarea required minLength={20} maxLength={5000} rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-4 text-sm leading-6 text-[var(--theme-text)]" placeholder="Explica a situação e o tipo de apoio de que precisas. O texto completo só será acessível a ti e ao profissional que seleccionares." /></div>
      <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Província / região (opcional)</label><input maxLength={100} value={region} onChange={(e) => setRegion(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-4 text-sm text-[var(--theme-text)]" placeholder="Ex.: Luanda" /></div>
      <label className="flex items-start gap-3 rounded-xl border border-[var(--theme-border)] p-4 text-xs leading-5 text-[var(--theme-text-muted)]"><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>Autorizo expressamente a MARKA a tratar este pedido e a encaminhar os dados mínimos necessários a profissionais verificados da especialidade seleccionada, para que possam manifestar interesse. Compreendo que o resumo completo só será disponibilizado ao profissional que eu escolher.</span></label>
      <p className="text-[11px] leading-5 text-[var(--theme-text-muted)]">A MARKA não é um serviço de emergência nem substitui assistência jurídica ou clínica urgente. Em situação de perigo imediato, procura os serviços de emergência locais.</p>
      <button disabled={saving || !consent} className="min-h-12 rounded-xl bg-[var(--theme-accent)] px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "A encaminhar…" : "Submeter pedido privado"}</button>
    </form>
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[var(--theme-text)]">Os teus pedidos</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Acompanha respostas e escolhe quem irá acompanhar o teu caso.</p></div><button onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text)]">Actualizar</button></div>
      {loading ? <p className="text-sm text-[var(--theme-text-muted)]">A carregar pedidos…</p> : items.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm text-[var(--theme-text-muted)]">Ainda não submeteste pedidos privados.</p> : items.map((item) => {
        const accepted = item.offers.filter((offer) => offer.status === "ACCEPTED");
        return <article key={item.id} className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.2em] text-[var(--theme-text-faint)]">{item.reference} · {item.specialty}</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">{item.title}</h3><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{item.region || "Região não indicada"} · {new Date(item.createdAt).toLocaleString("pt-PT")}</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text-muted)]">{statusLabel[item.status] ?? item.status}</span></div>
          {item.status === "IN_REVIEW" && accepted.length > 0 && <div className="space-y-2 border-t border-[var(--theme-border)] pt-4"><p className="text-xs font-semibold text-[var(--theme-text)]">Profissionais interessados</p>{accepted.map((offer) => <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] p-3"><div><p className="text-sm font-semibold text-[var(--theme-text)]">{offer.professional.publicName}</p><p className="text-xs text-[var(--theme-text-muted)]">{offer.professional.region || "Região não indicada"}</p><p className="mt-2 text-xs text-[var(--theme-text)]">Honorários: <strong>{offer.proposedFeeKz === null ? "Não indicados" : new Intl.NumberFormat("pt-AO").format(offer.proposedFeeKz) + " Kz"}</strong></p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Disponibilidade: {offer.proposalAvailability || "A confirmar"}</p><p className="mt-1 max-w-xl text-xs leading-5 text-[var(--theme-text-muted)]">{offer.proposalApproach || "Sem descrição de abordagem."}</p></div><button disabled={!!busyOffer} onClick={() => void selectProfessional(item, offer)} className="min-h-10 rounded-lg bg-[var(--theme-accent)] px-4 text-xs font-semibold text-white disabled:opacity-50">{busyOffer === offer.id ? "A seleccionar…" : "Seleccionar"}</button></div>)}</div>}
          {item.status === "PROFESSIONAL_SELECTED" && (() => {
            const selected = item.offers.find((offer) => offer.status === "SELECTED");
            return selected ? <div className="space-y-3 border-t border-[var(--theme-border)] pt-4">
              <div><p className="text-xs font-semibold text-[var(--theme-text)]">Proposta do profissional seleccionado</p>
                <p className="mt-2 text-sm font-semibold text-[var(--theme-text)]">{selected.professional.publicName}</p>
                <p className="mt-1 text-xs text-[var(--theme-text-muted)]">Honorários propostos: {selected.proposedFeeKz === null ? "A confirmar" : new Intl.NumberFormat("pt-AO").format(selected.proposedFeeKz) + " Kz"}</p>
                <p className="mt-1 text-xs text-[var(--theme-text-muted)]">Disponibilidade: {selected.proposalAvailability || "A confirmar"}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--theme-text-muted)]">{selected.proposalApproach}</p>
              </div>
              <p className="text-[11px] leading-5 text-[var(--theme-text-muted)]">Ao aceitar, confirmas os honorários, a disponibilidade e a abordagem acima. Este registo não substitui um contrato jurídico assinado nem os termos profissionais aplicáveis.</p>
              <button disabled={!!busyOffer} onClick={() => void acceptProposal(item, selected)} className="min-h-11 rounded-lg bg-[var(--theme-accent)] px-5 text-xs font-semibold text-white disabled:opacity-50">{busyOffer === "accept-" + selected.id ? "A registar aceitação…" : "Aceitar proposta"}</button>
              <a href={"/app/private-services/" + encodeURIComponent(item.id)} className="ml-3 inline-flex min-h-11 items-center rounded-lg border border-[var(--theme-border)] px-4 text-xs font-semibold text-[var(--theme-text)]">Abrir processo</a>
            </div> : <p className="text-xs text-[var(--theme-text-muted)]">A proposta seleccionada está a ser confirmada.</p>;
          })()}
          {item.status === "ENGAGED" ? <div className="space-y-2 border-t border-[var(--theme-border)] pt-4"><p className="text-sm font-semibold text-[var(--theme-text)]">Proposta aceite e registada</p><p className="text-xs leading-5 text-[var(--theme-text-muted)]">A aceitação foi registada no histórico do processo. O contrato jurídico, quando aplicável, deverá ser formalizado directamente entre as partes.</p><a href={"/app/private-services/" + encodeURIComponent(item.id)} className="inline-flex min-h-10 items-center rounded-lg border border-[var(--theme-border)] px-4 text-xs font-semibold text-[var(--theme-text)]">Abrir processo confidencial</a></div> : null}
          {item.status === "IN_REVIEW" && accepted.length === 0 && <p className="border-t border-[var(--theme-border)] pt-4 text-xs text-[var(--theme-text-muted)]">Ainda não há profissionais disponíveis para selecção. Acompanha as actualizações.</p>}
        </article>;
      })}
    </section>
  </main></AppShell>;
}
