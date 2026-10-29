"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type DriverProfile = {
  id: string;
  status: string;
  displayName?: string | null;
  licenseNumber?: string | null;
  verifications?: Array<{ documentType: string; status: string }>;
};

type OnboardingResponse = {
  driver: DriverProfile | null;
  requiredDriverDocuments?: Array<{ documentType: string; label: string }>;
  requiredVehicleDocuments?: string[];
  activationPolicy?: string;
  nextStep?: string;
  message?: string;
};

export default function DriverOnboardingPanel() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const organizationId = activeOrganization?.id;
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<OnboardingResponse["requiredDriverDocuments"]>([]);
  const [vehicleDocuments, setVehicleDocuments] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/mobility/driver/onboarding", {
        credentials: "include",
        cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const data = (await response.json()) as OnboardingResponse;
      if (!response.ok) throw new Error(data.message || "Não foi possível consultar a candidatura.");
      setProfile(data.driver);
      setRequiredDocuments(data.requiredDriverDocuments ?? []);
      setVehicleDocuments(data.requiredVehicleDocuments ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar a candidatura.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) {
      setError("Seleciona primeiro a organização MARKA.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/mobility/driver/onboarding", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          countryCode: "AO",
        }),
      });
      const data = (await response.json()) as OnboardingResponse;
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar a candidatura.");
      setProfile(data.driver);
      setRequiredDocuments(data.requiredDriverDocuments ?? []);
      setNotice(data.nextStep || "Candidatura iniciada. O perfil permanece pendente até à verificação.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a candidatura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-muted)]">MARKA Mobility / Partner onboarding</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-2xl">Candidatura de motorista</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">
        Usa a tua conta MARKA existente. A candidatura de motorista é um perfil operacional ligado à mesma identidade — não é necessário criar uma segunda conta MARKA.
      </p>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-[var(--theme-text)]">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-[var(--theme-text)]">{notice}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-[var(--theme-text-muted)]">A consultar o estado da candidatura…</p>
      ) : profile ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/40 p-4">
            <div>
              <p className="text-xs text-[var(--theme-text-muted)]">Estado da candidatura</p>
              <p className="mt-1 text-lg font-semibold text-[var(--theme-text)]">{profile.status}</p>
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">Referência: {profile.id}</p>
            </div>
            <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs text-[var(--theme-text-muted)]">
              {profile.status === "ACTIVE" ? "Aprovado operacionalmente" : "Não autorizado a aceitar viagens"}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)]">Documentos do motorista</h3>
            <ul className="mt-2 space-y-2">
              {(requiredDocuments ?? []).map((doc) => {
                const latest = profile.verifications?.find((item) => item.documentType === doc.documentType);
                return <li key={doc.documentType} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--theme-border)] p-3 text-sm">
                  <span className="text-[var(--theme-text-muted)]">{doc.label}</span>
                  <span className="shrink-0 text-xs text-[var(--theme-text)]">{latest?.status ?? "PENDING"}</span>
                </li>;
              })}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)]">Documentos do veículo</h3>
            <ul className="mt-2 space-y-2">{vehicleDocuments.map((doc) => <li key={doc} className="rounded-lg border border-[var(--theme-border)] p-3 text-sm text-[var(--theme-text-muted)]">{doc}</li>)}</ul>
          </div>
          <p className="text-xs leading-5 text-[var(--theme-text-faint)]">A lista é uma checklist inicial de conformidade. A ativação depende da validação dos documentos, da viatura e das regras oficiais aplicáveis. Não existe aprovação automática apenas por preencher o formulário.</p>
          <button type="button" onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-2 text-sm text-[var(--theme-text)]">Atualizar estado</button>
        </div>
      ) : (
        <form onSubmit={apply} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[var(--theme-text-muted)]">
            Nome profissional (opcional)
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent-strong)]" />
          </label>
          <label className="block text-sm text-[var(--theme-text-muted)]">
            Número da carta de condução (opcional nesta fase)
            <input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent-strong)]" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting || !organizationId} className="rounded-xl bg-[var(--theme-text)] px-5 py-3 text-sm font-semibold text-[var(--theme-background)] disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "A enviar candidatura…" : "Iniciar candidatura de motorista"}
            </button>
          </div>
          <p className="sm:col-span-2 text-xs leading-5 text-[var(--theme-text-faint)]">Iniciar candidatura não aprova o motorista nem autoriza viagens. Os documentos de identificação, condução e registo criminal, bem como a documentação da viatura, terão de ser apresentados e verificados no fluxo de conformidade.</p>
        </form>
      )}
    </section>
  );
}
