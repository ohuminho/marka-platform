import MetricCard from "@/design-system/components/data-display/MetricCard";


export default function RevenuePulse() {

  return (

    <div className="
      grid
      md:grid-cols-3
      gap-6
    ">

      <MetricCard
        title="Revenue"
        value="0 AOA"
        trend="Business performance tracking"
      />


      <MetricCard
        title="Orders"
        value="0"
        trend="Customer transactions"
      />


      <MetricCard
        title="Growth"
        value="0%"
        trend="Store evolution"
      />

    </div>

  );

}
