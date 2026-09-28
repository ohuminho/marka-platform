export default function UserMenu() {
  return (
    <button
      type="button"
      title="Account"
      className="group flex h-10 items-center gap-2 rounded-[13px] border border-transparent bg-transparent px-1.5 transition-all duration-200 hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] sm:pl-2"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--theme-accent)_26%,var(--theme-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-accent)_14%,var(--theme-surface)),var(--theme-surface))] text-[10px] font-semibold tracking-[0.12em] text-[var(--theme-text)]">
        M
      </span>
      <span className="hidden max-w-24 text-left md:block">
        <span className="block truncate text-[10px] font-medium tracking-[0.08em] text-[var(--theme-text)]">ACCOUNT</span>
        <span className="mt-0.5 block truncate text-[9px] text-[var(--theme-text-faint)]">MARKA User</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="hidden h-3.5 w-3.5 text-[var(--theme-text-faint)] md:block" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </button>
  );
}
