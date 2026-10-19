import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  intervalKm?: number | null;
  intervalDays?: number | null;
};

/** Name, make, installation, price and service interval inputs shared by the add and edit forms. */
export function PartFields({ values }: { values: PartFieldValues }) {
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
          label="Odometer at install (km)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          defaultValue={Math.round(values.installedKm)}
          required
        />
        <Field
          id="cost"
          label="Price €"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          defaultValue={values.cost ?? ""}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Service interval</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field
            id="intervalKm"
            label="Every … km"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={values.intervalKm ?? ""}
          />
          <Field
            id="intervalMonths"
            label="or every … months"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={values.intervalDays ? daysToMonths(values.intervalDays) : ""}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Whichever comes first. Leave both empty if this part has no fixed interval.
        </p>
      </fieldset>
    </>
  );
}
