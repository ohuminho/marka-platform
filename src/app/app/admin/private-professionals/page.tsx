"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/frontend/shell/AppShell";

type Profile = {
  id: string; userId: string; publicName: string; specialties: string[]; region: string | null;
  status: "PENDING" | "VERIFIED" | "SUSPENDED"; verifiedAt: string | null; createdAt: string;
  user: { name: string; email: string; phoneVerifiedAt: string | null };
};

export default function AdminPrivateProfessionalsPage() {
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/private-professionals", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar as candidaturas.");
      setItems(data.profiles ?? []); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar candidaturas."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function decide(profile: Profile, status: "VERIFIED" | "SUSPENDED") {
    const reason = status === "SUSPENDED" ? window.prompt("Motivo obrigatório da suspensão:")?.trim() : undefined;
    if (status === "SUSPENDED" && !reason) return;
    setBusy(profile.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/private-professionals", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, status, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível guardar a decisão.");
      setNotice(status === "VERIFIED" ? "Perfil verificado. O profissional foi notificado." : "Perfil suspenso. O profissional foi notificado.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao guardar decisão."); }
    finally { setBusy(""); }
  }

  return <AppShell><main className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[var(--theme-text-faint)]">MARKA · CONFORMIDADE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--theme-text)]">Verificação de profissionais</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--theme-text-muted)]">Revê a identidade e as credenciais fora desta ficha e regista a decisão. Só perfis verificados entram no motor de encaminhamento.</p></div>
      <button onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs font-semibold text-[var(--theme-text)]">Actualizar</button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">{notice}</p>}
    {loading ? <p className="text-sm text-[var(--theme-text-muted)]">A carregar…</p> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-10 text-center text-sm text-[var(--theme-text-muted)]">Ainda não existem candidaturas profissionais.</div> : <section className="space-y-3">{items.map((item) => <article key={item.id} className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.2em] text-[var(--theme-text-faint)]">{item.region || "Região não indicada"} · {new Date(item.createdAt).toLocaleString("pt-PT")}</p><h2 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">{item.publicName}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">{item.user.name} · {item.user.email}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{item.user.phoneVerifiedAt ? "Telefone confirmado" : "Telefone por confirmar"}</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs">{item.status}</span></div>
      <div className="flex flex-wrap gap-2">{item.specialties.map((specialty) => <span key={specialty} className="rounded-full bg-[var(--theme-background)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]">{specialty}</span>)}</div>
      {item.status !== "SUSPENDED" && <div className="flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-4"><button disabled={busy === item.id || item.status === "VERIFIED"} onClick={() => void decide(item, "VERIFIED")} className="min-h-11 rounded-xl bg-[var(--theme-accent)] px-5 text-xs font-semibold text-white disabled:opacity-50">{busy === item.id ? "A processar…" : item.status === "VERIFIED" ? "Verificado" : "Verificar profissional"}</button><button disabled={busy === item.id} onClick={() => void decide(item, "SUSPENDED")} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-5 text-xs font-semibold text-[var(--theme-text-muted)] disabled:opacity-50">Suspender</button></div>}
      {item.status === "SUSPENDED" && <button disabled={busy === item.id} onClick={() => void decide(item, "VERIFIED")} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-5 text-xs font-semibold text-[var(--theme-text)]">Reactivar e verificar</button>}
    </article>)}</section>}
  </main></AppShell>;
}
