export default function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--theme-surface)] p-6 border border-[var(--theme-border)]">
      <p className="text-[var(--theme-text-muted)] text-sm">
        {title}
      </p>

      <h3 className="text-3xl font-bold mt-2">
        {value}
      </h3>
    </div>
  );
}
