"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type Vehicle = {
  id: string; kind: string; status: string; registrationNumber: string | null;
  make: string | null; model: string | null; capacity: number | null;
  capacityUnit: string | null; activeAssignments: number;
};
type Provider = {
  id: string; status: string; availability: string; displayName: string;
  legalName: string | null; phone: string | null; serviceTypes: string[];
  activeAssignments: number; locationUpdatedAt: string | null;
  user: { name: string | null; email: string | null }; vehicles: Vehicle[];
};

const providerActions = [{ status: "VERIFIED", label: "Verificar" }, { status: "SUSPENDED", label: "Suspender" }, { status: "BLOCKED", label: "Bloquear" }] as const;
const vehicleActions = [{ status: "ACTIVE", label: "Activar" }, { status: "SUSPENDED", label: "Suspender" }, { status: "BLOCKED", label: "Bloquear" }, { status: "RETIRED", label: "Retirar" }] as const;

function label(value: string) {
  return ({
    PENDING: "Pendente", IN_REVIEW: "Em análise", VERIFIED: "Verificado",
    SUSPENDED: "Suspenso", BLOCKED: "Bloqueado", OFFLINE: "Offline",
    AVAILABLE: "Disponível", BUSY: "Ocupado", PAUSED: "Em pausa",
    ACTIVE: "Activo", RETIRED: "Retirado", CARGO_TRICYCLE: "Moto de carga",
    PICKUP: "Pickup", CARGO_VAN: "Carrinha", LIGHT_TRUCK: "Camião ligeiro",
    FLATBED_TRUCK: "Plataforma", TIPPER_TRUCK: "Basculante", HEAVY_TRUCK: "Camião pesado",
    WATER_TANKER: "Cisterna", TOW_TRUCK: "Reboque", SERVICE_VEHICLE: "Assistência",
    SPECIALIZED: "Especializado", CARGO_SHIPMENT: "Transporte de carga",
    WATER_DELIVERY: "Entrega de água", ROADSIDE_ASSISTANCE: "Assistência rodoviária",
  } as Record<string, string>)[value] ?? value.replaceAll("_", " ");
}

export default function MobilityFreightProviderDesk() {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.id;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) { setProviders([]); setError("Seleccione uma organização activa."); setLoading(false); return; }
    try {
      const response = await fetch("/api/freight/admin/providers", {
        credentials: "include", cache: "no-store",
        headers: { "X-Organization-Id": organizationId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar prestadores.");
      setProviders(data.providers as Provider[]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar prestadores.");
    } finally { setLoading(false); }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 30000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [load]);

  const changeStatus = async (entityType: "PROVIDER" | "VEHICLE", entityId: string, status: string) => {
    if (!organizationId) return;
    const reason = (reasons[entityId] ?? "").trim();
    if (["SUSPENDED", "BLOCKED", "RETIRED"].includes(status) && reason.length < 5) {
      setError("Indique um motivo com pelo menos cinco caracteres antes desta decisão."); return;
    }
    setSaving(entityId); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/freight/admin/providers", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId },
        body: JSON.stringify({ entityType, entityId, status, reason: reason || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível actualizar o estado.");
      setNotice(data.message || "Estado operacional actualizado.");
      setReasons((current) => ({ ...current, [entityId]: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao actualizar estado.");
    } finally { setSaving(null); }
  };

  const verified = providers.filter((item) => item.status === "VERIFIED").length;
  const suspended = providers.filter((item) => item.status === "SUSPENDED").length;
  const assigned = providers.reduce((total, item) => total + item.activeAssignments, 0);

  return (
    <section className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-faint)]">Fleet governance</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--theme-text)]">Prestadores e frota</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--theme-text-muted)]">Verifique prestadores, aprove viaturas e controle a elegibilidade. A suspensão impede novas atribuições sem apagar serviços já atribuídos.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="h-10 rounded-full border border-[var(--theme-border)] px-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--theme-text-muted)]">Actualizar</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-xs text-[var(--theme-text-muted)]">{notice}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[{ label: "Prestadores", value: providers.length }, { label: "Verificados", value: verified }, { label: "Suspensos", value: suspended }, { label: "Serviços atribuídos", value: assigned }].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[var(--theme-border)] px-3 py-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--theme-text)]">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {loading ? <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">A carregar prestadores…</p>
        : providers.length === 0 ? <p className="py-8 text-center text-xs text-[var(--theme-text-faint)]">Ainda não existem prestadores nesta organização.</p>
        : providers.map((provider) => (
          <article key={provider.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)]/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--theme-text)]">{provider.displayName}</p>
                <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">{provider.user.name || provider.legalName || "Prestador"} · {provider.user.email || provider.phone || "Contacto não indicado"}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">{provider.serviceTypes.map(label).join(" · ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] text-[var(--theme-text-muted)]">{label(provider.status)}</span>
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] text-[var(--theme-text-muted)]">{label(provider.availability)}</span>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-[var(--theme-text-faint)]">{provider.activeAssignments} serviço(s) em curso · {provider.vehicles.length} viatura(s) registada(s)</p>
            <label className="mt-4 block">
              <span className="mb-1 block text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">Motivo da decisão</span>
              <input value={reasons[provider.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [provider.id]: event.target.value }))} maxLength={2000} className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-transparent px-3 text-xs text-[var(--theme-text)] outline-none" placeholder="Obrigatório para suspender ou bloquear" />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {providerActions.map((action) => <button key={action.status} type="button" disabled={saving === provider.id || provider.status === action.status} onClick={() => void changeStatus("PROVIDER", provider.id, action.status)} className="min-h-9 rounded-full border border-[var(--theme-border)] px-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--theme-text-muted)] disabled:opacity-40">{saving === provider.id ? "A guardar…" : action.label}</button>)}
            </div>
            <div className="mt-5 border-t border-[var(--theme-border)] pt-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-faint)]">Viaturas</p>
              {provider.vehicles.length === 0 ? <p className="mt-3 text-xs text-[var(--theme-text-faint)]">Sem viaturas registadas.</p> : (
                <div className="mt-3 space-y-3">
                  {provider.vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="rounded-xl border border-[var(--theme-border)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[var(--theme-text)]">{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || label(vehicle.kind)}</p>
                          <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">{label(vehicle.kind)} · {vehicle.registrationNumber || "Matrícula não indicada"} · {vehicle.capacity === null ? "Capacidade não indicada" : vehicle.capacity.toLocaleString("pt-PT") + " " + (vehicle.capacityUnit || "")}</p>
                        </div>
                        <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-[9px] text-[var(--theme-text-muted)]">{label(vehicle.status)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="mr-auto text-[9px] text-[var(--theme-text-faint)]">{vehicle.activeAssignments} serviço(s) atribuídos</span>
                        {vehicleActions.map((action) => <button key={action.status} type="button" disabled={saving === vehicle.id || vehicle.status === action.status} onClick={() => void changeStatus("VEHICLE", vehicle.id, action.status)} className="min-h-8 rounded-full border border-[var(--theme-border)] px-3 text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-text-muted)] disabled:opacity-40">{saving === vehicle.id ? "A guardar…" : action.label}</button>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
