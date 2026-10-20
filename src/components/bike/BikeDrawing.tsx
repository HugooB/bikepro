"use client";

import { useMemo, useState } from "react";
import { statusLabels, type StatusLevel } from "@/lib/status";
import { summarizeZones, type BikeZone, type ZonePart, type ZoneSummary } from "@/lib/zones";
import { cn } from "@/lib/utils";
import { useZones } from "./zone-context";

// Side view, drive side, front wheel on the right. Coordinates are in drawing units; the
// view box crops to the bike itself (tyres left/right/bottom, saddle on top).
const VIEW = { x: 55, y: 62, w: 700, h: 384 };
const REAR = { x: 185, y: 320 };
const FRONT = { x: 625, y: 320 };
const BB = { x: 372, y: 338 };
const SEAT = { x: 335, y: 140 }; // top of the seat tube
const HEAD_TOP = { x: 555, y: 152 };
const HEAD_BOTTOM = { x: 570, y: 212 };
const TIRE_R = 118;
const RIM_R = 104;

const zoneColor: Record<StatusLevel, string> = {
  ok: "var(--foreground)",
  none: "color-mix(in oklab, var(--foreground) 55%, transparent)",
  due: "var(--status-due)",
  overdue: "var(--status-overdue)",
};

function spokes(cx: number, cy: number) {
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i * Math.PI * 2) / 18;
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * 10}
        y1={cy + Math.sin(a) * 10}
        x2={cx + Math.cos(a) * RIM_R}
        y2={cy + Math.sin(a) * RIM_R}
        strokeWidth={1}
        strokeOpacity={0.45}
      />
    );
  });
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
    anchor: { x: REAR.x - 62, y: REAR.y - 62 },
    draw: (
      <>
        <circle cx={REAR.x} cy={REAR.y} r={RIM_R} strokeWidth={3} />
        {spokes(REAR.x, REAR.y)}
        <circle cx={REAR.x} cy={REAR.y} r={8} strokeWidth={3} />
      </>
    ),
    hit: <circle cx={REAR.x} cy={REAR.y} r={74} strokeWidth={62} stroke={T} fill="none" />,
  },
  wheel_front: {
    anchor: { x: FRONT.x + 62, y: FRONT.y - 62 },
    draw: (
      <>
        <circle cx={FRONT.x} cy={FRONT.y} r={RIM_R} strokeWidth={3} />
        {spokes(FRONT.x, FRONT.y)}
        <circle cx={FRONT.x} cy={FRONT.y} r={8} strokeWidth={3} />
      </>
    ),
    hit: <circle cx={FRONT.x} cy={FRONT.y} r={74} strokeWidth={62} stroke={T} fill="none" />,
  },
  tire_rear: {
    anchor: { x: REAR.x, y: REAR.y - TIRE_R },
    draw: <circle cx={REAR.x} cy={REAR.y} r={TIRE_R - 4} strokeWidth={9} />,
    hit: <circle cx={REAR.x} cy={REAR.y} r={TIRE_R - 4} strokeWidth={22} stroke={T} fill="none" />,
  },
  tire_front: {
    anchor: { x: FRONT.x, y: FRONT.y - TIRE_R },
    draw: <circle cx={FRONT.x} cy={FRONT.y} r={TIRE_R - 4} strokeWidth={9} />,
    hit: (
      <circle cx={FRONT.x} cy={FRONT.y} r={TIRE_R - 4} strokeWidth={22} stroke={T} fill="none" />
    ),
  },
  brake_rear: {
    anchor: { x: REAR.x + 32, y: REAR.y - 34 },
    draw: (
      <>
        {/* The rotor sits behind the cassette on the far side, so only its rim shows. */}
        <circle cx={REAR.x} cy={REAR.y} r={36} strokeWidth={2.5} strokeDasharray="5 4" />
        <rect
          x={REAR.x + 20}
          y={REAR.y - 44}
          width={24}
          height={13}
          rx={4}
          strokeWidth={3}
          transform={`rotate(32 ${REAR.x + 32} ${REAR.y - 38})`}
        />
      </>
    ),
    hit: (
      <>
        <circle cx={REAR.x} cy={REAR.y} r={36} strokeWidth={10} stroke={T} fill="none" />
        <circle cx={REAR.x + 32} cy={REAR.y - 38} r={16} fill={T} stroke="none" />
      </>
    ),
  },
  brake_front: {
    anchor: { x: FRONT.x - 30, y: FRONT.y - 34 },
    draw: (
      <>
        <circle cx={FRONT.x} cy={FRONT.y} r={34} strokeWidth={3} />
        <circle cx={FRONT.x} cy={FRONT.y} r={26} strokeWidth={1.5} strokeDasharray="3 4" />
        <rect
          x={FRONT.x - 42}
          y={FRONT.y - 44}
          width={24}
          height={13}
          rx={4}
          strokeWidth={3}
          transform={`rotate(-38 ${FRONT.x - 30} ${FRONT.y - 38})`}
        />
      </>
    ),
    hit: (
      <>
        <circle cx={FRONT.x} cy={FRONT.y} r={36} fill={T} stroke="none" />
        <circle cx={FRONT.x - 30} cy={FRONT.y - 38} r={16} fill={T} stroke="none" />
      </>
    ),
  },
  cassette: {
    anchor: { x: REAR.x, y: REAR.y - 26 },
    draw: (
      <>
        <circle cx={REAR.x} cy={REAR.y} r={26} strokeWidth={3} />
        <circle cx={REAR.x} cy={REAR.y} r={19} strokeWidth={2} />
        <circle cx={REAR.x} cy={REAR.y} r={12} strokeWidth={2} />
      </>
    ),
    hit: <circle cx={REAR.x} cy={REAR.y} r={28} fill={T} stroke="none" />,
  },
  chainrings: {
    anchor: { x: BB.x + 34, y: BB.y - 34 },
    draw: (
      <>
        <circle cx={BB.x} cy={BB.y} r={46} strokeWidth={3} strokeDasharray="4 2.5" />
        <circle cx={BB.x} cy={BB.y} r={36} strokeWidth={2} />
      </>
    ),
    hit: <circle cx={BB.x} cy={BB.y} r={50} fill={T} stroke="none" />,
  },
  chain: {
    anchor: { x: 280, y: 293 },
    draw: (
      <path
        d={`M${BB.x} ${BB.y - 46} L${REAR.x} ${REAR.y - 26} A26 26 0 0 0 ${REAR.x + 3} ${REAR.y + 26} L195 352 L205 386 L${BB.x} ${BB.y + 46}`}
        strokeWidth={3}
        strokeDasharray="7 3"
        fill="none"
      />
    ),
    hit: (
      <path
        d={`M${BB.x - 40} ${BB.y - 46} L${REAR.x + 20} ${REAR.y - 26} M${BB.x - 40} ${BB.y + 46} L215 386`}
        strokeWidth={18}
        stroke={T}
        fill="none"
      />
    ),
  },
  derailleur_rear: {
    anchor: { x: 204, y: 396 },
    draw: (
      <>
        <path d="M188 330 L192 344 L210 392" strokeWidth={4} fill="none" />
        <circle cx={195} cy={352} r={7} strokeWidth={3} />
        <circle cx={205} cy={386} r={7} strokeWidth={3} />
      </>
    ),
    hit: <rect x={180} y={336} width={40} height={62} rx={10} fill={T} stroke="none" />,
  },
  derailleur_front: {
    anchor: { x: 374, y: 270 },
    draw: (
      <rect
        x={360}
        y={270}
        width={24}
        height={12}
        rx={3}
        strokeWidth={3}
        transform="rotate(-10 372 276)"
      />
    ),
    hit: <rect x={352} y={262} width={40} height={28} rx={8} fill={T} stroke="none" />,
  },
  bottom_bracket: {
    anchor: { x: BB.x, y: BB.y - 12 },
    draw: <circle cx={BB.x} cy={BB.y} r={11} strokeWidth={3} />,
    hit: <circle cx={BB.x} cy={BB.y} r={16} fill={T} stroke="none" />,
  },
  pedals: {
    anchor: { x: 424, y: 400 },
    draw: (
      <>
        <line x1={BB.x} y1={BB.y} x2={418} y2={402} strokeWidth={6} />
        <rect x={406} y={398} width={30} height={9} rx={3} strokeWidth={3} />
      </>
    ),
    hit: <rect x={396} y={384} width={50} height={34} rx={8} fill={T} stroke="none" />,
  },
  saddle: {
    anchor: { x: 312, y: 80 },
    draw: (
      <path
        d="M266 88 Q300 76 354 82 L364 89 Q318 97 268 95 Z"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    ),
    hit: <rect x={256} y={68} width={118} height={38} rx={10} fill={T} stroke="none" />,
  },
  handlebar: {
    anchor: { x: 652, y: 150 },
    draw: (
      <path
        d="M600 136 L628 134 Q656 136 653 166 Q650 200 628 205 L613 201"
        strokeWidth={7}
        fill="none"
      />
    ),
    hit: <rect x={596} y={122} width={70} height={92} rx={12} fill={T} stroke="none" />,
  },
  headset: {
    anchor: { x: HEAD_TOP.x - 2, y: HEAD_TOP.y - 10 },
    draw: (
      <>
        <line
          x1={HEAD_TOP.x - 7}
          y1={HEAD_TOP.y - 1}
          x2={HEAD_TOP.x + 9}
          y2={HEAD_TOP.y - 5}
          strokeWidth={6}
        />
        <line
          x1={HEAD_BOTTOM.x - 8}
          y1={HEAD_BOTTOM.y + 3}
          x2={HEAD_BOTTOM.x + 8}
          y2={HEAD_BOTTOM.y - 1}
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
    anchor: { x: 490, y: 262 },
    draw: (
      <path
        d={`M640 150 C612 158 600 196 574 222 L${BB.x + 26} ${BB.y - 22}`}
        strokeWidth={2}
        strokeDasharray="2 4"
        fill="none"
      />
    ),
    hit: (
      <path
        d={`M574 222 L${BB.x + 40} ${BB.y - 30}`}
        strokeWidth={14}
        stroke={T}
        fill="none"
        transform="translate(4 -10)"
      />
    ),
  },
};

