"use client";

import { Check } from "lucide-react";
import { bikeTypes, type BikeType } from "@/db/schema";
import { useT } from "@/i18n/client";
import { frameColors } from "@/lib/bikes";
import { cn } from "@/lib/utils";

/** Small side-view glyph per bike type for the type picker. */
function BikeTypeGlyph({ type }: { type: BikeType }) {
  const wheel = type === "gravel" ? 4 : 2.2;
  return (
    <svg
      viewBox="0 0 64 36"
      className="h-9 w-16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle
        cx="14"
        cy="24"
        r="10"
        strokeWidth={wheel}
        fill={type === "tt" ? "currentColor" : "none"}
      />
      <circle cx="50" cy="24" r="10" strokeWidth={wheel} />
      <path d="M14 24 L26 24 L22 10 L44 9 L50 24 M26 24 L44 9 M22 10 L14 24" strokeWidth={2.2} />
      <path d="M20 6 L27 6" strokeWidth={2.4} />
      {type === "tt" ? (
        <path d="M44 9 L56 8" strokeWidth={2.4} />
      ) : type === "other" ? (
        <path d="M44 9 L42 4 L48 3" strokeWidth={2.2} />
      ) : (
        <path d="M44 9 L49 8 Q53 9 51 14 L48 14" strokeWidth={2.2} />
      )}
    </svg>
  );
}

export function BikeTypePicker({
  value,
  onChange,
  name = "type",
}: {
  value: BikeType;
  onChange: (type: BikeType) => void;
  name?: string;
}) {
  const t = useT();
  return (
    <div
      role="radiogroup"
      aria-label={t("wizard.basics.bikeType")}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {bikeTypes.map((type) => {
        const selected = value === type;
        return (
          <label
            key={type}
            className={cn(
              "has-focus-visible:ring-ring/50 relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 pt-3 pb-2.5 text-center transition-colors has-focus-visible:ring-3",
              selected ? "border-brand bg-brand/5 text-brand" : "hover:bg-muted text-foreground/70",
            )}
          >
            <input
              type="radio"
              name={name}
              value={type}
              checked={selected}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            <BikeTypeGlyph type={type} />
            <span className={cn("text-sm font-semibold", !selected && "text-foreground")}>
              {t(`bikeTypes.${type}.name`)}
            </span>
            <span className="text-muted-foreground text-xs leading-snug">
              {t(`bikeTypes.${type}.hint`)}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function FrameColorPicker({
  value,
  onChange,
  name = "color",
}: {
  value: string;
  onChange: (color: string) => void;
  name?: string;
}) {
  const t = useT();
  // A colour set outside the palette stays selectable, so saving doesn't drop it.
  const custom = value && !frameColors.some((c) => c.value === value.toLowerCase());
  const palette = frameColors.map((c) => ({ value: c.value, name: t(`colors.${c.id}`) }));
  const options = custom
    ? [{ value: value.toLowerCase(), name: t("colors.current") }, ...palette]
    : palette;

  return (
    <div role="radiogroup" aria-label={t("bikeForm.frameColour")} className="flex flex-wrap gap-2">
      {options.map((c) => {
        const selected = value.toLowerCase() === c.value;
        return (
          <label
            key={c.name}
            title={c.name}
            className={cn(
              "has-focus-visible:ring-ring/50 grid size-9 cursor-pointer place-items-center rounded-full ring-offset-2 transition-shadow has-focus-visible:ring-3",
              selected && "ring-foreground ring-2",
            )}
            style={{ background: c.value || "var(--brand)" }}
          >
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={selected}
              onChange={() => onChange(c.value)}
              className="sr-only"
            />
            <span className="sr-only">{c.name}</span>
            {selected && <Check aria-hidden className="size-4 text-white" />}
          </label>
        );
      })}
    </div>
  );
}
