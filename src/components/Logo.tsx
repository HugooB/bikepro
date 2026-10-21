import { cn } from "@/lib/utils";

/**
 * BikePro's mark: a road bike on a brand-blue rounded square. Drawn on a 32-unit grid with
 * strokes thick enough to stay legible down to favicon size; src/app/icon.svg is the same drawing.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <BikeGlyph />
    </svg>
  );
}

export function BikeGlyph() {
  return (
    <g
      fill="none"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(0 -1)"
    >
      <circle cx="9.25" cy="19" r="5" strokeWidth={2} />
      <circle cx="22.75" cy="19" r="5" strokeWidth={2} />
      {/* Frame: chain stay, seat tube, seat stay, top tube, down tube, fork */}
      <path
        strokeWidth={1.75}
        d="M9.25 19H15.5L13.25 12.25ZM13.25 12.25H20.5L15.5 19M20.5 12.25L22.75 19"
      />
      {/* Seat post and saddle; stem and drop bar */}
      <path strokeWidth={1.75} d="M13.25 12.25L12.75 10.25M11.25 10H14.5" />
      <path strokeWidth={1.75} d="M20.5 12.25L20.1 10.4L22 10.1C23.2 9.9 23.5 11.9 22.4 12.3" />
    </g>
  );
}
