"use client";

import { useMemo, useState } from "react";
import { statusLabels, type StatusLevel } from "@/lib/status";
import { summarizeZones, type BikeZone, type ZonePart, type ZoneSummary } from "@/lib/zones";
import { cn } from "@/lib/utils";
import { useZones } from "./zone-context";

// Side view, drive side, front wheel on the right. Coordinates are in drawing units; the
// view box crops to the bike itself (tyres left/right/bottom, saddle on top).
// Frame points follow the Canyon Ultimate CF SL in size M (stack 560, reach 393, head angle
// 73.25°, seat angle 73.5°, chainstay 410, wheelbase 987, BB drop 72) at 0.446 units per mm.
const VIEW = { x: 25, y: 25, w: 765, h: 455 };
const REAR = { x: 185, y: 320 };
const FRONT = { x: 625, y: 320 };
const BB = { x: 365, y: 352 };
const SEAT = { x: 301, y: 134 }; // top of the seat tube
const HEAD_TOP = { x: 540, y: 102 };
const HEAD_BOTTOM = { x: 560, y: 168 };
const TIRE_R = 150; // 700x28
const RIM_R = 136;
const RIM_INNER_R = 116; // deep-section rim

const zoneColor: Record<StatusLevel, string> = {
  ok: "var(--foreground)",
  none: "color-mix(in oklab, var(--foreground) 55%, transparent)",
  due: "var(--status-due)",
  overdue: "var(--status-overdue)",
};

function spokes(cx: number, cy: number) {
  return Array.from({ length: 20 }, (_, i) => {
    const a = (i * Math.PI * 2) / 20;
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * 10}
        y1={cy + Math.sin(a) * 10}
        x2={cx + Math.cos(a) * RIM_INNER_R}
        y2={cy + Math.sin(a) * RIM_INNER_R}
        strokeWidth={1}
        strokeOpacity={0.45}
      />
    );
  });
}

function wheel(cx: number, cy: number) {
  return (
    <>
      <circle cx={cx} cy={cy} r={RIM_R} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={RIM_INNER_R} strokeWidth={2.5} />
      {spokes(cx, cy)}
      <circle cx={cx} cy={cy} r={8} strokeWidth={3} />
    </>
  );
}

type ZoneShape = {
  /** Where the tooltip points, in viewBox units. */
  anchor: { x: number; y: number };
  /** Visible line work. */
  draw: React.ReactNode;
  /** Larger invisible shape that receives taps and hovers. */
  hit: React.ReactNode;
};

const T = "transparent";

