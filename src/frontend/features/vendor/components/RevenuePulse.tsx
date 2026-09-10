"use client";

import MetricCard from "@/design-system/components/data-display/MetricCard";

import {
  useVendorAnalytics,
} from "../context/VendorAnalyticsProvider";


export default function RevenuePulse() {

  const {
    analytics,
    loading,
  } = useVendorAnalytics();


  if (loading) {

    return (

      <div className="
        grid
        md:grid-cols-3
        gap-6
      ">

        <MetricCard
          title="Revenue"
          value="Loading..."
        />

        <MetricCard
          title="Orders"
          value="Loading..."
        />

        <MetricCard
          title="Growth"
          value="Loading..."
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
        title="Revenue"
        value={`${analytics?.revenue.current ?? 0} ${analytics?.revenue.currency ?? "AOA"}`}
        trend="Business revenue performance"
      />


      <MetricCard
        title="Orders"
        value={String(analytics?.sales.totalOrders ?? 0)}
        trend="Customer transactions"
      />


      <MetricCard
        title="Growth"
        value={`${analytics?.revenue.growthPercentage ?? 0}%`}
        trend="Store evolution"
      />

    </div>

  );

}
