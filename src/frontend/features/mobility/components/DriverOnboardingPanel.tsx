"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/frontend/providers/auth/AuthProvider";

type Verification = { id?: string; documentType: string; status: string; documentExpiry?: string | null; rejectionReason?: string | null; metadata?: unknown };
type DriverProfile = {
  id: string;
  status: string;
  displayName?: string | null;
  licenseNumber?: string | null;
  verifications?: Verification[];
};
type OnboardingResponse = {
  driver: DriverProfile | null;
  requiredDriverDocuments?: Array<{ documentType: string; label: string }>;
  requiredVehicleDocuments?: Array<{ documentType: string; label: string }> | string[];
  activationPolicy?: string;
  nextStep?: string;
  message?: string;
};
type Vehicle = {
  id: string;
  status: string;
  type: string;
  registrationNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  capacity: number | null;
  verifications?: Verification[];
};
type VehicleResponse = { vehicle: Vehicle | null; requiredVehicleDocuments?: Array<{ documentType: string; label: string }>; message?: string };

const DEFAULT_DRIVER_DOCUMENTS = [
  { documentType: "IDENTITY_DOCUMENT", label: "BI, passaporte ou autorização de residência válida" },
  { documentType: "DRIVING_LICENSE", label: "Carta de condução válida e adequada ao veículo" },
  { documentType: "CRIMINAL_RECORD", label: "Registo criminal, quando exigido pelas regras oficiais aplicáveis" },
];
const DEFAULT_VEHICLE_DOCUMENTS = [
  { documentType: "VEHICLE_REGISTRATION", label: "Livrete / documento de registo do veículo" },
  { documentType: "VEHICLE_OWNERSHIP", label: "Título de propriedade ou autorização de uso" },
  { documentType: "VEHICLE_INSURANCE", label: "Seguro automóvel obrigatório e cobertura aplicável" },
  { documentType: "VEHICLE_INSPECTION", label: "Inspeção técnica válida, quando aplicável" },
  { documentType: "VEHICLE_SERVICE_LICENSE", label: "Licença/autorização para o serviço, quando exigida" },
];
const FAQ = [
  ["Quanto tempo demora a aprovação?", "Depende da completude dos dados, da validade dos documentos e da revisão por um revisor autorizado. A aplicação mostra o estado atual; não existe aprovação automática."],
  ["Que documentos devo enviar?", "Documento de identificação, carta de condução adequada e registo criminal quando exigido. Para a viatura, registo, prova de propriedade ou autorização de uso, seguro e inspeção/licenças aplicáveis."],
  ["Que ficheiros são aceites?", "PDF, JPEG, PNG ou WebP, até 10 MB por ficheiro. O sistema verifica o tipo declarado e a assinatura básica do ficheiro; a autenticidade do documento continua sujeita a revisão."],
  ["Posso começar a aceitar viagens depois de enviar os documentos?", "Não. O envio deixa os documentos pendentes. A ativação depende de revisão, documentos atuais, veículo aprovado e restantes requisitos operacionais."],
  ["O que acontece se um documento for rejeitado ou expirar?", "O estado e, quando aplicável, o motivo devem ser apresentados na candidatura. Submete um documento corrigido ou renovado e aguarda nova revisão."],
  ["Onde consulto as condições e os meus dados?", "Os Termos de Adesão e o Aviso de Privacidade estão disponíveis nos links desta página. O estado dos documentos pode ser consultado na candidatura e no Centro de Conformidade."],
];

const inputClass = "mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-3 text-sm text-[var(--theme-text)] outline-none focus:border-[var(--theme-accent-strong)]";
const labelClass = "block text-sm text-[var(--theme-text-muted)]";

