"use client";

import MobilityServiceFrame from "@/frontend/features/mobility/components/MobilityServiceFrame";
import MobilityFreightRequestForm from "@/frontend/features/mobility/components/MobilityFreightRequestForm";
import MobilityFreightRequestHistory from "@/frontend/features/mobility/components/MobilityFreightRequestHistory";

export default function MobilityFreightWorkspace() {
  return (
    <MobilityServiceFrame title="Carga e entregas">
      {(mapPoint, requestMapPoint) => (
        <div className="mobility-service-content space-y-4">
          <MobilityFreightRequestForm mapPoint={mapPoint} onRequestMapPoint={requestMapPoint} />
          <MobilityFreightRequestHistory />
        </div>
      )}
    </MobilityServiceFrame>
  );
}
