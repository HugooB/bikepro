"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { toast } from "sonner";
import { setBikeArchived, updateBike } from "@/actions/bikes";
import { BikeTypePicker, FrameColorPicker } from "@/components/BikeFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, useUnits } from "@/i18n/client";
import {
  brakeTypes,
  tireTypes,
  type Bike,
  type BikeType,
  type BrakeType,
  type TireType,
} from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { ChoiceChip } from "@/components/wizard/fields";

export function BikeSettingsRow({ bike }: { bike: Bike }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const makeModel = [bike.brand, bike.model].filter(Boolean).join(" ");

  return (
    <li className="bg-card rounded-xl border">
      {/* On phones the buttons go under the name, so a long name doesn't squeeze out the type. */}
      <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full"
            style={{ background: bike.color || "var(--brand)" }}
          />
          <div className="min-w-0 flex-1">
            <Link href={`/bikes/${bike.id}`} className="font-semibold hover:underline">
              {bike.name}
            </Link>
            <p className="text-muted-foreground text-sm sm:truncate">
              {t(`bikeTypes.${bike.type}.name`)}
              {makeModel && ` · ${makeModel}`}
            </p>
          </div>
        </div>
        {/* Lines the button icons up with the name on phones. */}
        <div className="ml-4 flex items-center gap-3 sm:ml-0">
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              {t("common.edit")}
            </Button>
          )}
          <form action={setBikeArchived}>
            <input type="hidden" name="bikeId" value={bike.id} />
            <input type="hidden" name="archived" value={String(!bike.archivedAt)} />
            <Button type="submit" variant="ghost" size="sm">
              {bike.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
              {bike.archivedAt ? t("settings.bikes.restore") : t("settings.bikes.archive")}
            </Button>
          </form>
        </div>
      </div>
      {editing && <BikeEditForm bike={bike} onDone={() => setEditing(false)} />}
    </li>
  );
}

function BikeEditForm({ bike, onDone }: { bike: Bike; onDone: () => void }) {
  const t = useT();
  const u = useUnits();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateBike,
    initialActionState,
  );
  const [type, setType] = useState<BikeType>(bike.type);
  const [brakeType, setBrakeType] = useState<BrakeType>(bike.brakeType);
  const [tireType, setTireType] = useState<TireType>(bike.tireType);
  const [color, setColor] = useState(bike.color ?? "");
  const id = (field: string) => `bike-${bike.id}-${field}`;

  useEffect(() => {
    if (state.ok) {
      toast.success(t("settings.bikes.saved"));
      onDone();
    }
    // Only react to a new save result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4 border-t px-4 py-4">
      <input type="hidden" name="bikeId" value={bike.id} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id("name")}>{t("bikeForm.name")}</Label>
        <Input id={id("name")} name="name" defaultValue={bike.name} required maxLength={40} />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.type")}</legend>
        <BikeTypePicker value={type} onChange={setType} />
        <p className="text-muted-foreground text-xs">{t("settings.bikes.typeHint")}</p>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.brakes")}</legend>
        <input type="hidden" name="brakeType" value={brakeType} />
        <div className="grid grid-cols-2 gap-2">
          {brakeTypes.map((b) => (
            <ChoiceChip
              key={b}
              name={id("brakes")}
              checked={brakeType === b}
              onChange={() => setBrakeType(b)}
            >
              {t(`brakeTypes.${b}`)}
            </ChoiceChip>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{t("settings.bikes.brakesHint")}</p>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.tires")}</legend>
        <input type="hidden" name="tireType" value={tireType} />
        <div className="grid grid-cols-2 gap-2">
          {tireTypes.map((tires) => (
            <ChoiceChip
              key={tires}
              name={id("tires")}
              checked={tireType === tires}
              onChange={() => setTireType(tires)}
            >
              {t(`tireTypes.${tires}`)}
            </ChoiceChip>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{t("settings.bikes.tiresHint")}</p>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("brand")}>{t("bikeForm.brand")}</Label>
          <Input id={id("brand")} name="brand" defaultValue={bike.brand ?? ""} maxLength={60} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("model")}>{t("bikeForm.model")}</Label>
          <Input id={id("model")} name="model" defaultValue={bike.model ?? ""} maxLength={80} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("purchased")}>{t("bikeForm.gotItOn")}</Label>
          <Input
            id={id("purchased")}
            name="purchasedAt"
            type="date"
            defaultValue={bike.purchasedAt ?? ""}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("price")}>
            {t("bikeForm.pricePaid", { currency: u.currencySymbol })}
          </Label>
          <Input
            id={id("price")}
            name="purchasePrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={bike.purchasePrice ?? ""}
          />
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("bikeForm.frameColor")}</legend>
        <FrameColorPicker value={color} onChange={setColor} />
      </fieldset>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
