"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/frontend/shell/AppShell";

type Profile = { id: string; publicName: string; specialties: string[]; region: string | null; status: "PENDING" | "VERIFIED" | "SUSPENDED"; verifiedAt: string | null };
const specialties = [
  "Direito de Família", "Direito Civil", "Direito Penal", "Direito Laboral", "Direito Empresarial",
  "Psicologia Individual", "Psicologia Familiar", "Psicologia de Casal",
];

export default function PrivateProfessionalProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publicName, setPublicName] = useState("");
  const [region, setRegion] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/private-services/profile", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Não foi possível carregar o perfil.");
        if (active && data.profile) {
          setProfile(data.profile);
          setPublicName(data.profile.publicName);
          setRegion(data.profile.region ?? "");
          setSelected(data.profile.specialties ?? []);
        }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar perfil."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/private-services/profile", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicName, region, specialties: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível submeter a candidatura.");
      setProfile(data.profile);
      setNotice(data.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao submeter candidatura.");
    } finally { setSaving(false); }
  }

  const locked = profile?.status === "VERIFIED" || profile?.status === "SUSPENDED";
  return <AppShell><main className="mx-auto max-w-3xl space-y-6">
    <header className="rounded-[26px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
      <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[var(--theme-text-faint)]">MARKA · REDE PROFISSIONAL</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--theme-text)]">Perfil profissional</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">Submete a tua candidatura para receber pedidos privados compatíveis com as tuas especialidades. A recepção de convites só é activada após verificação da MARKA.</p>
    </header>
    {loading ? <p className="text-sm text-[var(--theme-text-muted)]">A carregar perfil…</p> : <>
      {profile && <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
        <p className="text-xs text-[var(--theme-text-muted)]">Estado da candidatura</p>
        <p className="mt-1 text-lg font-semibold text-[var(--theme-text)]">{profile.status === "PENDING" ? "Em análise" : profile.status === "VERIFIED" ? "Verificado" : "Suspenso"}</p>
        <p className="mt-2 text-xs text-[var(--theme-text-muted)]">{profile.status === "PENDING" ? "A equipa de conformidade irá rever os teus dados. Ainda não receberás pedidos." : profile.status === "VERIFIED" ? "O teu perfil está habilitado para receber convites." : "O perfil está suspenso. Contacta a equipa MARKA."}</p>
        {profile.status === "VERIFIED" && <Link href="/app/private-services" className="mt-4 inline-flex rounded-xl bg-[var(--theme-accent)] px-5 py-3 text-xs font-semibold text-white">Abrir pedidos privados</Link>}
      </div>}
      {!locked && <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
        <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Nome profissional</label><input required minLength={2} maxLength={120} value={publicName} onChange={(e) => setPublicName(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-4 text-sm text-[var(--theme-text)]" placeholder="Nome apresentado aos clientes" /></div>
        <div><label className="mb-2 block text-xs font-medium text-[var(--theme-text)]">Província / região</label><input maxLength={100} value={region} onChange={(e) => setRegion(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-4 text-sm text-[var(--theme-text)]" placeholder="Ex.: Luanda" /></div>
        <fieldset><legend className="mb-3 text-xs font-medium text-[var(--theme-text)]">Especialidades</legend><div className="grid gap-2 sm:grid-cols-2">{specialties.map((specialty) => <label key={specialty} className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] p-3 text-sm text-[var(--theme-text)]"><input type="checkbox" checked={selected.includes(specialty)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, specialty] : current.filter((item) => item !== specialty))} />{specialty}</label>)}</div></fieldset>
        <p className="text-xs leading-5 text-[var(--theme-text-muted)]">A submissão do perfil não substitui a verificação de identidade, habilitações, inscrição profissional ou licenças exigíveis. A MARKA poderá solicitar documentação adicional antes da aprovação.</p>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
        <button disabled={saving || selected.length === 0} className="min-h-12 rounded-xl bg-[var(--theme-accent)] px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "A submeter…" : profile ? "Actualizar candidatura" : "Submeter candidatura"}</button>
      </form>}
      {locked && notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
    </>}
  </main></AppShell>;
}
