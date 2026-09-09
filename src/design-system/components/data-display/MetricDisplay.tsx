interface Props {
  label: string;
  value: string;
}

export default function MetricDisplay({
  label,
  value,
}: Props) {
  return (
    <div>
      <p className="text-sm text-neutral-400">
        {label}
      </p>

      <h2 className="text-4xl font-semibold">
        {value}
      </h2>
    </div>
  );
}
