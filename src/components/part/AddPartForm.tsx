"use client";

import { useActionState } from "react";
import { createPart } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { partCategories } from "@/db/schema";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { categoryLabels } from "@/lib/default-parts";
import { PartFields } from "./PartFields";

type Props = { bikeId: number; today: string; odometerKm: number };

export function AddPartForm({ bikeId, today, odometerKm }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPart,
    initialActionState,
  );

  return (
    <form action={formAction} className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <input type="hidden" name="bikeId" value={bikeId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue="drivetrain"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border bg-transparent px-2.5 text-base outline-none focus-visible:ring-3 sm:w-64 md:text-sm"
        >
          {partCategories.map((c) => (
            <option key={c} value={c}>
              {categoryLabels[c]}
            </option>
          ))}
        </select>
      </div>
      <PartFields values={{ installedAt: today, installedKm: odometerKm }} />
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Adding…" : "Add part"}
      </Button>
    </form>
  );
}
