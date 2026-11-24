import React from 'react';

export type MarkaVehicleCategoryKey =
  | 'TAXI'
  | 'EXECUTIVE_SEDAN'
  | 'EXECUTIVE_SUV'
  | 'MOTO_TAXI'
  | 'CARGO_TRICYCLE'
  | 'PICKUP'
  | 'CARGO_VAN'
  | 'LIGHT_TRUCK'
  | 'FLATBED_TRUCK'
  | 'TIPPER_TRUCK'
  | 'HEAVY_TRUCK'
  | 'WATER_TANKER'
  | 'SPECIALIZED';

export interface MarkaVehicleSvgProps {
  className?: string;
  active?: boolean;
}

const SharedDefs: React.FC<{ idPrefix: string }> = ({ idPrefix }) => (
  <defs>
    <linearGradient id={\`${idPrefix}-hull\`} x1="14" y1="16" x2="206" y2="74" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#3F3F46" />
      <stop offset="48%" stopColor="#141418" />
      <stop offset="100%" stopColor="#070709" />
    </linearGradient>
    <linearGradient id={\`${idPrefix}-goldHull\`} x1="16" y1="18" x2="204" y2="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#27272A" />
      <stop offset="55%" stopColor="#121216" />
      <stop offset="100%" stopColor="#060608" />
    </linearGradient>
    <linearGradient id={\`${idPrefix}-glass\`} x1="65" y1="18" x2="155" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#F5C451" stopOpacity="0.34" />
      <stop offset="55%" stopColor="#27272A" stopOpacity="0.92" />
      <stop offset="100%" stopColor="#09090B" />
    </linearGradient>
    <linearGradient id={\`${idPrefix}-tank\`} x1="16" y1="16" x2="136" y2="56" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#52525B" />
      <stop offset="45%" stopColor="#1C1C21" />
      <stop offset="100%" stopColor="#09090B" />
    </linearGradient>
  </defs>
);

const Wheel: React.FC<{ cx: number; cy: number; r?: number; strokeGold: string }> = ({
  cx,
  cy,
  r = 13.5,
  strokeGold,
}) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#09090B" stroke="#52525B" strokeWidth="2.1" />
    <circle cx={cx} cy={cy} r={r * 0.64} fill="#18181B" stroke={strokeGold} strokeWidth="1.25" />
    <circle cx={cx} cy={cy} r={r * 0.22} fill={strokeGold} />
  </g>
);

export const TaxiSedanSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="taxi" />
      <ellipse cx="110" cy="77" rx="94" ry="5.5" fill="#000" fillOpacity="0.65" />
      <path
        d="M15 60C14 52 19 45 32 42L62 36L88 21C99 16 128 16 144 22L173 37L199 42C207 44 210 50 209 58L206 65H182C182 54 173 46 162 46C151 46 142 54 142 65H76C76 54 67 46 56 46C45 46 36 54 36 65H18L15 60Z"
        fill="url(#taxi-hull)"
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.2'}
      />
      <path d="M68 36L91 22C101 18 125 18 139 23L162 36H68Z" fill="url(#taxi-glass)" stroke={gold} strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M35 47H188" stroke={gold} strokeWidth="0.85" strokeOpacity="0.45" />
      <path d="M195 50L206 52L197 55Z" fill="#FEF08A" />
      <Wheel cx={56} cy={65} strokeGold={gold} />
      <Wheel cx={162} cy={65} strokeGold={gold} />
    </svg>
  );
};

export const ExecutiveSuvSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="suv" />
      <ellipse cx="110" cy="78" rx="95" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path
        d="M17 60V34C17 26 22 19 32 17L53 14H137C147 14 155 19 163 30L197 35C205 37 208 43 208 53V64H184C184 52 174 44 162 44C150 44 140 52 140 64H78C78 52 68 44 56 44C44 44 34 52 34 64H17V60Z"
        fill="url(#suv-hull)"
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.3'}
      />
      <path d="M34 21H135L154 32H34V21Z" fill="url(#suv-glass)" stroke={gold} strokeWidth="0.8" strokeOpacity="0.45" />
      <line x1="75" y1="21" x2="75" y2="32" stroke="#09090B" strokeWidth="2.8" />
      <line x1="113" y1="21" x2="113" y2="32" stroke="#09090B" strokeWidth="2.8" />
      <path d="M195 42H206V47H195V42Z" fill="#FEF08A" />
      <Wheel cx={56} cy={64} r={14.5} strokeGold={gold} />
      <Wheel cx={162} cy={64} r={14.5} strokeGold={gold} />
    </svg>
  );
};

export const MotoTaxiSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="moto" />
      <ellipse cx="112" cy="77" rx="76" ry="5" fill="#000" fillOpacity="0.65" />
      <Wheel cx={56} cy={64} r={13} strokeGold={gold} />
      <Wheel cx={166} cy={64} r={13} strokeGold={gold} />
      <path
        d="M56 64L84 44H128L152 30L166 64"
        stroke={gold}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74 40H116L134 26C141 22 149 24 152 31L132 45H82L74 40Z"
        fill="url(#moto-goldHull)"
        stroke={gold}
        strokeWidth="1.3"
      />
      <path d="M148 24L158 29" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const PickupSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="pickup" />
      <ellipse cx="110" cy="78" rx="95" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path
        d="M15 37H94V21C94 17 98 15 104 15H138C146 15 153 20 159 31L196 36C204 37 208 43 208 52V64H184C184 52 174 44 162 44C150 44 140 52 140 64H76C76 52 66 44 54 44C42 44 32 52 32 64H15V37Z"
        fill="url(#pickup-hull)"
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.3'}
      />
      <path d="M101 19H136L151 32H101V19Z" fill="url(#pickup-glass)" stroke={gold} strokeWidth="0.8" />
      <path d="M90 37L82 18H94" stroke={gold} strokeWidth="2" strokeLinecap="round" />
      <Wheel cx={54} cy={64} r={14.5} strokeGold={gold} />
      <Wheel cx={162} cy={64} r={14.5} strokeGold={gold} />
    </svg>
  );
};

export const CargoVanSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="van" />
      <ellipse cx="110" cy="78" rx="95" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path
        d="M16 24C16 19 20 16 25 16H146C158 16 169 22 178 34L202 42C206 44 208 48 208 54V64H184C184 52 174 44 162 44C150 44 140 52 140 64H76C76 52 66 44 54 44C42 44 32 52 32 64H16V24Z"
        fill="url(#van-hull)"
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.3'}
      />
      <path d="M150 21H164L178 35H150V21Z" fill="url(#van-glass)" stroke={gold} strokeWidth="0.8" />
      <rect x="28" y="24" width="112" height="24" rx="2" stroke={gold} strokeWidth="0.75" strokeOpacity="0.35" strokeDasharray="4 3" />
      <Wheel cx={54} cy={64} r={13.5} strokeGold={gold} />
      <Wheel cx={162} cy={64} r={13.5} strokeGold={gold} />
    </svg>
  );
};

export const LightTruckDynaSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="dyna" />
      <ellipse cx="110" cy="78" rx="97" ry="5.5" fill="#000" fillOpacity="0.7" />
      <rect x="13" y="27" width="125" height="31" rx="2" fill="url(#dyna-hull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <line x1="44" y1="27" x2="44" y2="58" stroke={gold} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="75" y1="27" x2="75" y2="58" stroke={gold} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="106" y1="27" x2="106" y2="58" stroke={gold} strokeWidth="1" strokeOpacity="0.5" />
      <path d="M144 15H182C191 15 198 22 202 35L206 58H144V15Z" fill="url(#dyna-goldHull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M153 20H180L192 36H153V20Z" fill="url(#dyna-glass)" stroke={gold} strokeWidth="0.8" />
      <Wheel cx={48} cy={65} r={13.5} strokeGold={gold} />
      <Wheel cx={174} cy={65} r={13.5} strokeGold={gold} />
    </svg>
  );
};

export const TipperTruckSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="tipper" />
      <ellipse cx="110" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity="0.72" />
      <rect x="16" y="55" width="188" height="5" rx="2" fill="#27272A" stroke={gold} strokeWidth="0.9" />
      {/* Caçamba basculante reforçada */}
      <path d="M14 22H142L135 54H20L14 22Z" fill="url(#tipper-hull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M28 22V54M56 22V54M84 22V54M112 22V54" stroke={gold} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Cabine */}
      <path d="M148 16H184C193 16 200 23 203 35L206 55H148V16Z" fill="url(#tipper-goldHull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M156 21H182L193 36H156V21Z" fill="url(#tipper-glass)" stroke={gold} strokeWidth="0.8" />
      <Wheel cx={38} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={66} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export const WaterTankerSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="tanker" />
      <ellipse cx="110" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity="0.72" />
      <rect x="14" y="55" width="192" height="5" rx="2" fill="#27272A" stroke={gold} strokeWidth="0.9" />
      {/* Tanque cilíndrico de cisterna */}
      <rect
        x="16"
        y="20"
        width="126"
        height="34"
        rx="16"
        fill="url(#tanker-tank)"
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.35'}
      />
      {/* Anéis estruturais e linha de nível/volume */}
      <path d="M46 21V53M79 21V53M112 21V53" stroke={gold} strokeWidth="1" strokeOpacity="0.55" />
      <path d="M24 37H134" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.55" strokeDasharray="5 3" />
      {/* Cabine frontal */}
      <path d="M148 16H184C193 16 200 23 203 35L206 55H148V16Z" fill="url(#tanker-goldHull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M156 21H182L193 36H156V21Z" fill="url(#tanker-glass)" stroke={gold} strokeWidth="0.8" />
      <Wheel cx={42} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={70} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export const HeavyTruckSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix="heavy" />
      <ellipse cx="110" cy="78" rx="99" ry="5.5" fill="#000" fillOpacity="0.72" />
      <rect x="12" y="55" width="194" height="5" rx="2" fill="#27272A" stroke={gold} strokeWidth="0.9" />
      <rect x="12" y="18" width="132" height="36" rx="2" fill="url(#heavy-hull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M150 14H185C194 14 201 21 204 34L206 55H150V14Z" fill="url(#heavy-goldHull)" stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M158 19H183L194 35H158V19Z" fill="url(#heavy-glass)" stroke={gold} strokeWidth="0.8" />
      <Wheel cx={36} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={64} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export function renderMarkaVehicleSvg(
  category: string,
  props: MarkaVehicleSvgProps = {}
): React.ReactNode {
  switch (category) {
    case 'MOTO_TAXI':
      return <MotoTaxiSvg {...props} />;
    case 'EXECUTIVE_SUV':
      return <ExecutiveSuvSvg {...props} />;
    case 'EXECUTIVE_SEDAN':
      return <TaxiSedanSvg {...props} />;
    case 'PICKUP':
      return <PickupSvg {...props} />;
    case 'CARGO_VAN':
    case 'SPECIALIZED':
      return <CargoVanSvg {...props} />;
    case 'LIGHT_TRUCK':
    case 'FLATBED_TRUCK':
    case 'CARGO_TRICYCLE':
      return <LightTruckDynaSvg {...props} />;
    case 'TIPPER_TRUCK':
      return <TipperTruckSvg {...props} />;
    case 'WATER_TANKER':
      return <WaterTankerSvg {...props} />;
    case 'HEAVY_TRUCK':
      return <HeavyTruckSvg {...props} />;
    case 'TAXI':
    default:
      return <TaxiSedanSvg {...props} />;
  }
}
