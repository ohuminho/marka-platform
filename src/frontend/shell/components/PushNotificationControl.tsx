"use client";

import { useEffect, useState } from "react";

type PushConfig = {
  enabled: boolean;
  publicKey: string | null;
  subscribed: boolean;
};

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export default function PushNotificationControl() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    void fetch("/api/comms/push-subscriptions", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) return null;
        const value = await response.json() as PushConfig;
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        return { ...value, subscribed: Boolean(subscription) };
      })
      .then(value => {
        if (active && value?.enabled && value.publicKey) setConfig(value);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function toggle() {
    if (!config || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const existing = await registration.pushManager.getSubscription();
      if (config.subscribed && existing) {
        const response = await fetch("/api/comms/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        if (!response.ok) throw new Error("Não foi possível desactivar os alertas.");
        await existing.unsubscribe();
        setConfig(current => current ? { ...current, subscribed: false } : current);
        setMessage("Alertas desactivados neste dispositivo.");
        return;
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("A permissão de notificações não foi concedida.");
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(config.publicKey!),
      });
      const response = await fetch("/api/comms/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        // Never leave a browser subscription locally active when the server did not
        // bind it to the currently authenticated MARKA account.
        await subscription.unsubscribe();
        throw new Error("Não foi possível registar este dispositivo.");
      }
      setConfig(current => current ? { ...current, subscribed: true } : current);
      setMessage("Alertas activados neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível configurar alertas.");
    } finally {
      setBusy(false);
    }
  }

  if (!config) return null;
  return (
    <div className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        aria-label={config.subscribed ? "Desactivar alertas neste dispositivo" : "Activar alertas neste dispositivo"}
        title={config.subscribed ? "Alertas activos — tocar para desactivar" : "Activar alertas de chamadas"}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-[10px] font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)] disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        <span className="hidden xl:inline">{busy ? "…" : config.subscribed ? "Alertas activos" : "Activar alertas"}</span>
      </button>
      {message && <span role="status" className="absolute right-0 top-11 z-[110] w-56 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 text-[10px] text-[var(--theme-text)] shadow-xl">{message}</span>}
    </div>
  );
}
