interface Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export default function LuxuryButton({ children, variant = "primary" }: Props) {
  return (
    <button
      className={`
        rounded-full px-6 py-3 font-medium transition backdrop-blur-xl
        ${
          variant === "primary"
            ? "bg-[var(--theme-text)] text-[var(--theme-background)] hover:scale-105"
            : "bg-[var(--theme-surface-strong)] text-[var(--theme-text)] border border-[var(--theme-border)]"
        }
      `}
    >
      {children}
    </button>
  );
}
