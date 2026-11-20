import MobilityServiceFrame from "@/frontend/features/mobility/components/MobilityServiceFrame";
import MobilityFreightRequestForm from "@/frontend/features/mobility/components/MobilityFreightRequestForm";
import MobilityFreightRequestHistory from "@/frontend/features/mobility/components/MobilityFreightRequestHistory";

export default function MobilityFreightPage() {
  return (
    <MobilityServiceFrame title="Carga e entregas">
      <div className="mobility-service-content space-y-4">
        <MobilityFreightRequestForm />
        <MobilityFreightRequestHistory />
      </div>
    </MobilityServiceFrame>
  );
}
