"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/frontend/shell/AppShell";

type PrivateCase = {
  id: string;
  reference: string;
  serviceType: string;
  specialty: string;
  title: string;
  summary: string;
  region: string | null;
  status: string;
  createdAt: string;
};

export default function PrivateServiceCasePage() {
  const params = useParams<{ requestId: string }>();
  const [item, setItem] = useState<PrivateCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/private-services/${encodeURIComponent(params.requestId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Não foi possível abrir o processo.");
        if (active) setItem(data.request);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar o processo.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.requestId]);

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl space-y-5">
        <Link href="/app/private-services" className="inline-flex text-xs font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]">← Voltar aos pedidos privados</Link>
        {loading ? (
          <div className="rounded-2xl border border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">A validar autorização e carregar o processo…</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-500">{error}</div>
        ) : item ? (
          <article className="overflow-hidden rounded-[26px] border border-[var(--theme-border)] bg-[var(--theme-surface)]">
            <header className="border-b border-[var(--theme-border)] p-6 sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[var(--theme-text-faint)]">Acesso confidencial autorizado · {item.reference}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-[var(--theme-text)]">{item.title}</h1>
              <p className="mt-2 text-sm text-[var(--theme-text-muted)]">{item.specialty} · {item.serviceType === "LEGAL" ? "Assistência jurídica" : "Apoio psicológico"}{item.region ? ` · ${item.region}` : ""}</p>
            </header>
            <div className="p-6 sm:p-8">
              <h2 className="text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--theme-text-faint)]">Descrição confidencial do pedido</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--theme-text)]">{item.summary}</p>
              <p className="mt-7 rounded-xl border border-[var(--theme-border)] p-4 text-xs leading-5 text-[var(--theme-text-muted)]">Este conteúdo só é apresentado ao cliente e ao profissional seleccionado. Mantém a confidencialidade e utiliza os canais privados da MARKA para qualquer comunicação relacionada com este processo.</p>
            </div>
          </article>
        ) : null}
      </section>
    </AppShell>
  );
}
