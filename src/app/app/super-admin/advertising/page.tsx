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
      await loadCampaigns();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar campanha.");
    } finally {
      setBusy(false);
    }
  }

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
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Crie campanhas, reveja o inventário e aprove apenas publicidade que cumpra as regras da MARKA. As campanhas novas começam sempre pendentes.</p>
        </div>
        <Link href="/app/super-admin" className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">Voltar ao controlo global</Link>
      </header>

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
        <label className="space-y-2 text-xs sm:col-span-2"><span>Descrição (opcional)</span><textarea maxLength={1000} rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border border-[var(--theme-border)] bg-transparent p-3" placeholder="Detalhes curtos e transparentes da oferta" /></label>
        <div className="sm:col-span-2"><button disabled={busy} className="rounded-full bg-[var(--theme-text)] px-6 py-3 text-xs font-semibold text-[var(--theme-background)] disabled:opacity-50">{busy ? "A processar..." : "Criar campanha para revisão"}</button></div>
      </form>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Campanhas registadas</h2><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Apenas campanhas aprovadas e dentro do período configurado são distribuídas.</p></div>
        {campaigns.length === 0 ? <div className="rounded-2xl border border-[var(--theme-border)] p-6 text-sm text-[var(--theme-text-muted)]">Nenhuma campanha disponível ou acesso à API indisponível.</div> : campaigns.map(campaign => (
          <article key={campaign.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{campaign.headline}</h3><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase tracking-wider">{campaign.status}</span></div><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{campaign.advertiserName} · {campaign.placement} · {campaign.creativeType}</p><p className="mt-2 text-[10px] text-[var(--theme-text-faint)]">{campaign.impressions} impressões · {campaign.clicks} cliques · CTR {campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : "0.00"}%</p></div>
            <div className="flex shrink-0 flex-wrap gap-2">{campaign.status !== "APPROVED" && campaign.status !== "ENDED" && <button disabled={busy} onClick={() => void updateStatus(campaign.id, "APPROVED")} className="rounded-full border border-emerald-500/40 px-3 py-2 text-xs">Aprovar</button>}{campaign.status !== "PAUSED" && campaign.status !== "ENDED" && <button disabled={busy} onClick={() => void updateStatus(campaign.id, "PAUSED")} className="rounded-full border border-amber-500/40 px-3 py-2 text-xs">Pausar</button>}{campaign.status !== "REJECTED" && campaign.status !== "ENDED" && <button disabled={busy} onClick={() => void updateStatus(campaign.id, "REJECTED")} className="rounded-full border border-red-500/40 px-3 py-2 text-xs">Rejeitar</button>}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
