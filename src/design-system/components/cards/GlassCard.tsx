import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-[32px]
        border border-[var(--theme-border)]
        bg-[var(--theme-surface)]
        backdrop-blur-2xl
        shadow-2xl
        transition-all duration-500
        hover:border-[var(--theme-accent-strong)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
