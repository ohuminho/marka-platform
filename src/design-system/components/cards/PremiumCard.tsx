import { ReactNode } from "react";

export default function PremiumCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`
        rounded-3xl
        border border-[var(--theme-border)]
        bg-[var(--theme-surface-strong)]
        backdrop-blur-2xl
        shadow-2xl
        p-8
        ${className}
      `}
    >
      {children}
    </section>
  );
}
