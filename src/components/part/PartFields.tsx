import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, useUnits } from "@/i18n/client";
import { daysToMonths } from "@/lib/format";

function Field({
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
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
  const t = useT();
  const u = useUnits();
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          id="name"
          label={t("part.fields.name")}
          defaultValue={values.name ?? ""}
          placeholder={t("part.fields.namePlaceholder")}
          required
          maxLength={80}
        />
        <Field
          id="brand"
          label={t("part.fields.brand")}
          defaultValue={values.brand ?? ""}
          placeholder={t("part.fields.brandPlaceholder")}
          maxLength={60}
        />
        <Field
          id="model"
          label={t("part.fields.model")}
          defaultValue={values.model ?? ""}
          placeholder={t("part.fields.modelPlaceholder")}
          maxLength={80}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3">
        <Field
          id="installedAt"
          label={t("part.fields.installedOn")}
          type="date"
          defaultValue={values.installedAt}
          required
        />
        <Field
          id="installedKm"
          label={t("part.fields.installOdometer", { unit: u.unitLabel })}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          defaultValue={u.toInput(values.installedKm)}
          required
        />
        <Field
          id="cost"
          label={t("part.fields.price", { currency: u.currencySymbol })}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          defaultValue={values.cost ?? ""}
        />
      </div>
      <IntervalFields
        legend={t("part.fields.serviceInterval")}
        hint={t("part.fields.serviceIntervalHint")}
        kmId="serviceKm"
        kmLabel={t("part.fields.everyDistance", { unit: u.unitLabel })}
        monthsId="serviceMonths"
        monthsLabel={t("part.fields.everyMonths")}
        km={values.serviceIntervalKm}
        days={values.serviceIntervalDays}
      />
      <IntervalFields
        legend={t("part.fields.replaceInterval")}
        hint={t("part.fields.replaceIntervalHint")}
        kmId="replaceKm"
        kmLabel={t("part.fields.afterDistance", { unit: u.unitLabel })}
        monthsId="replaceMonths"
        monthsLabel={t("part.fields.afterMonths")}
        km={values.replaceIntervalKm}
        days={values.replaceIntervalDays}
      />
      <p className="text-muted-foreground text-xs">{t("part.fields.leaveEmpty")}</p>
    </>
  );
}
