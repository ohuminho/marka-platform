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
    <linearGradient id={`${idPrefix}-hull`} x1="14" y1="16" x2="206" y2="74" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#3F3F46" />
      <stop offset="48%" stopColor="#141418" />
      <stop offset="100%" stopColor="#070709" />
    </linearGradient>
    <linearGradient id={`${idPrefix}-goldHull`} x1="16" y1="18" x2="204" y2="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#27272A" />
      <stop offset="55%" stopColor="#121216" />
      <stop offset="100%" stopColor="#060608" />
    </linearGradient>
    <linearGradient id={`${idPrefix}-glass`} x1="65" y1="18" x2="155" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#F5C451" stopOpacity="0.34" />
      <stop offset="55%" stopColor="#27272A" stopOpacity="0.92" />
      <stop offset="100%" stopColor="#09090B" />
    </linearGradient>
    <linearGradient id={`${idPrefix}-tank`} x1="16" y1="16" x2="136" y2="56" gradientUnits="userSpaceOnUse">
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
  const gradientId = `taxi-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="77" rx="94" ry="5.5" fill="#000" fillOpacity="0.65" />
      <path
        d="M15 60C14 52 19 45 32 42L62 36L88 21C99 16 128 16 144 22L173 37L199 42C207 44 210 50 209 58L206 65H182C182 54 173 46 162 46C151 46 142 54 142 65H76C76 54 67 46 56 46C45 46 36 54 36 65H18L15 60Z"
        fill={`url(#${gradientId}-hull)`}
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.2'}
      />
      <path d="M68 36L91 22C101 18 125 18 139 23L162 36H68Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M35 47H188" stroke={gold} strokeWidth="0.85" strokeOpacity="0.45" />
      <path d="M195 50L206 52L197 55Z" fill="#FEF08A" />
      <Wheel cx={56} cy={65} strokeGold={gold} />
      <Wheel cx={162} cy={65} strokeGold={gold} />
    </svg>
  );
};

export const ExecutiveSuvSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `suv-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="95" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path
        d="M17 60V34C17 26 22 19 32 17L53 14H137C147 14 155 19 163 30L197 35C205 37 208 43 208 53V64H184C184 52 174 44 162 44C150 44 140 52 140 64H78C78 52 68 44 56 44C44 44 34 52 34 64H17V60Z"
        fill={`url(#${gradientId}-hull)`}
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.3'}
      />
      <path d="M34 21H135L154 32H34V21Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" strokeOpacity="0.45" />
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
  const gradientId = `moto-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="111" cy="78" rx="83" ry="5" fill="#000" fillOpacity="0.62" />
      <Wheel cx={48} cy={65} r={13.5} strokeGold={gold} />
      <Wheel cx={171} cy={65} r={13.5} strokeGold={gold} />
      <path d="M48 65L75 48L111 48L145 65L171 65M111 48L124 65H145M75 48L91 65H124" stroke="#A1A1AA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M73 43C79 34 92 30 105 33L122 42L112 50H79L67 48L73 43Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth="1.5" />
      <path d="M90 33L100 23C106 18 119 18 126 24L138 36L127 43L111 39L101 43L90 33Z" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth="1.4" />
      <path d="M104 22L111 14L126 15L134 22" stroke={gold} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M137 36L151 31L159 34" stroke={gold} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M83 43H101M112 47L106 59" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M146 42L158 45L165 53" stroke="#A1A1AA" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M70 35L60 31M58 31L54 35" stroke={gold} strokeWidth="2" strokeLinecap="round" />
      <circle cx="174" cy="38" r="4" fill="#FDE68A" fillOpacity=".9" />
    </svg>
  );
};

export const PickupSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `pickup-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="95" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path
        d="M15 37H94V21C94 17 98 15 104 15H138C146 15 153 20 159 31L196 36C204 37 208 43 208 52V64H184C184 52 174 44 162 44C150 44 140 52 140 64H76C76 52 66 44 54 44C42 44 32 52 32 64H15V37Z"
        fill={`url(#${gradientId}-hull)`}
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.3'}
      />
      <path d="M101 19H136L151 32H101V19Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" />
      <path d="M90 37L82 18H94" stroke={gold} strokeWidth="2" strokeLinecap="round" />
      <Wheel cx={54} cy={64} r={14.5} strokeGold={gold} />
      <Wheel cx={162} cy={64} r={14.5} strokeGold={gold} />
    </svg>
  );
};

