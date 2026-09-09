export default function DynamicBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="
      min-h-screen
      bg-gradient-to-br
      from-neutral-950
      via-neutral-900
      to-neutral-800
      relative
      overflow-hidden
    ">
      <div className="
        absolute
        inset-0
        opacity-40
        blur-3xl
        bg-gradient-to-r
        from-blue-500
        via-purple-500
        to-cyan-500
      "/>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
