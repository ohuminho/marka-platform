"use client";

import { useEffect, useState } from "react";

type SubjectType = "KYC" | "KYD" | "KYB";
type Profile = {
  id: string;
  subjectType: SubjectType;
  status: string;
  rejectionReason: string | null;
  documents: Array<{
    id: string;
    documentType: string;
    status: string;
    expiresAt: string | null;
  }>;
};

const TYPES: SubjectType[] = ["KYC", "KYD", "KYB"];
const labels: Record<SubjectType, string> = {
  KYC: "Customer identity",
  KYD: "Driver verification",
  KYB: "Business verification",
};
const defaultDocumentTypes: Record<SubjectType, string> = {
  KYC: "National identity document",
  KYD: "Driving licence",
  KYB: "Business registration",
};
const faqs = [
  ["What is KYC?", "Know Your Customer: verification of customer identity."],
  ["What is KYD?", "Know Your Driver: verification of driver identity and required operational documents."],
  ["What is KYB?", "Know Your Business: verification of an organization. You must belong to that organization in MARKA."],
  ["Which files are accepted?", "PDF, JPEG, PNG or WebP, up to 10 MB per document. Files are stored privately and reviewed by an authorized reviewer."],
];

export default function CompliancePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<SubjectType | null>(null);
  const [files, setFiles] = useState<Partial<Record<SubjectType, File>>>({});
  const [documentTypes, setDocumentTypes] = useState<Record<SubjectType, string>>(defaultDocumentTypes);
  const [expiresAt, setExpiresAt] = useState<Partial<Record<SubjectType, string>>>({});
  const [organizationId, setOrganizationId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [inputVersion, setInputVersion] = useState(0);

  const loadProfiles = async () => {
    const response = await fetch("/api/compliance", { credentials: "include", cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message ?? "Unable to load compliance status.");
    }
    const data = await response.json();
    setProfiles(data.profiles ?? []);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfiles()
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load compliance status."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const upload = async (subjectType: SubjectType) => {
    setError("");
    setNotice("");
    const file = files[subjectType];
    if (!file) {
      setError("Select a document before submitting.");
      return;
    }
    if (subjectType === "KYB" && !organizationId.trim()) {
      setError("Enter the organization ID you are authorized to represent.");
      return;
    }
    if (!documentTypes[subjectType].trim()) {
      setError("Enter the document type.");
      return;
    }

    const body = new FormData();
    body.set("file", file);
    body.set("subjectType", subjectType);
    body.set("documentType", documentTypes[subjectType].trim());
    if (expiresAt[subjectType]) body.set("expiresAt", new Date(expiresAt[subjectType] + "T23:59:59.000Z").toISOString());
    if (subjectType === "KYB") body.set("organizationId", organizationId.trim());

    setBusyType(subjectType);
    try {
      const response = await fetch("/api/compliance/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Document upload failed.");
      setNotice("Document uploaded securely and submitted for independent review.");
      setFiles((current) => {
        const next = { ...current };
        delete next[subjectType];
        return next;
      });
      setExpiresAt((current) => ({ ...current, [subjectType]: "" }));
      setInputVersion((value) => value + 1);
      await loadProfiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document upload failed.");
    } finally {
      setBusyType(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <p className="marka-kicker">MARKA / TRUST</p>
        <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-5xl">Identity & Compliance</h1>
        <p className="mt-2 max-w-3xl text-[var(--theme-muted)]">
          Submit identity, driver and business documents through private storage. Verification is completed by an authorized reviewer, not automatically.
        </p>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-[var(--theme-text)]">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-[var(--theme-text)]">{notice}</div>}

      <section className="grid gap-4 lg:grid-cols-3">
        {TYPES.map((type) => {
          const profile = profiles.find((item) => item.subjectType === type);
          return (
            <article key={type} className="space-y-4 rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
              <div>
                <p className="text-sm text-[var(--theme-muted)]">{type}</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--theme-text)]">{labels[type]}</h2>
                <p className="mt-3 text-sm text-[var(--theme-muted)]">Status: <strong>{profile?.status ?? "NOT_STARTED"}</strong></p>
                {profile?.rejectionReason && <p className="mt-2 text-sm text-red-500">{profile.rejectionReason}</p>}
              </div>

              {type === "KYB" && (
                <label className="block text-sm text-[var(--theme-muted)]">
                  Organization ID
                  <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="Organization UUID" className="mt-1 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-[var(--theme-text)]" />
                  <span className="mt-1 block text-xs">Your account must have active membership.</span>
                </label>
              )}

              <label className="block text-sm text-[var(--theme-muted)]">
                Document type
                <input value={documentTypes[type]} onChange={(event) => setDocumentTypes((current) => ({ ...current, [type]: event.target.value }))} maxLength={100} className="mt-1 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-[var(--theme-text)]" />
              </label>

              <label className="block text-sm text-[var(--theme-muted)]">
                Document file
                <input key={inputVersion} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => {
                  const selected = event.target.files?.[0];
                  setFiles((current) => {
                    const next = { ...current };
                    if (selected) next[type] = selected;
                    else delete next[type];
                    return next;
                  });
                }} className="mt-2 block w-full text-sm text-[var(--theme-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--theme-surface-strong)] file:px-3 file:py-2 file:text-[var(--theme-text)]" />
                <span className="mt-1 block text-xs">PDF/JPEG/PNG/WebP · maximum 10 MB</span>
              </label>

              <label className="block text-sm text-[var(--theme-muted)]">
                Expiry date (if applicable)
                <input type="date" value={expiresAt[type] ?? ""} onChange={(event) => setExpiresAt((current) => ({ ...current, [type]: event.target.value }))} className="mt-1 w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-[var(--theme-text)]" />
              </label>

              <button type="button" disabled={busyType !== null} onClick={() => void upload(type)} className="w-full rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] disabled:cursor-not-allowed disabled:opacity-50">
                {busyType === type ? "Uploading securely…" : "Submit for review"}
              </button>
            </article>
          );
        })}
      </section>

      <section className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Submitted documents</h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--theme-muted)]">Loading…</p>
        ) : profiles.every((profile) => profile.documents.length === 0) ? (
          <p className="mt-4 text-sm text-[var(--theme-muted)]">No compliance documents submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {profiles.flatMap((profile) => profile.documents.map((document) => ({ ...document, subjectType: profile.subjectType }))).map((document) => (
              <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] p-4">
                <div>
                  <p className="text-sm font-medium text-[var(--theme-text)]">{document.documentType}</p>
                  <p className="mt-1 text-xs text-[var(--theme-muted)]">{document.subjectType}{document.expiresAt ? ` · Expires ${new Date(document.expiresAt).toLocaleDateString()}` : ""}</p>
                </div>
                <span className="rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs text-[var(--theme-muted)]">{document.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Compliance FAQ</h2>
        <div className="mt-4 divide-y divide-[var(--theme-border)]">
          {faqs.map(([question, answer]) => (
            <details key={question} className="py-4">
              <summary className="cursor-pointer font-medium text-[var(--theme-text)]">{question}</summary>
              <p className="mt-2 text-sm text-[var(--theme-muted)]">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