// Drawn in this order, so later zones sit on top and win overlapping taps.
const shapes: Record<BikeZone, ZoneShape> = {
  wheel_rear: {
    anchor: { x: REAR.x - 70, y: REAR.y - 70 },
    draw: wheel(REAR.x, REAR.y),
    hit: <circle cx={REAR.x} cy={REAR.y} r={82} strokeWidth={84} stroke={T} fill="none" />,
  },
  wheel_front: {
    anchor: { x: FRONT.x + 70, y: FRONT.y - 70 },
    draw: wheel(FRONT.x, FRONT.y),
    hit: <circle cx={FRONT.x} cy={FRONT.y} r={82} strokeWidth={84} stroke={T} fill="none" />,
  },
  tire_rear: {
    anchor: { x: REAR.x, y: REAR.y - TIRE_R },
    draw: <circle cx={REAR.x} cy={REAR.y} r={TIRE_R - 6} strokeWidth={12} />,
    hit: <circle cx={REAR.x} cy={REAR.y} r={TIRE_R - 6} strokeWidth={24} stroke={T} fill="none" />,
  },
  tire_front: {
    anchor: { x: FRONT.x, y: FRONT.y - TIRE_R },
    draw: <circle cx={FRONT.x} cy={FRONT.y} r={TIRE_R - 6} strokeWidth={12} />,
    hit: (
      <circle cx={FRONT.x} cy={FRONT.y} r={TIRE_R - 6} strokeWidth={24} stroke={T} fill="none" />
    ),
  },
  brake_rear: {
    anchor: { x: REAR.x + 57, y: REAR.y - 14 },
    draw: (
      <>
        {/* The rotor sits behind the cassette on the far side, so only its rim shows. */}
        <circle cx={REAR.x} cy={REAR.y} r={36} strokeWidth={2.5} strokeDasharray="5 4" />
        {/* Flat-mount caliper on the chain stay */}
        <rect
          x={REAR.x + 45}
          y={REAR.y - 14}
          width={24}
          height={12}
          rx={4}
          strokeWidth={3}
          transform={`rotate(-6 ${REAR.x + 57} ${REAR.y - 8})`}
        />
      </>
    ),
    hit: (
      <>
        <circle cx={REAR.x} cy={REAR.y} r={36} strokeWidth={10} stroke={T} fill="none" />
        <circle cx={REAR.x + 57} cy={REAR.y - 8} r={16} fill={T} stroke="none" />
      </>
    ),
  },
  brake_front: {
    anchor: { x: FRONT.x - 31, y: FRONT.y - 48 },
    draw: (
      <>
        <circle cx={FRONT.x} cy={FRONT.y} r={36} strokeWidth={3} />
        <circle cx={FRONT.x} cy={FRONT.y} r={27} strokeWidth={1.5} strokeDasharray="3 4" />
        <rect
          x={FRONT.x - 43}
          y={FRONT.y - 44}
          width={24}
          height={12}
          rx={4}
          strokeWidth={3}
          transform={`rotate(-62 ${FRONT.x - 31} ${FRONT.y - 38})`}
        />
      </>
    ),
    hit: (
      <>
        <circle cx={FRONT.x} cy={FRONT.y} r={38} fill={T} stroke="none" />
        <circle cx={FRONT.x - 31} cy={FRONT.y - 38} r={16} fill={T} stroke="none" />
      </>
    ),
  },
  cassette: {
    anchor: { x: REAR.x, y: REAR.y - 27 },
    draw: (
      <>
        <circle cx={REAR.x} cy={REAR.y} r={27} strokeWidth={3} />
        <circle cx={REAR.x} cy={REAR.y} r={19} strokeWidth={2} />
        <circle cx={REAR.x} cy={REAR.y} r={12} strokeWidth={2} />
      </>
    ),
    hit: <circle cx={REAR.x} cy={REAR.y} r={29} fill={T} stroke="none" />,
  },
  chainrings: {
    anchor: { x: BB.x + 34, y: BB.y - 34 },
    draw: (
      <>
        <circle cx={BB.x} cy={BB.y} r={47} strokeWidth={3} strokeDasharray="4 2.5" />
        <circle cx={BB.x} cy={BB.y} r={34} strokeWidth={2} />
      </>
    ),
    hit: <circle cx={BB.x} cy={BB.y} r={51} fill={T} stroke="none" />,
  },
  chain: {
    anchor: { x: 275, y: 299 },
    draw: (
      <path
        d={`M${BB.x} ${BB.y - 47} L${REAR.x} ${REAR.y - 27} A27 27 0 0 0 ${REAR.x + 3} ${REAR.y + 27} L192 356 L199 388 L${BB.x} ${BB.y + 47}`}
        strokeWidth={3}
        strokeDasharray="7 3"
        fill="none"
      />
    ),
    hit: (
      <path
        d={`M${BB.x - 40} ${BB.y - 45} L${REAR.x + 22} ${REAR.y - 26} M${BB.x - 40} ${BB.y + 45} L209 389`}
        strokeWidth={18}
        stroke={T}
        fill="none"
      />
    ),
  },
  derailleur_rear: {
    anchor: { x: 198, y: 398 },
    draw: (
      <>
        <path d="M187 330 L191 344 L203 394" strokeWidth={4} fill="none" />
        <circle cx={192} cy={356} r={7} strokeWidth={3} />
        <circle cx={199} cy={388} r={7} strokeWidth={3} />
      </>
    ),
    hit: <rect x={178} y={334} width={40} height={66} rx={10} fill={T} stroke="none" />,
  },
  derailleur_front: {
    anchor: { x: 348, y: 286 },
    draw: (
      <rect
        x={336}
        y={286}
        width={24}
        height={12}
        rx={3}
        strokeWidth={3}
        transform="rotate(-16 348 292)"
      />
    ),
    hit: <rect x={328} y={278} width={40} height={28} rx={8} fill={T} stroke="none" />,
  },
  bottom_bracket: {
    anchor: { x: BB.x, y: BB.y - 12 },
    draw: <circle cx={BB.x} cy={BB.y} r={11} strokeWidth={3} />,
    hit: <circle cx={BB.x} cy={BB.y} r={16} fill={T} stroke="none" />,
  },
  pedals: {
    anchor: { x: 401, y: 416 },
    draw: (
      <>
        <line x1={BB.x} y1={BB.y} x2={398} y2={421} strokeWidth={7} />
        <rect x={386} y={418} width={30} height={8} rx={3} strokeWidth={3} />
      </>
    ),
    hit: <rect x={376} y={404} width={50} height={34} rx={8} fill={T} stroke="none" />,
  },
  saddle: {
    anchor: { x: 276, y: 36 },
    draw: (
      <path
        d="M228 44 Q262 30 314 34 L324 40 Q290 49 232 50 Z"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    ),
    hit: <rect x={218} y={24} width={116} height={36} rx={10} fill={T} stroke="none" />,
  },
  handlebar: {
    // One-piece bar and stem; the stem part is drawn with the frame.
    anchor: { x: 618, y: 96 },
    draw: (
      <path
        d="M585 98 L606 96 Q628 97 627 122 Q625 150 604 155 L592 152"
        strokeWidth={7}
        fill="none"
      />
    ),
    hit: <rect x={580} y={84} width={58} height={80} rx={12} fill={T} stroke="none" />,
  },
  headset: {
    anchor: { x: HEAD_TOP.x + 1, y: HEAD_TOP.y - 8 },
    draw: (
      <>
        <line
          x1={HEAD_TOP.x - 7}
          y1={HEAD_TOP.y + 2}
          x2={HEAD_TOP.x + 9}
          y2={HEAD_TOP.y - 3}
          strokeWidth={6}
        />
        <line
          x1={HEAD_BOTTOM.x - 8}
          y1={HEAD_BOTTOM.y + 5}
          x2={HEAD_BOTTOM.x + 8}
          y2={HEAD_BOTTOM.y}
          strokeWidth={6}
        />
      </>
    ),
    hit: (
      <>
        {/* The whole head tube selects the headset, not just its two bearing caps. */}
        <line
          x1={HEAD_TOP.x}
          y1={HEAD_TOP.y - 8}
          x2={HEAD_BOTTOM.x}
          y2={HEAD_BOTTOM.y + 6}
          strokeWidth={26}
          stroke={T}
        />
      </>
    ),
  },
  cables: {
    // Routed internally: in through the headset, then down inside the down tube.
    anchor: { x: 470, y: 237 },
    draw: (
      <path
        d={`M606 98 C584 102 556 108 548 128 L${BB.x + 20} ${BB.y - 23}`}
        strokeWidth={2}
        strokeDasharray="2 4"
        strokeOpacity={0.7}
        fill="none"
      />
    ),
    hit: <path d={`M540 146 L${BB.x + 40} ${BB.y - 45}`} strokeWidth={14} stroke={T} fill="none" />,
  },
};

