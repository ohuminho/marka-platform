import { ReactNode } from "react";

export default function PremiumCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`
        rounded-[1.25rem]
        border border-[var(--theme-border)]
        bg-[var(--theme-surface)]
        backdrop-blur-xl
        p-6
        transition-colors duration-300
        ${className}
      `}
    >
      {children}
    </section>
  );
}