export default function DriverOnboardingPanel() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const organizationId = activeOrganization?.id;
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState(DEFAULT_DRIVER_DOCUMENTS);
  const [vehicleDocuments, setVehicleDocuments] = useState(DEFAULT_VEHICLE_DOCUMENTS);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [vehicleForm, setVehicleForm] = useState({ type: "CAR", registrationNumber: "", make: "", model: "", year: String(new Date().getFullYear()), color: "", capacity: "4" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const headers = { "X-Organization-Id": organizationId };
      const [driverResponse, vehicleResponse] = await Promise.all([
        fetch("/api/mobility/driver/onboarding", { credentials: "include", cache: "no-store", headers }),
        fetch("/api/mobility/driver/vehicle", { credentials: "include", cache: "no-store", headers }),
      ]);
      const driverData = await driverResponse.json() as OnboardingResponse;
      if (!driverResponse.ok) throw new Error(driverData.message || "Não foi possível consultar a candidatura.");
      const vehicleData = await vehicleResponse.json() as VehicleResponse;
      if (!vehicleResponse.ok) throw new Error(vehicleData.message || "Não foi possível consultar os dados do veículo.");
      setProfile(driverData.driver);
      setRequiredDocuments(driverData.requiredDriverDocuments ?? DEFAULT_DRIVER_DOCUMENTS);
      setVehicleDocuments(vehicleData.requiredVehicleDocuments ?? driverData.requiredVehicleDocuments?.map((document) => typeof document === "string" ? { documentType: document, label: document } : document) ?? DEFAULT_VEHICLE_DOCUMENTS);
      setVehicle(vehicleData.vehicle);
      if (vehicleData.vehicle) {
        setVehicleForm({
          type: vehicleData.vehicle.type || "CAR",
          registrationNumber: vehicleData.vehicle.registrationNumber || "",
          make: vehicleData.vehicle.make || "",
          model: vehicleData.vehicle.model || "",
          year: String(vehicleData.vehicle.year || new Date().getFullYear()),
          color: vehicleData.vehicle.color || "",
          capacity: String(vehicleData.vehicle.capacity || 4),
        });
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a candidatura.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, load]);

  async function acceptTerms() {
    setError(""); setNotice("");
    if (!termsChecked) { setError("Abre e lê os Termos de Adesão e assinala a caixa de aceitação expressa."); return; }
    if (!organizationId) { setError("Seleciona primeiro a organização MARKA."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/mobility/driver/accept-terms", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId },
        body: JSON.stringify({ accepted: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Não foi possível registar a aceitação.");
      setTermsAccepted(true);
      setNotice("Aceitação registada com versão e data para auditoria. Podes continuar a candidatura.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registar a aceitação.");
    } finally { setSubmitting(false); }
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!termsAccepted) { setError("Aceita primeiro os Termos de Adesão."); return; }
    if (!organizationId) { setError("Seleciona primeiro a organização MARKA."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/mobility/driver/onboarding", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId },
        body: JSON.stringify({ displayName: displayName.trim() || undefined, licenseNumber: licenseNumber.trim() || undefined, countryCode: "AO" }),
      });
      const data = await response.json() as OnboardingResponse;
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar a candidatura.");
      setProfile(data.driver);
      setNotice(data.nextStep || "Candidatura registada. O perfil permanece pendente até à verificação.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a candidatura.");
    } finally { setSubmitting(false); }
  }

  async function saveVehicle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!termsAccepted) { setError("Aceita primeiro os Termos de Adesão."); return; }
    if (!profile) { setError("Regista primeiro a candidatura de motorista."); return; }
    if (!organizationId) { setError("Seleciona primeiro a organização MARKA."); return; }
    setSavingVehicle(true);
    try {
      const response = await fetch("/api/mobility/driver/vehicle", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId },
        body: JSON.stringify({ ...vehicleForm, year: Number(vehicleForm.year), capacity: Number(vehicleForm.capacity) }),
      });
      const data = await response.json() as VehicleResponse;
      if (!response.ok) throw new Error(data.message || "Não foi possível guardar o veículo.");
      setVehicle(data.vehicle);
      setVehicleDocuments(data.requiredVehicleDocuments ?? DEFAULT_VEHICLE_DOCUMENTS);
      setNotice("Dados do veículo guardados. A viatura continua pendente até à revisão documental.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível guardar o veículo.");
    } finally { setSavingVehicle(false); }
  }

  async function uploadDocument(documentType: string, subjectLabel: string) {
    setError(""); setNotice("");
    const file = files[documentType];
    if (!file) { setError("Seleciona primeiro o ficheiro que pretendes enviar."); return; }
    if (!termsAccepted) { setError("Aceita primeiro os Termos de Adesão."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("O ficheiro excede o limite de 10 MB."); return; }
    const form = new FormData();
    form.set("file", file);
    form.set("subjectType", "KYD");
    form.set("documentType", documentType);
    form.set("countryCode", "AO");
    if (expiryDates[documentType]) form.set("expiresAt", new Date(expiryDates[documentType] + "T23:59:59.000Z").toISOString());
    setUploading(documentType);
    try {
      const response = await fetch("/api/compliance/upload", { method: "POST", credentials: "include", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar o documento.");
      setFiles((current) => { const next = { ...current }; delete next[documentType]; return next; });
      setNotice(subjectLabel + " enviado com segurança e submetido para revisão. O estado permanece pendente até decisão autorizada.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o documento.");
    } finally { setUploading(null); }
  }

  function documentUploadCard(document: { documentType: string; label: string }, verification?: Verification, vehicleDocument = false) {
    const status = verification?.status ?? "PENDING";
    const expired = verification?.documentExpiry && new Date(verification.documentExpiry).getTime() < Date.now();
    return <article key={document.documentType} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-background)]/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h4 className="text-sm font-semibold text-[var(--theme-text)]">{document.label}</h4><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{document.documentType}</p></div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${status === "VERIFIED" && !expired ? "border-emerald-500/40 text-emerald-500" : status === "REJECTED" || expired ? "border-red-500/40 text-red-400" : "border-amber-500/40 text-amber-500"}`}>{expired ? "EXPIRADO" : status}</span>
      </div>
      {verification?.rejectionReason && <p className="mt-2 text-xs text-red-400">Motivo: {verification.rejectionReason}</p>}
      <label className={`${labelClass} mt-4`}>Ficheiro do documento
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => {
          const selected = event.target.files?.[0];
          setFiles((current) => ({ ...current, [document.documentType]: selected }));
        }} className="mt-2 block w-full text-xs text-[var(--theme-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--theme-surface)] file:px-3 file:py-2 file:text-[var(--theme-text)]" />
      </label>
      <label className={`${labelClass} mt-3`}>Validade (se aplicável)
        <input type="date" value={expiryDates[document.documentType] ?? ""} onChange={(event) => setExpiryDates((current) => ({ ...current, [document.documentType]: event.target.value }))} className={inputClass} />
      </label>
      <button type="button" disabled={uploading !== null || !profile || (vehicleDocument && !vehicle)} onClick={() => void uploadDocument(document.documentType, document.label)} className="mt-4 w-full rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] transition hover:border-[var(--theme-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50">
        {uploading === document.documentType ? "A enviar com segurança…" : verification?.status === "REJECTED" || expired ? "Enviar documento corrigido" : "Enviar para revisão"}
      </button>
      {vehicleDocument && !vehicle && <p className="mt-2 text-xs text-amber-500">Regista primeiro o veículo para associar este documento à viatura certa.</p>}
    </article>;
  }

  return <section id="candidatura" className="space-y-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sm:p-7">
    <header>
      <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-muted)]">MARKA Mobility / Partner onboarding</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--theme-text)] sm:text-3xl">Adesão profissional de motorista</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-muted)]">Uma candidatura real ligada à tua conta MARKA, com aceitação registada, documentos privados, estado de revisão e veículo associado. O envio não concede autorização automática para aceitar viagens.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link className="rounded-full border border-[var(--theme-border)] px-4 py-2 underline underline-offset-4" href="/legal/mobility-driver">Ler contrato e termos</Link>
        <Link className="rounded-full border border-[var(--theme-border)] px-4 py-2 underline underline-offset-4" href="/legal/privacy">Aviso de Privacidade</Link>
        <Link className="rounded-full border border-[var(--theme-border)] px-4 py-2 underline underline-offset-4" href="/app/compliance">Centro de Conformidade</Link>
      </div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-[var(--theme-text)]">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-[var(--theme-text)]">{notice}</p>}
    {loading && <p className="text-sm text-[var(--theme-text-muted)]">A consultar candidatura, documentos e veículo…</p>}
    {!organizationId && !authLoading && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Seleciona uma organização MARKA ativa para iniciar a candidatura.</p>}

    <section className="space-y-4 rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Etapa 01 · Condições contratuais</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Lê, consulta e aceita expressamente</h3></div>
      <p className="text-sm leading-6 text-[var(--theme-text-muted)]">Antes de enviar a candidatura ou documentos, consulta os termos completos e o aviso de privacidade. A versão e a data da aceitação são registadas para auditoria.</p>
      <details className="rounded-xl border border-[var(--theme-border)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--theme-text)]">Resumo das condições de adesão</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--theme-text-muted)]">
          <li>Identidade, carta de condução e documentos do veículo têm de ser verdadeiros, válidos e verificáveis.</li>
          <li>A política padrão atualmente configurada é 12% para táxi e 10% para moto-táxi; as condições de liquidação devem ser confirmadas antes da ativação.</li>
          <li>O motorista deve cumprir regras de trânsito, segurança, atendimento, cancelamento e proteção de dados.</li>
          <li>Documentos rejeitados, expirados ou em falta impedem a ativação operacional até regularização.</li>
          <li>A relação contratual final deve ser validada juridicamente em Angola antes da ativação comercial.</li>
        </ul>
        <Link href="/legal/mobility-driver" className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4">Abrir documento completo</Link>
      </details>
      <label className="flex items-start gap-3 text-sm leading-6 text-[var(--theme-text)]">
        <input type="checkbox" checked={termsChecked} onChange={(event) => { setTermsChecked(event.target.checked); setTermsAccepted(false); }} className="mt-1 h-4 w-4 shrink-0 accent-[var(--theme-accent-strong)]" />
        <span>Declaro que li os <Link href="/legal/mobility-driver" className="underline underline-offset-4">Termos de Adesão</Link> e o <Link href="/legal/privacy" className="underline underline-offset-4">Aviso de Privacidade</Link>, compreendo as condições apresentadas e aceito expressamente esta versão para efeitos de candidatura.</span>
      </label>
      <button type="button" disabled={!termsChecked || submitting || !organizationId} onClick={() => void acceptTerms()} className="rounded-xl bg-[var(--theme-text)] px-5 py-3 text-sm font-semibold text-[var(--theme-background)] disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? "A registar aceitação…" : termsAccepted ? "Aceitação registada ✓" : "Confirmar leitura e aceitar"}
      </button>
      <p className="text-xs text-[var(--theme-text-muted)]">Registo auditável: versão, instante da aceitação, conta, organização e metadados técnicos de pedido. A aceitação não equivale a aprovação da candidatura.</p>
    </section>

    {!loading && !profile && <form onSubmit={apply} className="space-y-4 rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Etapa 02 · Dados do candidato</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Iniciar candidatura</h3></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Nome profissional (opcional)<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} className={inputClass} /></label>
        <label className={labelClass}>Número da carta de condução (opcional nesta etapa)<input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} maxLength={80} className={inputClass} /></label>
      </div>
      <button type="submit" disabled={submitting || !termsAccepted || !organizationId} className="rounded-xl bg-[var(--theme-text)] px-5 py-3 text-sm font-semibold text-[var(--theme-background)] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "A criar candidatura…" : "Criar candidatura de motorista"}</button>
    </form>}

    {!loading && profile && <>
      <section className="rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Etapa 02 · Estado da candidatura</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Referência {profile.id}</h3><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Nome: {profile.displayName || displayName || "Conta MARKA"}</p></div><span className="rounded-full border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-500">{profile.status === "ACTIVE" ? "Ativo operacionalmente" : profile.status === "REJECTED" ? "Requer correção" : "Pendente de verificação"}</span></div>
        <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">{profile.status === "ACTIVE" ? "O perfil está marcado como ativo. Mantém os documentos válidos e segue as regras operacionais." : "Não estás autorizado a aceitar viagens enquanto a candidatura e os requisitos do veículo não forem aprovados."}</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Etapa 03 · KYD</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Identidade e documentos do motorista</h3><p className="mt-1 text-sm text-[var(--theme-text-muted)]">Os ficheiros são enviados para armazenamento privado e ficam pendentes até decisão de um revisor autorizado.</p></div>
        <div className="grid gap-3 lg:grid-cols-2">{requiredDocuments.map((doc) => documentUploadCard(doc, profile.verifications?.find((item) => item.documentType === doc.documentType)))}</div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Etapa 04 · Veículo</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Registar a viatura que será utilizada</h3><p className="mt-1 text-sm text-[var(--theme-text-muted)]">A matrícula e os dados ficam associados ao teu perfil. Não carregues documentos antes de guardar os dados da viatura.</p></div>
        <form onSubmit={saveVehicle} className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Categoria<select value={vehicleForm.type} onChange={(event) => setVehicleForm((v) => ({ ...v, type: event.target.value }))} className={inputClass}><option value="CAR">Carro</option><option value="MOTORCYCLE">Motociclo</option><option value="VAN">Carrinha</option><option value="MINIBUS">Minibus</option><option value="BUS">Autocarro</option><option value="OTHER">Outro</option></select></label>
          <label className={labelClass}>Matrícula<input required value={vehicleForm.registrationNumber} onChange={(event) => setVehicleForm((v) => ({ ...v, registrationNumber: event.target.value.toUpperCase() }))} maxLength={32} className={inputClass} /></label>
          <label className={labelClass}>Marca<input required value={vehicleForm.make} onChange={(event) => setVehicleForm((v) => ({ ...v, make: event.target.value }))} maxLength={80} className={inputClass} /></label>
          <label className={labelClass}>Modelo<input required value={vehicleForm.model} onChange={(event) => setVehicleForm((v) => ({ ...v, model: event.target.value }))} maxLength={80} className={inputClass} /></label>
          <label className={labelClass}>Ano<input required type="number" min="1950" max={new Date().getFullYear() + 1} value={vehicleForm.year} onChange={(event) => setVehicleForm((v) => ({ ...v, year: event.target.value }))} className={inputClass} /></label>
          <label className={labelClass}>Cor<input required value={vehicleForm.color} onChange={(event) => setVehicleForm((v) => ({ ...v, color: event.target.value }))} maxLength={40} className={inputClass} /></label>
          <label className={labelClass}>Lugares/capacidade<input required type="number" min="1" max="100" value={vehicleForm.capacity} onChange={(event) => setVehicleForm((v) => ({ ...v, capacity: event.target.value }))} className={inputClass} /></label>
          <div className="flex items-end"><button type="submit" disabled={savingVehicle || !termsAccepted} className="w-full rounded-xl bg-[var(--theme-text)] px-5 py-3 text-sm font-semibold text-[var(--theme-background)] disabled:cursor-not-allowed disabled:opacity-50">{savingVehicle ? "A guardar veículo…" : vehicle ? "Atualizar dados do veículo" : "Registar veículo"}</button></div>
        </form>
        {vehicle && <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)]/35 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-[var(--theme-text)]">{vehicle.make} {vehicle.model} · {vehicle.registrationNumber}</h4><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{vehicle.year} · {vehicle.color} · {vehicle.capacity} lugares</p></div><span className="rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-500">{vehicle.status}</span></div></div>}
        <div className="grid gap-3 lg:grid-cols-2">{vehicleDocuments.map((doc) => documentUploadCard(doc, vehicle?.verifications?.find((item) => item.documentType === doc.documentType), true))}</div>
      </section>
    </>}

    <section className="rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">Ajuda</p><h3 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">Perguntas frequentes</h3>
      <div className="mt-3 divide-y divide-[var(--theme-border)]">{FAQ.map(([question, answer]) => <details key={question} className="py-3"><summary className="cursor-pointer text-sm font-medium text-[var(--theme-text)]">{question}</summary><p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">{answer}</p></details>)}</div>
    </section>

    <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void load()} className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Atualizar estado</button><Link href="/app/compliance" className="rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm text-[var(--theme-text)]">Abrir Centro de Conformidade</Link></div>
    <p className="text-xs leading-6 text-[var(--theme-text-muted)]">Formatos aceites: PDF, JPEG, PNG ou WebP até 10 MB por ficheiro. A validação técnica de formato não prova autenticidade. A aprovação final depende de revisão humana, elegibilidade, validade documental e condições legais aplicáveis.</p>
  </section>;
}
