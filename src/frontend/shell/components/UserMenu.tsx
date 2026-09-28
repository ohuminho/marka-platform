export default function UserMenu() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
      <div className="h-10 w-10 rounded-full bg-[var(--theme-surface-strong)]" />
      <div className="hidden md:block">
        <p className="text-sm text-[var(--theme-text)]">Account</p>
        <p className="text-xs text-[var(--theme-text-muted)]">MARKA User</p>
      </div>
    </div>
  );
}
