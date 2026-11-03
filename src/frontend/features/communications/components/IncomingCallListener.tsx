"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type IncomingCall = {
  id: string; callerName: string; mode: "AUDIO" | "VIDEO"; expiresAt: string;
  conversationId: string | null; threadId: string | null; contextLabel: string;
};

const POLL_INTERVAL_MS = 6000;

export default function IncomingCallListener() {
  const router = useRouter();
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissedId, setDismissedId] = useState("");

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let activeController: AbortController | null = null;

    const refresh = async () => {
      if (disposed || document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      activeController = new AbortController();
      try {
        const response = await fetch("/api/comms/incoming-calls", {
          credentials: "include",
          cache: "no-store",
          signal: activeController.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (disposed) return;
        const incoming = (data.calls ?? []).find((item: IncomingCall) => item.id !== dismissedId);
        setCall(incoming ?? null);
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          // Incoming-call discovery is best-effort; call sessions remain durable server-side.
        }
      } finally {
        inFlight = false;
        activeController = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
      else activeController?.abort();
    };

    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      activeController?.abort();
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [dismissedId]);

  async function reject() {
    if (!call || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/messages/calls/${encodeURIComponent(call.id)}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT" }),
      });
      setDismissedId(call.id); setCall(null);
    } finally { setBusy(false); }
  }

  function openInbox() {
    if (!call) return;
    const contextId = call.threadId ?? call.conversationId;
    if (!contextId) return;
    router.push(`/app/messages?conversationId=${encodeURIComponent(contextId)}`);
    setDismissedId(call.id);
    setCall(null);
  }

  if (!call) return null;
  return (
    <div role="alertdialog" aria-label="Chamada recebida" className="fixed inset-x-3 top-[82px] z-[120] mx-auto max-w-lg rounded-2xl border border-[var(--theme-accent)]/35 bg-[var(--theme-surface)] p-4 shadow-[0_24px_80px_rgba(0,0,0,.3)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[var(--theme-accent-strong)]">MARKA · chamada recebida</p><p className="mt-1 text-sm font-semibold text-[var(--theme-text)]">{call.callerName} · {call.mode === "VIDEO" ? "Videochamada" : "Chamada de voz"}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{call.contextLabel}</p></div>
        <span className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
      </div>
      <div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={openInbox} className="rounded-full bg-[var(--theme-text)] px-4 py-2.5 text-xs font-semibold text-[var(--theme-background)]">Abrir chamada</button><button type="button" disabled={busy} onClick={() => void reject()} className="rounded-full border border-[var(--theme-border)] px-4 py-2.5 text-xs text-[var(--theme-text)]">Recusar</button></div>
    </div>
  );
}
