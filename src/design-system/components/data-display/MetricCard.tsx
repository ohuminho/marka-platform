import GlassCard from "../cards/GlassCard";


interface MetricCardProps {

  title: string;

  value: string;

  trend?: string;

}


export default function MetricCard({

  title,

  value,

  trend,

}: MetricCardProps) {


  return (

    <GlassCard className="p-8">

      <p className="text-sm text-white/60">

        {title}

      </p>


      <h3 className="
        mt-4
        text-4xl
        font-semibold
        tracking-tight
      ">

        {value}

      </h3>


      {trend && (

        <p className="
          mt-3
          text-sm
          text-white/50
        ">

          {trend}

        </p>

      )}

    </GlassCard>

  );

}
