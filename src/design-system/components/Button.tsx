export default function Button({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button className="rounded-xl bg-[var(--theme-accent)] px-6 py-3 font-semibold text-[var(--theme-background)] transition hover:opacity-90">
      {children}
    </button>
  );
}
