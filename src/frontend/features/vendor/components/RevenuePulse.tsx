"use client";

import MetricCard from "@/design-system/components/data-display/MetricCard";

import {
  useVendorIntelligence,
} from "../context/VendorIntelligenceProvider";


export default function RevenuePulse() {


  const {
    intelligence,
    loading,
  } =
    useVendorIntelligence();



  if (loading) {

    return (

      <div className="
        grid
        md:grid-cols-3
        gap-6
      ">

        <MetricCard
          title="Business Intelligence"
          value="Loading"
          trend="Synchronizing store data"
        />

      </div>

    );

  }



  return (

    <div className="
      grid
      md:grid-cols-3
      gap-6
    ">


      <MetricCard

        title="Active Products"

        value={
          String(
            intelligence?.catalogue.activeProducts ?? 0
          )
        }

        trend="Live catalogue availability"

      />



      <MetricCard

        title="Inventory Units"

        value={
          String(
            intelligence?.inventory.units ?? 0
          )
        }

        trend="Current stock capacity"

      />



      <MetricCard

        title="Inventory Value"

        value={
          `${(
            intelligence?.inventory.estimatedValue ?? 0
          ).toLocaleString()} AOA`
        }

        trend="Estimated catalogue value"

      />


    </div>

  );

}
