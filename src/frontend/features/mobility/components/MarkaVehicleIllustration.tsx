"use client";

import { useId } from "react";

type MarkaVehicleIllustrationProps = {
  kind: string;
  className?: string;
};

function Wheel({ cx, cy, r = 29, goldId }: { cx: number; cy: number; r?: number; goldId: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#111111" stroke={`url(#${goldId})`} strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r * 0.69} fill="none" stroke={`url(#${goldId})`} strokeWidth="2.2" opacity="1" />
      <circle cx={cx} cy={cy} r={r * 0.43} fill="#0B0B0B" stroke={`url(#${goldId})`} strokeWidth="6" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r="4.5" fill={`url(#${goldId})`} />
    </g>
  );
}

export default function MarkaVehicleIllustration({
  kind,
  className = "h-24 w-full max-w-[22rem]",
}: MarkaVehicleIllustrationProps) {
  const instanceId = useId().replace(/:/g, "");
  const bodyId = `${instanceId}-vehicle-body`;
  const goldId = `${instanceId}-vehicle-gold`;
  const glassId = `${instanceId}-vehicle-glass`;
  const glowId = `${instanceId}-vehicle-glow`;
  const normalized = kind.toUpperCase().replaceAll("-", "_");
  const isMotorcycle = ["MOTORCYCLE", "BIKE", "MOTO_TAXI"].includes(normalized);
  const isTricycle = normalized === "CARGO_TRICYCLE";
  const isTanker = normalized === "WATER_TANKER";
  const isTipper = ["TIPPER_TRUCK", "DUMP_TRUCK"].includes(normalized);
  const isTow = normalized === "TOW_TRUCK";
  const isPickup = normalized === "PICKUP";
  const isVan = ["VAN", "CARGO_VAN", "CLOSED_VAN"].includes(normalized);
  const isMinibus = normalized === "MINIBUS";
  const isBus = ["BUS", "COACH"].includes(normalized);
  const isCoach = normalized === "COACH";
  const isHeavy = ["HEAVY_TRUCK", "FLATBED_TRUCK", "LIGHT_TRUCK", "TRUCK", "SERVICE_VEHICLE", "SPECIALIZED"].includes(normalized);
  const isPhantom = ["PHANTOM", "EXECUTIVE", "LUXURY_SEDAN"].includes(normalized);
  const isSuv = normalized === "SUV";

  return (
    <svg viewBox="0 0 520 220" role="img" aria-label={`Ilustração de viatura: ${kind.replaceAll("_", " ").toLowerCase()}`} className={className} fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#08090A" /><stop offset=".5" stopColor="#34302A" /><stop offset="1" stopColor="#090909" />
        </linearGradient>
        <linearGradient id={goldId} x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E8D8B0" /><stop offset=".5" stopColor="#B99A62" /><stop offset="1" stopColor="#756044" />
        </linearGradient>
        <linearGradient id={glassId} x1="0" y1="78" x2="0" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B7B0A3" /><stop offset=".45" stopColor="#55514A" /><stop offset="1" stopColor="#191A1B" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>

      <ellipse cx="260" cy="190" rx="226" ry="9" fill="#000" opacity=".48" filter={`url(#${glowId})`} />

      {isMotorcycle ? (
        <g stroke={`url(#${goldId})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <Wheel cx={137} cy={166} r={31} goldId={goldId} /><Wheel cx={386} cy={166} r={31} goldId={goldId} />
          <path d="M137 166 208 118 270 166H218L190 132 166 166M270 166 321 116 350 116 386 166" fill="none" />
          <path d="M204 118 229 96Q245 88 266 98L296 119 277 139H233Z" fill={`url(#${bodyId})`} />
          <path d="M213 112Q229 91 257 95L280 109 263 119H221Z" fill={`url(#${glassId})`} strokeWidth="1.5" />
          <path d="M190 130Q198 113 221 111L244 122 233 137H198Z" fill={`url(#${bodyId})`} />
          <path d="M177 112 204 112 214 119M315 116 332 93 355 93M346 93H369M328 145 350 145 360 154M226 91 217 82H197M353 93 363 84" fill="none" strokeWidth="4" />
          <path d="M279 127 307 127M129 153 145 153M378 153 394 153" strokeWidth="2" opacity=".55" />
        </g>
      ) : isTricycle ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <Wheel cx={132} cy={166} r={27} goldId={goldId} /><Wheel cx={390} cy={166} r={27} goldId={goldId} />
          <path d="M78 132 92 112H276L303 126V166H75Z" fill={`url(#${bodyId})`} />
          <path d="M90 115H264V139H90Z" fill={`url(#${glassId})`} />
          <path d="M287 130 337 130 366 144V166H287Z" fill={`url(#${bodyId})`} />
          <path d="M75 145H447M78 151H440M100 122H255M315 140H355M304 166H419" fill="none" opacity=".65" />
        </g>
      ) : isTanker ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M58 145 77 135H151L177 112H440Q459 112 459 133V163H57Z" fill={`url(#${bodyId})`} />
          <path d="M175 112Q188 91 211 91H404Q439 91 448 112V145H175Z" fill={`url(#${bodyId})`} />
          <path d="M191 112Q202 98 222 98H397Q423 98 433 112M180 119H442M180 139H442" fill="none" opacity=".75" />
          <path d="M290 91V112M309 91V112M205 91V83H224V91M61 145H159L176 163H60Z" fill="none" />
          <Wheel cx={112} cy={168} r={24} goldId={goldId} /><Wheel cx={385} cy={168} r={24} goldId={goldId} /><Wheel cx={438} cy={168} r={24} goldId={goldId} />
        </g>
      ) : isBus ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d={isCoach ? "M34 145V92Q34 75 55 75H453Q482 75 482 101V165H34Z" : "M48 145V91Q48 78 64 78H445Q472 78 472 101V165H48Z"} fill={`url(#${bodyId})`} />
          <path d={isCoach ? "M59 88H449Q462 88 462 102V124H59Z" : "M69 91H443Q455 91 455 103V125H69Z"} fill={`url(#${glassId})`} />
          <path d="M59 130H459M59 137H459M34 151H482M34 160H482" fill="none" opacity=".65" />
          {Array.from({ length: isCoach ? 8 : 7 }, (_, index) => <path key={index} d={`M${105 + index * (isCoach ? 43 : 47)} 89V125`} stroke={`url(#${goldId})`} strokeWidth="1.5" opacity=".75" />)}
          <Wheel cx={112} cy={168} r={25} goldId={goldId} /><Wheel cx={260} cy={168} r={25} goldId={goldId} /><Wheel cx={425} cy={168} r={25} goldId={goldId} />
          {isCoach && <path d="M72 145H440M85 78V70H435" fill="none" opacity=".5" />}
        </g>
      ) : isMinibus ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M68 150V105Q68 87 86 87H404Q431 87 447 111L464 137V165H68Z" fill={`url(#${bodyId})`} />
          <path d="M91 97H398Q416 97 430 117L439 135H91Z" fill={`url(#${glassId})`} />
          <path d="M91 140H449M91 148H449M164 97V135M238 97V135M312 97V135M386 97V135" fill="none" opacity=".7" />
          <Wheel cx={145} cy={168} r={25} goldId={goldId} /><Wheel cx={395} cy={168} r={25} goldId={goldId} />
        </g>
      ) : isVan ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M55 151V91Q55 76 73 76H357Q378 76 393 97L449 132V165H55Z" fill={`url(#${bodyId})`} />
          <path d="M83 88H348Q363 88 376 104L399 132H83Z" fill={`url(#${glassId})`} />
          <path d="M83 140H438M83 148H438M174 88V132M280 88V132M357 92 389 132" fill="none" opacity=".7" />
          <path d="M410 142H447" strokeWidth="3" />
          <Wheel cx={145} cy={168} r={25} goldId={goldId} /><Wheel cx={391} cy={168} r={25} goldId={goldId} />
        </g>
      ) : isPickup ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M43 148 62 133H151L188 94Q199 82 222 82H305Q327 82 342 102L363 132H461V165H43Z" fill={`url(#${bodyId})`} />
          <path d="M197 95H302Q317 95 329 111L345 132H167Z" fill={`url(#${glassId})`} />
          <path d="M363 137H458V151H363ZM48 151H461M171 139H350M365 144H454" fill="none" opacity=".75" />
          <Wheel cx={137} cy={168} r={25} goldId={goldId} /><Wheel cx={407} cy={168} r={25} goldId={goldId} />
        </g>
      ) : isTipper || isTow || isHeavy ? (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M48 143 69 131H159L187 94Q198 82 220 82H294Q316 82 330 105L350 132H474V166H48Z" fill={`url(#${bodyId})`} />
          <path d="M196 95H291Q308 95 319 114L331 132H168Z" fill={`url(#${glassId})`} />
          {isTipper ? (
            <g>
              <path d="M352 83 477 56 486 112 361 139Z" fill={`url(#${bodyId})`} />
              <path d="M361 139 486 112V150H361Z" fill={`url(#${bodyId})`} />
              <path d="M366 134 468 112M348 137 386 160" fill="none" strokeWidth="4" />
            </g>
          ) : isTow ? (
            <g>
              <path d="M349 133H488V145H349Z" fill={`url(#${bodyId})`} />
              <path d="M374 132 431 96 449 96 405 139M449 96 462 81" fill="none" strokeWidth="4" />
              <path d="M460 81 472 88" fill="none" strokeWidth="2" />
            </g>
          ) : (
            <g>
              <path d="M350 105H485V146H350Z" fill={`url(#${bodyId})`} />
              <path d="M360 113H476M360 125H476M360 137H476M352 148H482" fill="none" opacity=".65" strokeWidth="2" />
            </g>
          )}
          <path d="M48 151H486" fill="none" opacity=".55" strokeWidth="2" />
          <Wheel cx={120} cy={168} r={24} goldId={goldId} /><Wheel cx={370} cy={168} r={24} goldId={goldId} /><Wheel cx={438} cy={168} r={24} goldId={goldId} />
        </g>
      ) : (
        <g stroke={`url(#${goldId})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d={isSuv ? "M31 150 52 128 88 119 119 86Q130 76 158 76H329Q359 76 379 102L410 129 488 143V166H31Z" : "M25 155Q25 139 52 132L110 124 160 95Q174 82 220 82H328Q364 82 395 108L444 126 477 133Q495 138 495 158V170Q495 184 475 184H42Q25 184 25 166Z"} fill={`url(#${bodyId})`} />
          <path d={isSuv ? "M127 88H326Q350 88 366 109L383 128H91Z" : "M175 100 200 90Q214 86 240 86V122H165Z"} fill={`url(#${glassId})`} />
          {!isSuv && <path d="M248 88H310Q328 88 341 105L350 122H248Z" fill={`url(#${glassId})`} />}
          {isSuv && <path d="M216 87V128M300 87V128" strokeWidth="2" opacity=".8" />}
          {!isSuv && <path d="M242 88V122" strokeWidth="4" />}
          <path d="M30 148H490M30 153H350" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          <rect x="280" y="132" width="48" height="5" rx="2.5" fill={`url(#${goldId})`} stroke="none" />
          <path d="M488 145H494V158H486Z" fill="#E8D8B0" stroke="none" />
          {isPhantom && <path d="M478 122Q478 118 482 112Q486 118 486 122L482 126Z" fill={`url(#${goldId})`} stroke="none" />}
          <Wheel cx={125} cy={168} r={32} goldId={goldId} /><Wheel cx={400} cy={168} r={32} goldId={goldId} />
          <path d="M380 120 460 128 430 135 370 130Z" fill="#B99A62" opacity=".12" stroke="none" />
        </g>
      )}
      <path d="M42 185H478" stroke={`url(#${goldId})`} strokeWidth="1.5" opacity=".55" />
    </svg>
  );
}
