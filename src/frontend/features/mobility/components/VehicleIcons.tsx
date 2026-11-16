import React from "react";

export interface VehicleIconProps {
  className?: string;
  accentColor?: string;
}

export const SedanExecutivoSVG: React.FC<VehicleIconProps> = ({ className = "w-24 h-11", accentColor = "#E5B84B" }) => (
  <svg viewBox="0 0 120 52" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sedan executivo">
    <path d="M12 34L16 24C18 20 24 18 32 18L46 11C52 8 66 8 74 11L90 18C100 19 108 23 110 29L111 34C111 36 109 38 106 38H98C98 32 93 27 87 27C81 27 76 32 76 38H42C42 32 37 27 31 27C25 27 20 32 20 38H14C12 38 11 36 12 34Z" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M36 18L48 12H71L84 18H36Z" fill="#27272A" stroke={accentColor} strokeWidth="0.8"/>
    <circle cx="31" cy="38" r="7.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="31" cy="38" r="3" fill={accentColor}/>
    <circle cx="87" cy="38" r="7.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="87" cy="38" r="3" fill={accentColor}/>
  </svg>
);

export const PickupHiluxSVG: React.FC<VehicleIconProps> = ({ className = "w-24 h-11", accentColor = "#E5B84B" }) => (
  <svg viewBox="0 0 120 52" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pick-up de caixa aberta">
    <path d="M10 21H52V13C52 10 55 9 59 9H78C83 9 87 13 90 18L106 20C110 21 112 24 112 29V34H99C99 27 93 22 86 22C79 22 73 27 73 34H43C43 27 37 22 30 22C23 22 17 27 17 34H10V21Z" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M56 12H77L84 18H56V12Z" fill="#27272A" stroke={accentColor} strokeWidth="0.8"/>
    <path d="M50 21L46 11H52" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="30" cy="35" r="8.5" fill="#09090B" stroke={accentColor} strokeWidth="2"/><circle cx="30" cy="35" r="3.5" fill={accentColor}/>
    <circle cx="86" cy="35" r="8.5" fill="#09090B" stroke={accentColor} strokeWidth="2"/><circle cx="86" cy="35" r="3.5" fill={accentColor}/>
  </svg>
);

export const CanterDynaSVG: React.FC<VehicleIconProps> = ({ className = "w-24 h-11", accentColor = "#E5B84B" }) => (
  <svg viewBox="0 0 120 52" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Camião ligeiro urbano">
    <rect x="8" y="17" width="68" height="16" rx="1.5" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <line x1="25" y1="17" x2="25" y2="33" stroke={accentColor} strokeWidth="1"/><line x1="42" y1="17" x2="42" y2="33" stroke={accentColor} strokeWidth="1"/><line x1="59" y1="17" x2="59" y2="33" stroke={accentColor} strokeWidth="1"/>
    <path d="M79 11H99C104 11 108 15 110 22L112 33H79V11Z" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M84 14H98L104 22H84V14Z" fill="#27272A" stroke={accentColor} strokeWidth="0.8"/>
    <circle cx="28" cy="36" r="7.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="28" cy="36" r="3" fill={accentColor}/>
    <circle cx="94" cy="36" r="7.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="94" cy="36" r="3" fill={accentColor}/>
  </svg>
);

export const CarrinhaFechadaSVG: React.FC<VehicleIconProps> = ({ className = "w-24 h-11", accentColor = "#E5B84B" }) => (
  <svg viewBox="0 0 120 52" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carrinha fechada">
    <path d="M10 14C10 11 12 9 15 9H86C94 9 102 14 107 22L111 30V35H97C97 29 92 24 86 24C80 24 75 29 75 35H39C39 29 34 24 28 24C22 24 17 29 17 35H10V14Z" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M82 12H93L101 21H82V12Z" fill="#27272A" stroke={accentColor} strokeWidth="0.8"/>
    <line x1="16" y1="21" x2="76" y2="21" stroke={accentColor} strokeWidth="0.8" strokeDasharray="3 2"/>
    <circle cx="28" cy="36" r="7.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="28" cy="36" r="3" fill={accentColor}/>
    <circle cx="86" cy="36" r="7.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="86" cy="36" r="3" fill={accentColor}/>
  </svg>
);

export const BasculanteSVG: React.FC<VehicleIconProps> = ({ className = "w-24 h-11", accentColor = "#E5B84B" }) => (
  <svg viewBox="0 0 120 52" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Camião basculante">
    <rect x="10" y="30" width="98" height="4" fill="#27272A" stroke={accentColor} strokeWidth="1"/>
    <path d="M8 12H74L70 28H12L8 12Z" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M78 10H98C103 10 107 14 109 21L111 30H78V10Z" fill="#18181B" stroke={accentColor} strokeWidth="1.5"/>
    <path d="M83 13H97L103 21H83V13Z" fill="#27272A" stroke={accentColor} strokeWidth="0.8"/>
    <circle cx="22" cy="37" r="6.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="38" cy="37" r="6.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/><circle cx="95" cy="37" r="6.5" fill="#09090B" stroke={accentColor} strokeWidth="1.8"/>
  </svg>
);
