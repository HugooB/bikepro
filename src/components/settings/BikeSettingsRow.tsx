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
import type { Bike, BikeType } from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { bikeTypeLabels } from "@/lib/bikes";

export function BikeSettingsRow({ bike }: { bike: Bike }) {
  const [editing, setEditing] = useState(false);
  const makeModel = [bike.brand, bike.model].filter(Boolean).join(" ");

  return (
    <li className="bg-card rounded-xl border">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full"
          style={{ background: bike.color || "var(--brand)" }}
        />
        <div className="min-w-0 flex-1">
          <Link href={`/bikes/${bike.id}`} className="font-semibold hover:underline">
            {bike.name}
          </Link>
          <p className="text-muted-foreground truncate text-sm">
            {bikeTypeLabels[bike.type].name}
            {makeModel && ` · ${makeModel}`}
          </p>
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            Edit
          </Button>
        )}
        <form action={setBikeArchived}>
          <input type="hidden" name="bikeId" value={bike.id} />
          <input type="hidden" name="archived" value={String(!bike.archivedAt)} />
          <Button type="submit" variant="ghost" size="sm">
            {bike.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
            {bike.archivedAt ? "Restore" : "Archive"}
          </Button>
        </form>
      </div>
      {editing && <BikeEditForm bike={bike} onDone={() => setEditing(false)} />}
    </li>
  );
}

function BikeEditForm({ bike, onDone }: { bike: Bike; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateBike,
    initialActionState,
  );
  const [type, setType] = useState<BikeType>(bike.type);
  const [color, setColor] = useState(bike.color ?? "");
  const id = (field: string) => `bike-${bike.id}-${field}`;

  useEffect(() => {
    if (state.ok) {
      toast.success("Bike saved");
      onDone();
    }
    // Only react to a new save result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4 border-t px-4 py-4">
      <input type="hidden" name="bikeId" value={bike.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("name")}>Name</Label>
        <Input id={id("name")} name="name" defaultValue={bike.name} required maxLength={40} />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <BikeTypePicker value={type} onChange={setType} />
        <p className="text-muted-foreground text-xs">
          Changing the type doesn&apos;t change its parts.
        </p>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("brand")}>Brand</Label>
          <Input id={id("brand")} name="brand" defaultValue={bike.brand ?? ""} maxLength={60} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("model")}>Model</Label>
          <Input id={id("model")} name="model" defaultValue={bike.model ?? ""} maxLength={80} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("purchased")}>Got it on</Label>
          <Input
            id={id("purchased")}
            name="purchasedAt"
            type="date"
            defaultValue={bike.purchasedAt ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("price")}>Price you paid €</Label>
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
        <legend className="mb-2 text-sm font-medium">Frame colour</legend>
        <FrameColorPicker value={color} onChange={setColor} />
      </fieldset>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
