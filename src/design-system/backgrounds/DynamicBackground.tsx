"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const EDITORIAL_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2400&q=72",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2400&q=72",
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=2400&q=72",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=2400&q=72",
];

const EXPERIENCE_INDEX: Record<string, number> = {
  marketplace: 0,
  mobility: 1,
  wallet: 2,
  finance: 2,
  admin: 3,
  account: 3,
  dashboard: 0,
};

function getInitialIndex(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[1] ?? segments[0] ?? "";
  return EXPERIENCE_INDEX[segment.toLowerCase()] ?? 0;
}

export default function DynamicBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initialIndex = useMemo(() => getInitialIndex(pathname ?? "/"), [pathname]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [incomingIndex, setIncomingIndex] = useState(initialIndex);
  const [showIncoming, setShowIncoming] = useState(false);

  useEffect(() => {
    setActiveIndex(initialIndex);
    setIncomingIndex(initialIndex);
    setShowIncoming(false);
  }, [initialIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextIndex = (activeIndex + 1) % EDITORIAL_BACKGROUNDS.length;
      setIncomingIndex(nextIndex);
      window.requestAnimationFrame(() => setShowIncoming(true));

      window.setTimeout(() => {
        setActiveIndex(nextIndex);
        setShowIncoming(false);
      }, 1900);
    }, 14000);

    return () => window.clearInterval(timer);
  }, [activeIndex]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--theme-background)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.15] blur-[1px]"
        style={{ backgroundImage: `url("${EDITORIAL_BACKGROUNDS[activeIndex]}")` }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat blur-[1px] transition-opacity duration-[1800ms] ease-out motion-reduce:transition-none"
        style={{
          backgroundImage: `url("${EDITORIAL_BACKGROUNDS[incomingIndex]}")`,
          opacity: showIncoming ? 0.15 : 0,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--theme-background) 88%, transparent), color-mix(in srgb, var(--theme-background) 74%, transparent) 48%, color-mix(in srgb, var(--theme-background) 90%, transparent))",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,95,60,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_38%)]"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
