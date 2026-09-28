"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  rejectionReason: string | null;
  documents: Array<{ id: string; documentType: string; status: string }>;
};

export default function AdminCompliancePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const load = async () => {
    const response = await fetch("/api/compliance/review", { credentials: "include", cache: "no-store" });
    if (!response.ok) return [] as Profile[];
    const data = (await response.json()) as { profiles?: Profile[] };
    return data.profiles ?? [];
  };

  useEffect(() => {
    void load().then(setProfiles);
  }, []);

  const review = async (id: string, status: "VERIFIED" | "REJECTED") => {
    const response = await fetch("/api/compliance/review", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) void load().then(setProfiles);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header>
        <p className="text-sm font-medium text-[var(--theme-muted)]">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--theme-text)]">Compliance Center</h1>
        <p className="mt-2 text-[var(--theme-muted)]">Review KYC, KYD and KYB submissions.</p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--theme-border)]">
              <tr>
                <th className="px-5 py-4 text-[var(--theme-muted)]">Type</th>
                <th className="px-5 py-4 text-[var(--theme-muted)]">Subject</th>
                <th className="px-5 py-4 text-[var(--theme-muted)]">Status</th>
                <th className="px-5 py-4 text-[var(--theme-muted)]">Documents</th>
                <th className="px-5 py-4 text-[var(--theme-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-[var(--theme-border)] last:border-0">
                  <td className="px-5 py-4 font-medium text-[var(--theme-text)]">{profile.subjectType}</td>
                  <td className="px-5 py-4 text-[var(--theme-muted)]">{profile.subjectId}</td>
                  <td className="px-5 py-4 text-[var(--theme-muted)]">{profile.status}</td>
                  <td className="px-5 py-4 text-[var(--theme-muted)]">{profile.documents.length}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => review(profile.id, "VERIFIED")} className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs text-[var(--theme-text)]">Verify</button>
                      <button onClick={() => review(profile.id, "REJECTED")} className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs text-[var(--theme-text)]">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!profiles.length && <p className="p-6 text-sm text-[var(--theme-muted)]">No compliance submissions found.</p>}
      </section>
    </main>
  );
}
