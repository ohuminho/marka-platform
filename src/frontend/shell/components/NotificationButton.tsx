"use client";

export default function NotificationButton() {
  return (
    <button
      aria-label="Notifications"
      title="Notifications"
      className="group relative flex h-10 w-10 items-center justify-center rounded-[13px] border border-transparent bg-transparent text-[var(--theme-text-muted)] transition-all duration-200 hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-y-px" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      <span className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-[var(--theme-accent-strong)] opacity-80" />
    </button>
  );
}
