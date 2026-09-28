"use client";

import { useVendor } from "../context/VendorProvider";
import RevenuePulse from "./RevenuePulse";
import InventoryHealth from "./InventoryHealth";
import StorePerformance from "./StorePerformance";
import StoreLocationCard from "./StoreLocationCard";

export default function VendorOverview() {
  const { vendor } = useVendor();

  return (
    <div className="space-y-10">
      <header>
        <p className="marka-kicker">MARKA / BUSINESS</p>
        <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-5xl">
          Vendor Command Center
        </h1>

        <p className="mt-3 text-white/50">
          Your business intelligence workspace.
        </p>
      </header>

      <RevenuePulse />

      {vendor?.store ? (
        <StoreLocationCard store={vendor.store} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <InventoryHealth />
        <StorePerformance />
      </div>
    </div>
  );
}
