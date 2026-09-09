export default function Button({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black hover:opacity-90 transition">
      {children}
    </button>
  );
}
