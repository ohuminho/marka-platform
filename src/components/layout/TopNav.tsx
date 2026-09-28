export default function TopNav() {
  return (
    <nav className="w-full border-b border-[var(--theme-border)] px-8 py-5">
      <div className="flex justify-between items-center">
        <span className="text-2xl font-bold tracking-wide">
          MARKA
        </span>

        <span className="text-sm text-[var(--theme-text-muted)]">
          Super App Platform
        </span>
      </div>
    </nav>
  );
}
