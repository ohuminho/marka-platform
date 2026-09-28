export default function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
      {children}
    </div>
  );
}