function Frame({ color }: { color: string }) {
  const tube = (d: string, width: number, opacity = 1) => (
    <path d={d} strokeWidth={width} strokeOpacity={opacity} />
  );
  // Tapered tubes are drawn as filled outlines.
  const shaped = (d: string) => <path d={d} fill={color} strokeWidth={2} />;
  return (
    <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none" pointerEvents="none">
      {/* Main triangle: head tube (wider at the bottom), top tube sloping down to the seat
          cluster, oversized down tube, seat tube */}
      {shaped("M533 103 L547 100 L568 166 L550 172 Z")}
      {shaped(`M${SEAT.x - 1} ${SEAT.y - 2} L541 104 L544 116 L302 141 Z`)}
      {shaped(`M360 345 L545 136 L${HEAD_BOTTOM.x} 160 L372 356 Z`)}
      {shaped(`M360 350 L297 134 L306 132 L369 348 Z`)}
      {/* Rear triangle: slim seat stays that join the seat tube low, chunky chain stays */}
      {tube(`M311 176 Q250 240 ${REAR.x} ${REAR.y}`, 4)}
      {tube(`M${BB.x} ${BB.y} L${REAR.x} ${REAR.y}`, 7)}
      {/* Fork with straight blades */}
      {tube(`M${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y} C580 228 600 286 ${FRONT.x} ${FRONT.y}`, 7)}
      {/* Aero seatpost and stem are drawn lighter: they hold the parts above them. */}
      {tube(`M${SEAT.x} ${SEAT.y} L277 48`, 6, 0.55)}
      {tube(`M538 93 L540 102 M538 93 L585 98`, 7, 0.55)}
      {/* Back crank, behind the frame */}
      {tube(`M${BB.x} ${BB.y} L333 286`, 5, 0.3)}
    </g>
  );
}