export const CargoVanSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `van-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="111" cy="78" rx="96" ry="5.5" fill="#000" fillOpacity=".68" />
      <path d="M17 22C17 18 20 15 25 15H139C145 15 149 19 149 25V58H17V22Z" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth={active ? "1.8" : "1.3"} />
      <path d="M149 27H173C183 27 193 33 199 44L207 58H149V27Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth={active ? "1.8" : "1.3"} />
      <path d="M158 32H174C182 32 188 37 193 45H158V32Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth=".9" />
      <path d="M28 24H137V51H28V24Z" stroke={gold} strokeWidth=".9" strokeOpacity=".38" />
      <path d="M137 25V58M17 58H208" stroke={gold} strokeWidth="1.1" strokeOpacity=".65" />
      <path d="M35 27V48M130 27V48" stroke="#A1A1AA" strokeWidth=".8" strokeOpacity=".35" />
      <Wheel cx={54} cy={65} r={13.5} strokeGold={gold} />
      <Wheel cx={174} cy={65} r={13.5} strokeGold={gold} />
      <path d="M198 49H205" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export const LightTruckDynaSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `dyna-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="111" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity=".68" />
      <path d="M12 28H135V57H12V28Z" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth={active ? "1.8" : "1.3"} />
      <path d="M17 33H130M17 42H130M17 51H130" stroke={gold} strokeOpacity=".32" strokeWidth=".8" />
      <path d="M138 18H177C188 18 196 25 201 39L207 57H138V18Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth={active ? "1.8" : "1.3"} />
      <path d="M148 23H176C183 23 189 28 193 38H148V23Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth=".9" />
      <path d="M137 18V58M132 58H208" stroke={gold} strokeWidth="1.1" strokeOpacity=".65" />
      <path d="M16 58H208" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" />
      <Wheel cx={46} cy={65} r={13.5} strokeGold={gold} />
      <Wheel cx={174} cy={65} r={13.5} strokeGold={gold} />
      <path d="M18 29V56M128 29V56" stroke={gold} strokeWidth="1" strokeOpacity=".55" />
    </svg>
  );
};

export const TipperTruckSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `tipper-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity="0.72" />
      <rect x="16" y="55" width="188" height="5" rx="2" fill="#27272A" stroke={gold} strokeWidth="0.9" />
      {/* Caçamba basculante reforçada */}
      <path d="M14 22H142L135 54H20L14 22Z" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M28 22V54M56 22V54M84 22V54M112 22V54" stroke={gold} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Cabine */}
      <path d="M148 16H184C193 16 200 23 203 35L206 55H148V16Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M156 21H182L193 36H156V21Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" />
      <Wheel cx={38} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={66} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export const WaterTankerSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `tanker-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity="0.72" />
      <rect x="14" y="55" width="192" height="5" rx="2" fill="#27272A" stroke={gold} strokeWidth="0.9" />
      {/* Tanque cilíndrico de cisterna */}
      <rect
        x="16"
        y="20"
        width="126"
        height="34"
        rx="16"
        fill={`url(#${gradientId}-tank)`}
        stroke={gold}
        strokeWidth={active ? '1.8' : '1.35'}
      />
      {/* Anéis estruturais e linha de nível/volume */}
      <path d="M46 21V53M79 21V53M112 21V53" stroke={gold} strokeWidth="1" strokeOpacity="0.55" />
      <path d="M24 37H134" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.55" strokeDasharray="5 3" />
      {/* Cabine frontal */}
      <path d="M148 16H184C193 16 200 23 203 35L206 55H148V16Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M156 21H182L193 36H156V21Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" />
      <Wheel cx={42} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={70} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export const HeavyTruckSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `heavy-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="99" ry="5.5" fill="#000" fillOpacity="0.72" />
      <rect x="12" y="55" width="194" height="5" rx="2" fill="#27272A" stroke={gold} strokeWidth="0.9" />
      <rect x="12" y="18" width="132" height="36" rx="2" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M150 14H185C194 14 201 21 204 34L206 55H150V14Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M158 19H183L194 35H158V19Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" />
      <Wheel cx={36} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={64} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};


export const CargoTricycleSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `tricycle-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="108" cy="77" rx="82" ry="5" fill="#000" fillOpacity="0.65" />
      <Wheel cx={48} cy={65} r={12} strokeGold={gold} />
      <Wheel cx={158} cy={65} r={12} strokeGold={gold} />
      <Wheel cx={184} cy={65} r={12} strokeGold={gold} />
      <path d="M48 65L66 43H112L158 65M112 43L130 65H184" stroke={gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 22H135L145 43H62L68 22Z" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth="1.4" />
      <path d="M78 27H126L132 38H72L78 27Z" fill={`url(#${gradientId}-glass)`} />
      <path d="M56 42H146" stroke={gold} strokeWidth="1.5" />
    </svg>
  );
};

