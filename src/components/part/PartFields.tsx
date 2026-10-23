import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUnits } from "@/components/UnitsProvider";
import { daysToMonths } from "@/lib/format";

function Field({
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={props.id}>{label}</Label>
      <Input name={props.id} {...props} />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export type PartFieldValues = {
  name?: string;
  brand?: string | null;
  model?: string | null;
  installedAt: string;
  installedKm: number;
  cost?: number | null;
  serviceIntervalKm?: number | null;
  serviceIntervalDays?: number | null;
  replaceIntervalKm?: number | null;
  replaceIntervalDays?: number | null;
};

function IntervalFields({
  legend,
  hint,
  kmId,
  kmLabel,
  monthsId,
  monthsLabel,
  km,
  days,
}: {
  legend: string;
  hint: string;
  kmId: string;
  kmLabel: string;
  monthsId: string;
  monthsLabel: string;
  km?: number | null;
  days?: number | null;
}) {
  const { toInput } = useUnits();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field
          id={kmId}
          label={kmLabel}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          defaultValue={km ? toInput(km) : ""}
        />
        <Field
          id={monthsId}
          label={monthsLabel}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          defaultValue={days ? daysToMonths(days) : ""}
        />
      </div>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </fieldset>
  );
}

/** Name, make, installation, price and interval inputs shared by the add and edit forms. */
export function PartFields({ values }: { values: PartFieldValues }) {
  const u = useUnits();
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          id="name"
          label="Name"
          defaultValue={values.name ?? ""}
          placeholder="e.g. Power meter"
          required
          maxLength={80}
        />
        <Field
          id="brand"
          label="Brand"
          defaultValue={values.brand ?? ""}
          placeholder="e.g. Shimano"
          maxLength={60}
        />
        <Field
          id="model"
          label="Model"
          defaultValue={values.model ?? ""}
          placeholder="e.g. Ultegra CN-R8100"
          maxLength={80}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field
          id="installedAt"
          label="Installed on"
          type="date"
          defaultValue={values.installedAt}
          required
        />
        <Field
          id="installedKm"
          label={`Odometer at install (${u.unitLabel})`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          defaultValue={u.toInput(values.installedKm)}
          required
        />
        <Field
          id="cost"
          label={`Price ${u.currencySymbol}`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          defaultValue={values.cost ?? ""}
        />
      </div>
      <IntervalFields
        legend="Service interval"
        hint="How often it needs servicing (cleaning, lubing, adjusting), whichever comes first."
        kmId="serviceKm"
        kmLabel={`Every … ${u.unitLabel}`}
        monthsId="serviceMonths"
        monthsLabel="or every … months"
        km={values.serviceIntervalKm}
        days={values.serviceIntervalDays}
      />
      <IntervalFields
        legend="Replacement interval"
        hint="Its maximum life, counted from when it was installed, whichever comes first."
        kmId="replaceKm"
        kmLabel={`After … ${u.unitLabel}`}
        monthsId="replaceMonths"
        monthsLabel="or after … months"
        km={values.replaceIntervalKm}
        days={values.replaceIntervalDays}
      />
      <p className="text-muted-foreground text-xs">
        Leave an interval empty if it doesn&apos;t apply.
      </p>
    </>
  );
}
