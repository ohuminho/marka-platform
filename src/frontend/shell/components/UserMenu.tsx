export default function UserMenu() {
  return (
    <button
      type="button"
      title="Account"
      className="group flex h-9 items-center gap-2 border border-transparent px-1.5 transition-colors hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] sm:pl-2"
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--theme-accent)_34%,var(--theme-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-accent)_15%,var(--theme-surface)),var(--theme-surface))] text-[9px] font-semibold tracking-[0.12em] text-[var(--theme-text)]">
        M
        <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[var(--theme-header)] bg-[var(--theme-accent)]" />
      </span>
      <span className="hidden max-w-24 text-left md:block">
        <span className="block truncate text-[9px] font-semibold tracking-[0.13em] text-[var(--theme-text)]">ACCOUNT</span>
        <span className="mt-0.5 block truncate text-[8px] tracking-[0.03em] text-[var(--theme-text-faint)]">MARKA User</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="hidden h-3 w-3 text-[var(--theme-text-faint)] md:block" fill="none" stroke="currentColor" strokeWidth="1.35">
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </button>
  );
}