type Props = {
  parts: ZonePart[];
  /** Frame colour; defaults to the brand ink. */
  color?: string | null;
  className?: string;
};

export function BikeDrawing({ parts, color, className }: Props) {
  const zones = useMemo(() => summarizeZones(parts), [parts]);
  const { activeZone, setActiveZone, revealZone } = useZones();
  const [tooltipZone, setTooltipZone] = useState<BikeZone | null>(null);
  const tooltip = tooltipZone ? zones.get(tooltipZone) : undefined;

  return (
    <figure className={cn("relative", className)}>
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="h-auto w-full overflow-visible"
        role="group"
        aria-label="Bike drawing. Select a part to find it in the list."
      >
        <Frame color={color || "var(--brand)"} />
        {(Object.keys(shapes) as BikeZone[]).map((zone) => {
          const summary = zones.get(zone);
          return (
            <Zone
              key={zone}
              zone={zone}
              shape={shapes[zone]}
              summary={summary}
              active={activeZone === zone}
              onEnter={() => {
                setActiveZone(zone);
                setTooltipZone(zone);
              }}
              onLeave={() => {
                setActiveZone(null);
                setTooltipZone(null);
              }}
              onSelect={() => revealZone(zone)}
            />
          );
        })}
      </svg>
      {tooltip && <ZoneTooltip summary={tooltip} anchor={shapes[tooltip.zone].anchor} />}
    </figure>
  );
}

type ZoneProps = {
  zone: BikeZone;
  shape: ZoneShape;
  summary?: ZoneSummary;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
};

function Zone({ shape, summary, active, onEnter, onLeave, onSelect }: ZoneProps) {
  // Parts the bike doesn't have (e.g. removed rotors) are drawn faintly and aren't interactive.
  if (!summary) {
    return (
      <g
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        className="text-foreground/15"
        aria-hidden
      >
        {shape.draw}
      </g>
    );
  }

  const label = summary.parts.map((p) => `${p.name}: ${p.hint}`).join(". ");

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      data-zone={summary.zone}
      data-active={active || undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && onEnter()}
      onPointerLeave={onLeave}
      // Only keyboard focus acts like hover; a tap also focuses the zone but shouldn't open the tooltip.
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && onEnter()}
      onBlur={onLeave}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="group/zone cursor-pointer outline-none"
      style={{ color: zoneColor[summary.level] }}
    >
      {/* Only the hit shape takes pointer input, so overlapping line work can't steal taps. */}
      <g
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        pointerEvents="none"
        className="transition-[filter] duration-150 group-focus-visible/zone:[filter:drop-shadow(0_0_5px_var(--brand))] group-data-[active]/zone:[filter:drop-shadow(0_0_5px_currentColor)]"
      >
        {shape.draw}
      </g>
      {shape.hit}
    </g>
  );
}

function ZoneTooltip({
  summary,
  anchor,
}: {
  summary: ZoneSummary;
  anchor: { x: number; y: number };
}) {
  return (
    <div
      role="tooltip"
      className="bg-foreground text-background pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        left: `${((anchor.x - VIEW.x) / VIEW.w) * 100}%`,
        top: `${((anchor.y - VIEW.y) / VIEW.h) * 100}%`,
      }}
    >
      <ul className="flex flex-col gap-1">
        {summary.parts.map((p) => (
          <li key={p.id}>
            <span className="font-semibold">{p.name}</span>
            <span className="block opacity-75">
              {p.level === "none" ? statusLabels.none : p.hint}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
