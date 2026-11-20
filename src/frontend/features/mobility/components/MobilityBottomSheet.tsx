"use client";

import { type ReactNode } from "react";

type Props = {
  expanded: boolean;
  onToggle: () => void;
  heightClassName: string;
  children: ReactNode;
  className?: string;
};

export default function MobilityBottomSheet({
  expanded,
  onToggle,
  heightClassName,
  children,
  className = "",
}: Props) {
  return (
    <section
      className={
        "absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0d0d0f]/75 shadow-[0_-20px_70px_rgba(0,0,0,.28)] backdrop-blur-xl sm:bottom-4 sm:rounded-[28px] " +
        heightClassName +
        " " +
        className
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? "Recolher painel" : "Expandir painel"}
        aria-expanded={expanded}
        className="mx-auto flex h-7 w-16 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8a24a]"
      >
        <span className="h-1 w-10 rounded-full bg-gradient-to-r from-white/20 via-[#c8a24a]/90 to-white/20" />
      </button>
      {children}
    </section>
  );
}
