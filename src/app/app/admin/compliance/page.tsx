"use client";

import { useEffect, useState } from "react";

type ComplianceDocument = {
  id: string;
  documentType: string;
  status: string;
  expiresAt: string | null;
  rejectionReason: string | null;
};
type Profile = {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  documents: ComplianceDocument[];
};

export default function AdminCompliancePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/compliance/review", { credentials: "include", cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message ?? "Unable to load the compliance queue.");
    }
    const data = (await response.json()) as { profiles?: Profile[] };
    setProfiles(data.profiles ?? []);
  };

  useEffect(() => {
    void load()
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load the compliance queue."))
      .finally(() => setLoading(false));
  }, []);

  const review = async (profile: Profile, status: "VERIFIED" | "REJECTED" | "IN_REVIEW" | "SUSPENDED") => {
    setError(null);
    setNotice(null);
    let reason: string | undefined;
    if (status === "REJECTED" || status === "SUSPENDED") {
      reason = window.prompt(status === "REJECTED" ? "Reason for rejection (required):" : "Reason for suspension (required):")?.trim() ?? "";
      if (!reason) {
        setError("A clear reason is required.");
        return;
      }
    }
    setBusyId(profile.id);
    try {
      const response = await fetch("/api/compliance/review", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: profile.id, status, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "The review action could not be completed.");
      setNotice(`Profile status updated to ${status}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review action could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  const reviewDocument = async (document: ComplianceDocument, action: "signed-url" | "review-document", status?: "VERIFIED" | "REJECTED") => {
    setError(null);
    setNotice(null);
    let reason: string | undefined;
    if (status === "REJECTED") {
      reason = window.prompt("Reason for rejecting this document (required):")?.trim() ?? "";
      if (!reason) {
        setError("A clear document rejection reason is required.");
        return;
      }
    }
    const viewer = action === "signed-url" ? window.open("about:blank", "_blank") : null;
    setBusyId(document.id);
    try {
      const response = await fetch("/api/compliance/document-review", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, documentId: document.id, status, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Document review could not be completed.");
      if (action === "signed-url") {
        if (viewer && data.signedUrl) {
          viewer.location.href = data.signedUrl;
          setNotice("Evidence link created. It expires after five minutes.");
        } else {
          viewer?.close();
          throw new Error("The evidence viewer was blocked by the browser. Allow pop-ups and try again.");
        }
      } else {
        setNotice(`Document status updated to ${status}.`);
        await load();
      }
    } catch (cause) {
      viewer?.close();
      setError(cause instanceof Error ? cause.message : "Document review could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header>
        <p className="text-sm font-medium text-[var(--theme-muted)]">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Compliance Center</h1>
        <p className="mt-2 max-w-3xl text-[var(--theme-muted)]">
          Inspect private evidence using short-lived links, review each document, and then decide the overall profile. Identity owners cannot approve their own KYC.
        </p>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-[var(--theme-text)]">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-[var(--theme-text)]">{notice}</div>}

      <section className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        {loading ? (
          <p className="p-6 text-sm text-[var(--theme-muted)]">Loading compliance queue…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--theme-border)]">
                <tr>
                  <th className="px-5 py-4 text-[var(--theme-muted)]">Type</th>
                  <th className="px-5 py-4 text-[var(--theme-muted)]">Subject reference</th>
                  <th className="px-5 py-4 text-[var(--theme-muted)]">Status</th>
                  <th className="px-5 py-4 text-[var(--theme-muted)]">Evidence</th>
                  <th className="px-5 py-4 text-[var(--theme-muted)]">Submitted</th>
                  <th className="px-5 py-4 text-[var(--theme-muted)]">Profile actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const hasCurrentVerifiedEvidence = profile.documents.length > 0 && profile.documents.every(
                    (document) => document.status === "VERIFIED" && (!document.expiresAt || new Date(document.expiresAt).getTime() > Date.now()),
                  );
                  const busy = busyId !== null;
                  return (
                    <tr key={profile.id} className="border-b border-[var(--theme-border)] last:border-0 align-top">
                      <td className="px-5 py-4 font-medium text-[var(--theme-text)]">{profile.subjectType}</td>
                      <td className="max-w-56 break-all px-5 py-4 font-mono text-xs text-[var(--theme-muted)]">{profile.subjectId}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-[var(--theme-border)] px-2.5 py-1 text-xs text-[var(--theme-text)]">{profile.status}</span>
                        {profile.rejectionReason && <p className="mt-2 max-w-64 text-xs text-[var(--theme-muted)]">{profile.rejectionReason}</p>}
                      </td>
                      <td className="min-w-80 px-5 py-4">
                        <p className="text-[var(--theme-text)]">{profile.documents.length} document(s)</p>
                        {profile.documents.length > 0 && (
                          <ul className="mt-3 space-y-4">
                            {profile.documents.map((document) => (
                              <li key={document.id} className="rounded-xl border border-[var(--theme-border)] p-3">
                                <p className="text-xs text-[var(--theme-text)]"><strong>{document.documentType}</strong> · {document.status}</p>
                                {document.expiresAt && <p className="mt-1 text-xs text-[var(--theme-muted)]">Expires {new Date(document.expiresAt).toLocaleDateString()}</p>}
                                {document.rejectionReason && <p className="mt-1 text-xs text-red-500">{document.rejectionReason}</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button disabled={busy} onClick={() => void reviewDocument(document, "signed-url")} className="rounded-lg border border-[var(--theme-border)] px-2.5 py-1.5 text-xs text-[var(--theme-text)] disabled:opacity-40">
                                    {busyId === document.id ? "Working…" : "View evidence"}
                                  </button>
                                  <button disabled={busy || document.status === "VERIFIED" || Boolean(document.expiresAt && new Date(document.expiresAt).getTime() <= Date.now())} onClick={() => void reviewDocument(document, "review-document", "VERIFIED")} className="rounded-lg border border-emerald-600/40 px-2.5 py-1.5 text-xs text-[var(--theme-text)] disabled:opacity-40">
                                    Approve document
                                  </button>
                                  <button disabled={busy} onClick={() => void reviewDocument(document, "review-document", "REJECTED")} className="rounded-lg border border-red-500/40 px-2.5 py-1.5 text-xs text-[var(--theme-text)] disabled:opacity-40">
                                    Reject document
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        {!hasCurrentVerifiedEvidence && <p className="mt-2 max-w-64 text-xs text-amber-600">Profile approval requires every document to be independently verified and current.</p>}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--theme-muted)]">{profile.submittedAt ? new Date(profile.submittedAt).toLocaleString() : "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-32 flex-wrap gap-2">
                          <button disabled={busy || !hasCurrentVerifiedEvidence || profile.status === "VERIFIED"} onClick={() => void review(profile, "VERIFIED")} title={!hasCurrentVerifiedEvidence ? "Current verified evidence is required" : "Approve profile"} className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs text-[var(--theme-text)] disabled:cursor-not-allowed disabled:opacity-40">Verify profile</button>
                          <button disabled={busy} onClick={() => void review(profile, "IN_REVIEW")} className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs text-[var(--theme-text)] disabled:opacity-40">Review</button>
                          <button disabled={busy} onClick={() => void review(profile, "REJECTED")} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-[var(--theme-text)] disabled:opacity-40">Reject profile</button>
                          {profile.status === "VERIFIED" && <button disabled={busy} onClick={() => void review(profile, "SUSPENDED")} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs text-[var(--theme-text)] disabled:opacity-40">Suspend</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !profiles.length && <p className="p-6 text-sm text-[var(--theme-muted)]">No compliance submissions found.</p>}
      </section>
    </main>
  );
}
