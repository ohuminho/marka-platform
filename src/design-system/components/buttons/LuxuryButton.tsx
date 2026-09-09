interface Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export default function LuxuryButton({
  children,
  variant = "primary",
}: Props) {
  return (
    <button
      className={`
        rounded-full
        px-6
        py-3
        font-medium
        transition
        backdrop-blur-xl
        ${
          variant === "primary"
            ? "bg-white text-black hover:scale-105"
            : "bg-white/10 text-white border border-white/20"
        }
      `}
    >
      {children}
    </button>
  );
}
