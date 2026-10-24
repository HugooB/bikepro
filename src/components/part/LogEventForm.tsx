"use client";

import { useActionState, useState } from "react";
import { addPartEvent } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, useUnits } from "@/i18n/client";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { loggableEventTypes, resetsByDefault, type LoggableEventType } from "@/lib/event-types";
import { rich } from "@/i18n/rich";
import { cn } from "@/lib/utils";

type Props = {
  partId: number;
  partName: string;
  odometerKm: number;
  today: string;
  /** Pre-selected action, e.g. "replaced" when arriving from the "Replace part" button. */
  initialType?: LoggableEventType;
};

export function LogEventForm({ partId, partName, odometerKm, today, initialType }: Props) {
  const t = useT();
  const u = useUnits();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addPartEvent,
    initialActionState,
  );
  const startType = initialType ?? "serviced";
  const [type, setType] = useState<LoggableEventType>(startType);
  const [resets, setResets] = useState(resetsByDefault[startType]);
  const [formKey, setFormKey] = useState(0);
  const replacing = type === "replaced";
  const lowerName = partName.toLowerCase();

  // After a successful save, clear the form for the next entry.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setFormKey((k) => k + 1);
      setType("serviced");
      setResets(resetsByDefault.serviced);
    }
  }

  function chooseType(next: LoggableEventType) {
    setType(next);
    setResets(resetsByDefault[next]);
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="bg-card flex flex-col gap-4 rounded-xl border p-4"
    >
      <input type="hidden" name="partId" value={partId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("part.log.whatDidYouDo")}</legend>
        <div className="flex flex-wrap gap-2">
          {loggableEventTypes.map((option) => (
            <label
              key={option}
              className={cn(
                "has-focus-visible:ring-ring cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors select-none has-focus-visible:ring-2",
                type === option
                  ? "border-foreground bg-foreground text-background"
                  : "bg-background hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="type"
                value={option}
                checked={type === option}
                onChange={() => chooseType(option)}
                className="sr-only"
              />
              {t(`events.types.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {replacing && (
        <div className="bg-muted/60 flex flex-col gap-3 rounded-lg p-3">
          <p className="text-sm">
            {rich(t("part.log.replaceExplainer", { part: lowerName }), {
              b: (text) => <span className="font-medium">{text}</span>,
            })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="newBrand">{t("part.log.newBrand")}</Label>
              <Input
                id="newBrand"
                name="newBrand"
                maxLength={60}
                placeholder={t("part.log.newBrandPlaceholder")}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="newModel">{t("part.log.newModel")}</Label>
              <Input
                id="newModel"
                name="newModel"
                maxLength={80}
                placeholder={t("part.log.newModelPlaceholder")}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="description">{t("part.log.details")}</Label>
        <Input
          id="description"
          name="description"
          maxLength={200}
          placeholder={t(`events.placeholders.${type}`)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="date">{t("serviceRound.date")}</Label>
          <Input id="date" name="date" type="date" defaultValue={today} max={today} required />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="odometerKm">{t("odometer.labelWithUnit", { unit: u.unitLabel })}</Label>
          <Input
            id="odometerKm"
            name="odometerKm"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={u.toInput(odometerKm)}
            required
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 min-[360px]:col-span-2 sm:col-span-1">
          <Label htmlFor="cost">
            {replacing
              ? t("part.log.newPartPrice", { currency: u.currencySymbol })
              : t("part.log.cost", { currency: u.currencySymbol })}
          </Label>
          <Input id="cost" name="cost" type="number" inputMode="decimal" min={0} step="0.01" />
        </div>
      </div>

      {replacing ? (
        // A replacement always starts a fresh interval.
        <input type="hidden" name="resetsInterval" value="on" />
      ) : (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="resetsInterval"
            checked={resets}
            onChange={(e) => setResets(e.target.checked)}
            className="accent-brand mt-0.5 size-4"
          />
          <span>
            <span className="font-medium">{t("part.log.restart")}</span>
            <span className="text-muted-foreground block">{t("part.log.restartHint")}</span>
          </span>
        </label>
      )}

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending
          ? t("common.saving")
          : replacing
            ? t("part.log.replaceButton", { part: lowerName })
            : t("part.log.addToHistory")}
      </Button>
    </form>
  );
}
