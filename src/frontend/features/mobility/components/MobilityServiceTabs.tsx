"use client";

import Link from "next/link";

export type MobilityServiceKey = "taxi" | "moto" | "cargo";

type Props = {
  active: MobilityServiceKey;
  onSelect?: (service: Exclude<MobilityServiceKey, "cargo">) => void;
};

const tabs: Array<{ id: MobilityServiceKey; label: string; href: string }> = [
  { id: "taxi", label: "Táxi", href: "/app/mobility" },
  { id: "moto", label: "Moto", href: "/app/mobility?service=moto" },
  { id: "cargo", label: "Carga / Entrega", href: "/app/mobility/carga" },
];

export default function MobilityServiceTabs({ active, onSelect }: Props) {
  return (
    <nav aria-label="Serviços MARKA Mobility" className="mobility-service-tabs grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/25 p-1">
      {tabs.map((tab) => {
        const selected = active === tab.id;
        const className = "flex min-h-10 items-center justify-center rounded-xl px-2 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8a24a] " +
          (selected
            ? "border border-[#c8a24a]/45 bg-[#c8a24a]/12 text-[#e8c77c]"
            : "border border-transparent text-white/60 hover:bg-white/[.06] hover:text-white");
        if ((tab.id === "taxi" || tab.id === "moto") && onSelect) {
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => onSelect(tab.id as "taxi" | "moto")} className={className}>
              {tab.label}
            </button>
          );
        }
        return (
          <Link key={tab.id} href={tab.href} role="tab" aria-selected={selected} aria-current={selected ? "page" : undefined} className={className}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