export const FlatbedTruckSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `flatbed-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path d="M12 52H148V58H12Z" fill="#27272A" stroke={gold} strokeWidth="1.2" />
      <path d="M16 45H144M22 40V52M42 40V52M62 40V52M82 40V52M102 40V52M122 40V52M142 40V52" stroke={gold} strokeWidth="1" />
      <path d="M151 16H184C193 16 200 23 203 35L206 55H151V16Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth={active ? '1.8' : '1.3'} />
      <path d="M159 21H182L193 36H159V21Z" fill={`url(#${gradientId}-glass)`} stroke={gold} strokeWidth="0.8" />
      <Wheel cx={38} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={68} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export const SpecializedVehicleSvg: React.FC<MarkaVehicleSvgProps> = ({ className = 'w-24 h-11', active = false }) => {
  const gold = active ? '#F7CE62' : '#D4AF37';
  const gradientId = `special-${React.useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 220 92" fill="none" className={className} aria-hidden="true">
      <SharedDefs idPrefix={gradientId} />
      <ellipse cx="110" cy="78" rx="98" ry="5.5" fill="#000" fillOpacity="0.7" />
      <path d="M15 54H205V60H15Z" fill="#27272A" stroke={gold} strokeWidth="1" />
      <rect x="20" y="22" width="116" height="30" rx="3" fill={`url(#${gradientId}-hull)`} stroke={gold} strokeWidth="1.4" />
      <path d="M148 16H184C193 16 200 23 203 35L206 55H148V16Z" fill={`url(#${gradientId}-goldHull)`} stroke={gold} strokeWidth="1.4" />
      <path d="M156 21H182L193 36H156V21Z" fill={`url(#${gradientId}-glass)`} />
      <path d="M36 30H119M36 38H119M36 46H119" stroke={gold} strokeOpacity=".45" />
      <Wheel cx={42} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={72} cy={65} r={13} strokeGold={gold} />
      <Wheel cx={178} cy={65} r={13} strokeGold={gold} />
    </svg>
  );
};

export function renderMarkaVehicleSvg(
  category: string,
  props: MarkaVehicleSvgProps = {}
): React.ReactNode {
  const normalized = category.toUpperCase().replace(/-/g, '_');
  switch (normalized) {
    case 'MOTO_TAXI':
    case 'MOTORCYCLE':
    case 'BIKE':
      return <MotoTaxiSvg {...props} />;
    case 'EXECUTIVE_SUV':
      return <ExecutiveSuvSvg {...props} />;
    case 'EXECUTIVE_SEDAN':
    case 'TAXI':
      return <TaxiSedanSvg {...props} />;
    case 'PICKUP':
    case 'TRUCK_PICKUP':
    case 'HILUX':
    case 'TOYOTA_HILUX':
      return <PickupSvg {...props} />;
    case 'CARGO_TRICYCLE':
      return <CargoTricycleSvg {...props} />;
    case 'CARGO_VAN':
    case 'VAN':
    case 'CLOSED_VAN':
      return <CargoVanSvg {...props} />;
    case 'LIGHT_TRUCK':
    case 'MEDIUM_TRUCK':
    case 'CANTER':
    case 'DYNA':
    case 'TOYOTA_DYNA':
      return <LightTruckDynaSvg {...props} />;
    case 'FLATBED_TRUCK':
      return <FlatbedTruckSvg {...props} />;
    case 'TIPPER_TRUCK':
    case 'DUMP_TRUCK':
    case 'BASCULANTE':
      return <TipperTruckSvg {...props} />;
    case 'WATER_TANKER':
      return <WaterTankerSvg {...props} />;
    case 'HEAVY_TRUCK':
    case 'TRUCK':
    case 'BUS':
    case 'COACH':
      return <HeavyTruckSvg {...props} />;
    case 'SPECIALIZED':
      return <SpecializedVehicleSvg {...props} />;
    default:
      return <TaxiSedanSvg {...props} />;
  }
}
