"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";
import RoleContextSummary from "@/frontend/features/auth/components/RoleContextSummary";

type Document = { id: string; documentType: string; status: string; documentExpiry: string | null; rejectionReason: string | null };
type Vehicle = { id: string; status: string; type: string; registrationNumber: string | null; make: string | null; model: string | null; year: number | null; color: string | null; verifications: Document[] } | null;
type Driver = {
  id: string; status: string; displayName: string | null; licenseNumber: string | null; createdAt: string;
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string };
  verifications: Document[];
  vehicle: Vehicle;
};
type Payload = { drivers?: Driver[]; message?: string };

const label: Record<string, string> = {
  IDENTITY_DOCUMENT: "Identificação",
  DRIVING_LICENSE: "Carta de condução",
  CRIMINAL_RECORD: "Registo criminal",
  VEHICLE_REGISTRATION: "Registo do veículo",
  VEHICLE_OWNERSHIP: "Propriedade / autorização de uso",
  VEHICLE_INSURANCE: "Seguro",
  VEHICLE_INSPECTION: "Inspeção técnica",
  VEHICLE_SERVICE_LICENSE: "Licença de serviço",
};

function currentVerified(document: Document) {
  return document.status === "VERIFIED" && (!document.documentExpiry || new Date(document.documentExpiry).getTime() > Date.now());
}
function dateLabel(value: string | null) {
  if (!value) return "Sem data de validade registada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data inválida" : "Válido até " + new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(date);
}