function Frame({ color }: { color: string }) {
  const tube = (d: string, width: number, opacity = 1) => (
    <path d={d} strokeWidth={width} strokeOpacity={opacity} />
  );
  return (
    <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none" pointerEvents="none">
      {/* Main triangle: seat tube, top tube, down tube, head tube */}
      {tube(`M${BB.x} ${BB.y} L${SEAT.x} ${SEAT.y} L${HEAD_TOP.x} ${HEAD_TOP.y}`, 6.5)}
      {tube(`M${BB.x} ${BB.y} L${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y}`, 8)}
      {tube(`M${HEAD_TOP.x} ${HEAD_TOP.y} L${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y}`, 9)}
      {/* Rear triangle: seat stays and chain stays */}
      {tube(`M${SEAT.x + 4} ${SEAT.y + 14} L${REAR.x} ${REAR.y}`, 4.5)}
      {tube(`M${BB.x} ${BB.y} L${REAR.x} ${REAR.y}`, 5.5)}
      {/* Fork */}
      {tube(
        `M${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y} Q${HEAD_BOTTOM.x + 16} 282 ${FRONT.x} ${FRONT.y}`,
        6,
      )}
      {/* Seatpost and stem are drawn lighter: they hold the parts above them. */}
      {tube(`M${SEAT.x} ${SEAT.y} L322 92`, 5, 0.55)}
      {tube(`M${HEAD_TOP.x - 2} ${HEAD_TOP.y - 4} L600 136`, 5.5, 0.55)}
      {/* Back crank, behind the frame */}
      {tube(`M${BB.x} ${BB.y} L330 272`, 4.5, 0.3)}
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
