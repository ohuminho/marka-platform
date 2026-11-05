"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CONSENT_KEY = "marka_growth_consent_v1";
const VISITOR_KEY = "marka_growth_visitor_v1";

function getVisitorId() {
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export default function PrivacyConsentGrowth() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"unknown" | "accepted" | "declined">("unknown");

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "declined") setConsent(saved);
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || !pathname) return;
    const allowedPath = pathname.slice(0, 300);
    void fetch("/api/growth/events", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "page_view",
        consent: true,
        visitorId: getVisitorId(),
        path: allowedPath,
      }),
    }).catch(() => undefined);
  }, [consent, pathname]);

  function choose(value: "accepted" | "declined") {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
  }

  if (consent !== "unknown") return null;

  return (
    <aside aria-label="Preferências de privacidade" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#101114] p-4 text-white shadow-2xl sm:inset-x-6 sm:p-5">
      <p className="text-sm font-semibold">Ajudar a melhorar a MARKA</p>
      <p className="mt-1 text-xs leading-5 text-white/65">
        Com a tua autorização, registamos páginas visitadas e interacções essenciais para compreender o que funciona e melhorar a experiência. Não vendemos estes dados nem activamos esta medição sem consentimento.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose("accepted")} className="rounded-full bg-[#e8c887] px-4 py-2 text-xs font-bold text-[#17120a]">Aceitar análise</button>
        <button type="button" onClick={() => choose("declined")} className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white">Recusar</button>
        <a href="/legal/privacy" className="px-2 py-2 text-xs text-white/60 underline underline-offset-4">Privacidade</a>
      </div>
    </aside>
  );
}
