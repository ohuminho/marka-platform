"use client";

export default function NotificationButton() {
  return (
    <button
      aria-label="Notifications"
      className="relative h-11 w-11 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-xl transition hover:bg-[var(--theme-surface-strong)]"
    >
      <span className="absolute left-3 top-3 h-5 w-5 rounded-full border border-[var(--theme-accent-strong)]" />
    </button>
  );
}
