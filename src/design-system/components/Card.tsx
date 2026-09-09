export default function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      {children}
    </div>
  );
}
