"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  subjectType: "KYC" | "KYD" | "KYB";
  status: string;
  rejectionReason: string | null;
  documents: Array<{
    id: string;
    documentType: string;
    status: string;
    expiresAt: string | null;
  }>;
};

const faqs = [
  ["What is KYC?", "Know Your Customer: verification of customer identity."],
  ["What is KYD?", "Know Your Driver: verification of driver identity and required operational documents."],
  ["What is KYB?", "Know Your Business: verification of a business or organization."],
  ["Why can verification be pending?", "Information may be incomplete or under compliance review."],
];

export default function CompliancePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/compliance", { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : { profiles: [] })
      .then((data) => setProfiles(data.profiles ?? []))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (subjectType: "KYC" | "KYD" | "KYB") => {
    const response = await fetch("/api/compliance", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subjectType, documents: [] }),
    });
    if (response.ok) {
      const data = await response.json();
      setProfiles(data.profiles ?? []);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <p className="marka-kicker">MARKA / TRUST</p>
        <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-5xl">Identity & Compliance</h1>
        <p className="mt-2 max-w-3xl text-[var(--theme-muted)]">
          Manage KYC, KYD and KYB requirements and track verification status.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {(["KYC", "KYD", "KYB"] as const).map((type) => {
          const profile = profiles.find((item) => item.subjectType === type);
          return (
            <article key={type} className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
              <p className="text-sm text-[var(--theme-muted)]">{type}</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--theme-text)]">
                {type === "KYC" ? "Customer" : type === "KYD" ? "Driver" : "Business"}
              </h2>
              <p className="mt-4 text-sm text-[var(--theme-muted)]">
                Status: <strong>{profile?.status ?? "NOT_STARTED"}</strong>
              </p>
              <button
                type="button"
                onClick={() => submit(type)}
                className="mt-5 rounded-xl border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text)]"
              >
                Start / update
              </button>
            </article>
          );
        })}
      </section>

      <section className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Documents</h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--theme-muted)]">Loading…</p>
        ) : profiles.every((profile) => profile.documents.length === 0) ? (
          <p className="mt-4 text-sm text-[var(--theme-muted)]">No compliance documents submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {profiles.flatMap((profile) => profile.documents).map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded-2xl border border-[var(--theme-border)] p-4">
                <span className="text-sm text-[var(--theme-text)]">{document.documentType}</span>
                <span className="text-sm text-[var(--theme-muted)]">{document.status}</span>
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
