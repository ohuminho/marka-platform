"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatformPreferences } from "@/frontend/providers/preferences/PlatformPreferencesProvider";
import { usePlatformTranslation } from "@/frontend/providers/preferences/platform-i18n";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
};

function timeLabel(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = language === "pt" ? "pt-PT" : language === "en" ? "en-GB" : language;
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date);
}

function notificationDestination(item: NotificationItem): string | null {
  const data = item.data && typeof item.data === "object" ? item.data as Record<string, unknown> : {};
  const requestId = typeof data.requestId === "string" && /^[0-9a-f-]{36}$/i.test(data.requestId) ? data.requestId : null;
  switch (item.type) {
    case "PRIVATE_SERVICE_OFFER":
    case "PRIVATE_SERVICE_CLOSED": return "/app/private-services";
    case "PRIVATE_SERVICE_INTEREST":
    case "PRIVATE_SERVICE_SELECTED": return requestId ? "/app/private-services/" + encodeURIComponent(requestId) : "/app/private-services";
    case "PRIVATE_PROFESSIONAL_REVIEW": return "/app/private-services/profile";
    default: return null;
  }
}

export default function NotificationButton() {
  const { language } = usePlatformPreferences();
  const t = usePlatformTranslation(language);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? t.signInNotifications : t.notificationsLoadFailed);
      const payload = await response.json();
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setUnread(Number(payload.unreadCount) || 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.notificationLoadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => { void refresh(); }, 45000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  async function markRead(id: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      setItems(current => current.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread(current => Math.max(0, current - 1));
    }
  }

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) await markRead(item.id);
    const destination = notificationDestination(item);
    if (destination) window.location.assign(destination);
  }
  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (response.ok) {
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
    }
  }

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-label={unread ? `${t.notifications}, ${unread} ${t.unread}` : t.notifications}
        aria-expanded={open}
        title={t.notifications}
        onClick={() => { setOpen(value => !value); if (!open) void refresh(); }}
        className="group relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-transparent bg-transparent text-[var(--theme-text-muted)] transition-colors hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)]/55 hover:text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--theme-accent-strong)] px-1 text-[9px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <section aria-label={t.notificationCenter} className="absolute right-0 top-12 z-[100] flex max-h-[min(620px,80vh)] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl">
          <header className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--theme-text)]">{t.notifications}</h2>
              <p className="mt-0.5 text-[11px] text-[var(--theme-text-muted)]">{unread} {t.unread}</p>
            </div>
            <button type="button" disabled={unread === 0} onClick={() => void markAllRead()} className="text-[11px] font-medium text-[var(--theme-accent-strong)] disabled:opacity-40">{t.markAllRead}</button>
          </header>
          <div className="overflow-y-auto">
            {loading && items.length === 0 && <p className="px-4 py-8 text-center text-xs text-[var(--theme-text-muted)]">{t.loading}</p>}
            {error && <p role="alert" className="px-4 py-5 text-center text-xs text-rose-500">{error}</p>}
            {!loading && !error && items.length === 0 && <div className="px-5 py-10 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--theme-border)]/50 text-[var(--theme-text-muted)]">♧</div><p className="text-sm font-medium text-[var(--theme-text)]">{t.allCaughtUp}</p><p className="mt-1 text-xs text-[var(--theme-text-muted)]">{t.notificationsWillAppear}</p></div>}
            {items.map(item => (
              <button key={item.id} type="button" onClick={() => { void openNotification(item); }} className="flex w-full gap-3 border-b border-[var(--theme-border)]/70 px-4 py-3 text-left transition-colors hover:bg-[var(--theme-border)]/20">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-[var(--theme-accent-strong)]"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[var(--theme-text)]">{item.title}</span>
                  <span className="mt-1 block whitespace-normal text-xs leading-relaxed text-[var(--theme-text-muted)]">{item.message}</span>
                  <span className="mt-1.5 block text-[10px] text-[var(--theme-text-muted)]">{timeLabel(item.createdAt, language)}</span>
                </span>
              </button>
            ))}
          </div>
          <footer className="border-t border-[var(--theme-border)] px-4 py-2 text-center text-[10px] text-[var(--theme-text-muted)]">{t.autoRefresh}</footer>
        </section>
      )}
    </div>
  );
}
