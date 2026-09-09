export default function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-6 border border-neutral-800">
      <p className="text-neutral-400 text-sm">
        {title}
      </p>

      <h3 className="text-3xl font-bold mt-2">
        {value}
      </h3>
    </div>
  );
}
