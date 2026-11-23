"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Campaign = {
  id: string;
  advertiserName: string;
  headline: string;
  placement: string;
  creativeType: string;
  status: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  startsAt?: string | null;
  endsAt?: string | null;
  maxImpressions?: number | null;
};

const placements = [
  ["MOBILITY_TRIP", "Mobility · viagem em curso"],
  ["MARKETPLACE_FEED", "Marketplace · descoberta"],
  ["MARKETPLACE_PRODUCT", "Marketplace · produto"],
  ["COMMUNITY_FEED", "Comunidade"],
];

export default function AdvertisingAdminPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [advertiserName, setAdvertiserName] = useState("");
  const [headline, setHeadline] = useState("");
  const [placement, setPlacement] = useState("MARKETPLACE_FEED");
  const [creativeType, setCreativeType] = useState("VIDEO");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxImpressions, setMaxImpressions] = useState("");

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/advertising", { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sem acesso à gestão publicitária.");
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar campanhas.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCampaigns(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCampaigns]);

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/advertising", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiserName, headline, description, placement, creativeType,
          creativeUrl: creativeUrl || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          destinationUrl: destinationUrl || undefined,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          maxImpressions: maxImpressions ? Number(maxImpressions) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível criar a campanha.");
      setMessage("Campanha criada e enviada para revisão. Só será distribuída depois de aprovada.");
      setAdvertiserName("");
      setHeadline("");
      setDescription("");
      setCreativeUrl("");
      setThumbnailUrl("");
      setDestinationUrl("");
      setStartsAt("");
      setEndsAt("");
      setMaxImpressions("");
      await loadCampaigns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar campanha.");
    } finally {
      setBusy(false);
    }
  }

  const approvedCount = campaigns.filter((campaign) => campaign.status === "APPROVED").length;
  const pendingCount = campaigns.filter((campaign) => campaign.status === "PENDING_REVIEW").length;
  const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  async function updateStatus(id: string, status: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/advertising", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível atualizar a campanha.");
      setMessage("Estado da campanha atualizado.");
      await loadCampaigns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar campanha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-5 text-[var(--theme-text)] sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">MARKA · Ads & Commerce</p>
          <h1 className="marka-editorial mt-2 text-4xl sm:text-5xl">Gestão de campanhas</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Controle campanhas, distribuição, calendário e limites de entrega. Toda a campanha externa começa pendente e só entra no inventário depois de aprovação.</p>
        </div>
        <Link href="/app/super-admin" className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">Voltar ao controlo global</Link>
      </header>

      <section aria-label="Resumo de desempenho publicitário" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Campanhas activas", value: approvedCount.toLocaleString("pt-PT"), detail: "Aprovadas para distribuição" },
          { label: "A aguardar revisão", value: pendingCount.toLocaleString("pt-PT"), detail: "Exigem decisão administrativa" },
          { label: "Impressões registadas", value: totalImpressions.toLocaleString("pt-PT"), detail: "Eventos deduplicados por utilizador/dia" },
          { label: "Taxa de clique", value: `${overallCtr.toFixed(2)}%`, detail: `${totalClicks.toLocaleString("pt-PT")} cliques registados` },
        ].map((metric) => <article key={metric.label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">{metric.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{metric.value}</p><p className="mt-2 text-[11px] text-[var(--theme-text-muted)]">{metric.detail}</p></article>)}
      </section>

      {message && <p role="status" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm">{message}</p>}

      <form onSubmit={createCampaign} className="grid gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2"><h2 className="text-xl font-semibold">Nova campanha</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">A criação não ativa automaticamente os anúncios.</p></div>
        <label className="space-y-2 text-xs"><span>Nome do anunciante *</span><input required minLength={2} maxLength={120} value={advertiserName} onChange={e => setAdvertiserName(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="Ex.: Empresa anunciante" /></label>
        <label className="space-y-2 text-xs"><span>Título do anúncio *</span><input required minLength={3} maxLength={160} value={headline} onChange={e => setHeadline(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="Oferta ou mensagem principal" /></label>
        <label className="space-y-2 text-xs"><span>Posicionamento *</span><select value={placement} onChange={e => setPlacement(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3">{placements.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="space-y-2 text-xs"><span>Formato *</span><select value={creativeType} onChange={e => setCreativeType(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3"><option value="VIDEO">Vídeo</option><option value="IMAGE">Imagem</option><option value="NATIVE">Nativo</option></select></label>
        <label className="space-y-2 text-xs sm:col-span-2"><span>URL da imagem/vídeo {creativeType !== "NATIVE" ? "*" : "(opcional)"}</span><input type="url" required={creativeType !== "NATIVE"} value={creativeUrl} onChange={e => setCreativeUrl(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="https://..." /></label>
        <label className="space-y-2 text-xs"><span>URL da miniatura (opcional)</span><input type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="https://..." /></label>
        <label className="space-y-2 text-xs"><span>Destino do clique (opcional)</span><input type="url" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="https://..." /></label>
        <div className="sm:col-span-2 mt-2 border-t border-[var(--theme-border)] pt-4"><h3 className="text-sm font-semibold">Programação e controlo de entrega</h3><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Defina a janela da campanha e, se necessário, um limite de impressões. Campos vazios significam sem limite configurado.</p></div>
        <label className="space-y-2 text-xs"><span>Início da campanha</span><input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" /></label>
        <label className="space-y-2 text-xs"><span>Fim da campanha</span><input type="datetime-local" min={startsAt || undefined} value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" /></label>
        <label className="space-y-2 text-xs"><span>Limite de impressões</span><input type="number" min={1} max={100000000} step={1} value={maxImpressions} onChange={e => setMaxImpressions(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="Ex.: 25000" /></label>
        <label className="space-y-2 text-xs sm:col-span-2"><span>Descrição (opcional)</span><textarea maxLength={1000} rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="Detalhes curtos e transparentes da oferta" /></label>
        <div className="sm:col-span-2"><button disabled={busy} className="rounded-full bg-[var(--theme-text)] px-6 py-3 text-xs font-semibold text-[var(--theme-background)] disabled:opacity-50">{busy ? "A processar..." : "Criar campanha para revisão"}</button></div>
      </form>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Campanhas registadas</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">A distribuição respeita aprovação, período e limite de impressões. Os indicadores apresentados são eventos registados, não estimativas de alcance.</p></div>
        {campaigns.length === 0 ? <div className="rounded-2xl border border-[var(--theme-border)] p-6 text-sm text-[var(--theme-text-muted)]">Nenhuma campanha disponível ou acesso à API indisponível.</div> : campaigns.map(campaign => (
          <article key={campaign.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{campaign.headline}</h3><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase tracking-wider">{campaign.status}</span></div><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{campaign.advertiserName} · {campaign.placement} · {campaign.creativeType}</p><p className="mt-2 text-[10px] text-[var(--theme-text-faint)]">{campaign.impressions} impressões · {campaign.clicks} cliques · CTR {campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : "0.00"}%{campaign.maxImpressions ? ` · limite ${campaign.maxImpressions.toLocaleString("pt-PT")}` : ""}</p><p className="mt-1 text-[10px] text-[var(--theme-text-faint)]">Início: {campaign.startsAt ? new Date(campaign.startsAt).toLocaleString("pt-PT") : "Imediato"} · Fim: {campaign.endsAt ? new Date(campaign.endsAt).toLocaleString("pt-PT") : "Sem data definida"}</p></div>
            <div className="flex shrink-0 flex-wrap gap-2">{campaign.status !== "APPROVED" && campaign.status !== "ENDED" && <button disabled={busy} onClick={() => void updateStatus(campaign.id, "APPROVED")} className="rounded-full border border-emerald-500/40 px-3 py-2 text-xs">Aprovar</button>}{campaign.status !== "PAUSED" && campaign.status !== "ENDED" && <button disabled={busy} onClick={() => void updateStatus(campaign.id, "PAUSED")} className="rounded-full border border-amber-500/40 px-3 py-2 text-xs">Pausar</button>}{campaign.status !== "REJECTED" && campaign.status !== "ENDED" && <button disabled={busy} onClick={() => void updateStatus(campaign.id, "REJECTED")} className="rounded-full border border-red-500/40 px-3 py-2 text-xs">Rejeitar</button>}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