export default function AdminMobilityDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mobility/admin/drivers", { credentials: "include", cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar as candidaturas.");
      setDrivers(data.drivers ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as candidaturas.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function decide(driver: Driver, status: "ACTIVE" | "SUSPENDED" | "BLOCKED") {
    setError(""); setNotice("");
    const reason = status === "ACTIVE" ? undefined : window.prompt(status === "SUSPENDED" ? "Motivo obrigatório da suspensão:" : "Motivo obrigatório do bloqueio:")?.trim();
    if (status !== "ACTIVE" && !reason) { setError("É necessário indicar um motivo."); return; }
    setBusyId(driver.id);
    try {
      const response = await fetch("/api/mobility/admin/drivers", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driver.id, status, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const missing = [...(data.missingDriverDocuments ?? []), ...(data.missingVehicleDocuments ?? [])];
        throw new Error(missing.length ? `${data.message || "Ativação bloqueada"} Documentos em falta: ${missing.map((item: string) => label[item] ?? item).join(", ")}.` : data.message || "A decisão não foi guardada.");
      }
      setNotice(data.message || "Estado atualizado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A decisão não foi guardada.");
    } finally { setBusyId(null); }
  }

  return <DynamicBackground><AppShell><main className="space-y-7">
    <RoleContextSummary />
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--theme-text-muted)]">MARKA Mobility · Operações de confiança</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-4xl">Revisão de motoristas</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">A ativação é bloqueada no servidor enquanto faltar qualquer documento obrigatório verificado e válido ou a viatura não estiver registada. Cada decisão administrativa fica auditada.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/app/admin/compliance" className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Centro de Conformidade</Link><button onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Atualizar</button></div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-[var(--theme-text)]">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-[var(--theme-text)]">{notice}</p>}
    {loading && <p className="text-sm text-[var(--theme-text-muted)]">A carregar candidaturas…</p>}
    {!loading && drivers.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">Ainda não existem candidaturas de motorista.</div>}
    <section className="space-y-4">
      {drivers.map((driver) => {
        const requiredDriver = ["IDENTITY_DOCUMENT", "DRIVING_LICENSE", "CRIMINAL_RECORD"];
        const requiredVehicle = ["VEHICLE_REGISTRATION", "VEHICLE_OWNERSHIP", "VEHICLE_INSURANCE", "VEHICLE_INSPECTION", "VEHICLE_SERVICE_LICENSE"];
        const missingDriver = requiredDriver.filter((type) => !driver.verifications.some((item) => item.documentType === type && currentVerified(item)));
        const missingVehicle = !driver.vehicle ? ["VEHICLE_NOT_REGISTERED"] : requiredVehicle.filter((type) => !driver.vehicle!.verifications.some((item) => item.documentType === type && currentVerified(item)));
        const canActivate = missingDriver.length === 0 && missingVehicle.length === 0 && !!driver.vehicle;
        return <article key={driver.id} className="space-y-5 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">{driver.organization.name} · {driver.organization.slug}</p><h2 className="mt-2 text-xl font-semibold text-[var(--theme-text)]">{driver.displayName || driver.user.name}</h2><p className="mt-1 text-sm text-[var(--theme-text-muted)]">{driver.user.email}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">Referência: {driver.id}</p></div><span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs font-semibold text-[var(--theme-text)]">{driver.status}</span></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--theme-border)] p-4"><h3 className="font-semibold text-[var(--theme-text)]">Documentos do motorista</h3><div className="mt-3 space-y-2">{requiredDriver.map((type) => { const doc = driver.verifications.find((item) => item.documentType === type); return <div key={type} className="flex items-start justify-between gap-3 rounded-xl bg-[var(--theme-background)]/40 p-3"><div><p className="text-sm text-[var(--theme-text)]">{label[type]}</p><p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">{dateLabel(doc?.documentExpiry ?? null)}</p>{doc?.rejectionReason && <p className="mt-1 text-xs text-red-400">{doc.rejectionReason}</p>}</div><span className={`text-xs font-semibold ${doc && currentVerified(doc) ? "text-emerald-500" : "text-amber-500"}`}>{doc?.status ?? "EM FALTA"}</span></div>; })}</div></section>
            <section className="rounded-2xl border border-[var(--theme-border)] p-4"><h3 className="font-semibold text-[var(--theme-text)]">Viatura e documentação</h3>{driver.vehicle ? <><p className="mt-2 text-sm text-[var(--theme-text)]">{driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.registrationNumber}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{driver.vehicle.year} · {driver.vehicle.color} · estado {driver.vehicle.status}</p><div className="mt-3 space-y-2">{requiredVehicle.map((type) => { const doc = driver.vehicle!.verifications.find((item) => item.documentType === type); return <div key={type} className="flex items-start justify-between gap-3 rounded-xl bg-[var(--theme-background)]/40 p-3"><div><p className="text-sm text-[var(--theme-text)]">{label[type]}</p><p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">{dateLabel(doc?.documentExpiry ?? null)}</p>{doc?.rejectionReason && <p className="mt-1 text-xs text-red-400">{doc.rejectionReason}</p>}</div><span className={`text-xs font-semibold ${doc && currentVerified(doc) ? "text-emerald-500" : "text-amber-500"}`}>{doc?.status ?? "EM FALTA"}</span></div>; })}</div></> : <p className="mt-2 text-sm text-amber-500">Veículo ainda não registado.</p>}</section>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-4"><p className="max-w-2xl text-xs leading-5 text-[var(--theme-text-muted)]">{canActivate ? "Documentação obrigatória atual verificada. A ativação pode ser submetida para decisão." : `Ativação bloqueada: ${missingDriver.length + missingVehicle.length} requisito(s) documental(is) por verificar.`}</p><div className="flex flex-wrap gap-2"><button disabled={busyId !== null || driver.status === "ACTIVE"} onClick={() => void decide(driver, "ACTIVE")} className="rounded-xl bg-[var(--theme-text)] px-4 py-3 text-sm font-semibold text-[var(--theme-background)] disabled:cursor-not-allowed disabled:opacity-40">Ativar motorista</button><button disabled={busyId !== null || driver.status === "SUSPENDED"} onClick={() => void decide(driver, "SUSPENDED")} className="rounded-xl border border-amber-500/40 px-4 py-3 text-sm text-amber-500 disabled:opacity-40">Suspender</button><button disabled={busyId !== null || driver.status === "BLOCKED"} onClick={() => void decide(driver, "BLOCKED")} className="rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-400 disabled:opacity-40">Bloquear</button></div></div>
        </article>;
      })}
    </section>
  </main></AppShell></DynamicBackground>;
}
