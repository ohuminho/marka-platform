"use client";

import React from "react";
import { renderMarkaVehicleSvg, type MarkaVehicleSvgProps } from "./MarkaVehicleFleetSVG";

export interface MarkaVehicleIllustrationProps extends MarkaVehicleSvgProps {
  /** Current category contract. */
  category?: string;
  /** Legacy prop retained for existing Mobility/Freight consumers. */
  kind?: string;
}

export default function MarkaVehicleIllustration({
  category,
  kind,
  className = "h-12 w-28",
  active = false,
}: MarkaVehicleIllustrationProps) {
  const vehicleCategory = category ?? kind ?? "TAXI";
  return (
    <span className="inline-flex items-center justify-center" role="img" aria-label={`Viatura: ${vehicleCategory.toLowerCase().replace(/[_-]/g, " ")}`}>
      {renderMarkaVehicleSvg(vehicleCategory, { className, active })}
    </span>
  );
}
