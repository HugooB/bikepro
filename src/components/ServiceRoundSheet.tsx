"use client";

import { useActionState, useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { saveServiceRound } from "@/actions/service-rounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { partCategories, type PartCategory } from "@/db/schema";
import { useMediaQuery } from "@/hooks/use-media-query";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { categoryLabels } from "@/lib/default-parts";
import { eventTypeLabels, serviceActions, type ServiceAction } from "@/lib/event-types";
import type { StatusLevel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusBadge";

export type SheetPart = {
  id: number;
  name: string;
  category: PartCategory;
  level: StatusLevel;
  hint: string;
};

type Props = {
  bikeId: number;
  odometerKm: number;
  today: string;
  parts: SheetPart[];
  knownShops: string[];
};

type Selection = Map<number, { type: ServiceAction; note: string }>;

export function ServiceRoundSheet(props: Props) {
  const [open, setOpen] = useState(false);
  // Bumped after each save so the next round starts from a blank form.
  const [formKey, setFormKey] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="bg-brand text-brand-foreground shadow-brand/25 hover:bg-brand/90 fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 h-14 rounded-full px-5 text-base shadow-lg sm:right-8 sm:bottom-8"
        >
          <Wrench aria-hidden className="size-5" />
          Service round
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 p-0",
          isDesktop ? "w-full sm:max-w-lg" : "max-h-[92dvh] rounded-t-2xl",
        )}
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg font-semibold">Log a service round</SheetTitle>
          <SheetDescription>Record a shop visit and the parts it covered.</SheetDescription>
        </SheetHeader>
        <ServiceRoundForm
          key={formKey}
          {...props}
          onSaved={(count) => {
            setOpen(false);
            setFormKey((k) => k + 1);
            toast.success("Service round saved", {
              description:
                count > 0 ? `${count} part${count === 1 ? "" : "s"} updated.` : undefined,
            });
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function ServiceRoundForm({
  bikeId,
  odometerKm,
  today,
  parts,
  knownShops,
  onSaved,
}: Props & { onSaved: (count: number) => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveServiceRound,
    initialActionState,
  );
  const [selected, setSelected] = useState<Selection>(new Map());

  // An error stays visible until the user changes something in the form.
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state.ok) onSaved(selected.size);
    setShowError(!!state.error);
    // Only react to a new save result, not to selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, { type: "serviced", note: "" });
      return next;
    });

  const update = (id: number, patch: Partial<{ type: ServiceAction; note: string }>) =>
    setSelected((prev) => new Map(prev).set(id, { ...prev.get(id)!, ...patch }));

  const needsAttention = parts.filter((p) => p.level === "due" || p.level === "overdue");
  const selectNeedsAttention = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const p of needsAttention)
        if (!next.has(p.id)) next.set(p.id, { type: "serviced", note: "" });
      return next;
    });

  return (
    <form
      action={formAction}
      onChange={() => setShowError(false)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="bikeId" value={bikeId} />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">Visit</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-date">Date</Label>
              <Input
                id="sr-date"
                name="date"
                type="date"
                defaultValue={today}
                max={today}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-odometer">Odometer (km)</Label>
              <Input
                id="sr-odometer"
                name="odometerKm"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={Math.round(odometerKm)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-shop">Shop</Label>
              <Input
                id="sr-shop"
                name="shop"
                list="sr-known-shops"
                maxLength={80}
                placeholder="e.g. Local bike shop"
                autoComplete="off"
              />
              <datalist id="sr-known-shops">
                {knownShops.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-cost">Total cost €</Label>
              <Input
                id="sr-cost"
                name="totalCost"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-notes">Notes</Label>
            <textarea
              id="sr-notes"
              name="notes"
              rows={2}
              maxLength={1000}
              placeholder="e.g. Full service, cleaned and lubed, gears indexed"
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-sm font-semibold">
              Parts covered
              {selected.size > 0 && (
                <span className="text-muted-foreground ml-1.5 font-normal">({selected.size})</span>
              )}
            </legend>
            <div className="flex gap-1">
              {needsAttention.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={selectNeedsAttention}>
                  Select due ({needsAttention.length})
                </Button>
              )}
              {selected.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Map())}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {partCategories.map((category) => {
            const items = parts.filter((p) => p.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-1.5">
                <p className="text-muted-foreground px-1 text-sm font-medium">
                  {categoryLabels[category]}
                </p>
                <ul className="divide-y overflow-hidden rounded-xl border">
                  {items.map((part) => {
                    const sel = selected.get(part.id);
                    return (
                      <li key={part.id} className={cn(sel && "bg-muted/50")}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                          <input
                            type="checkbox"
                            name="partId"
                            value={part.id}
                            checked={!!sel}
                            onChange={() => toggle(part.id)}
                            className="accent-brand size-4 shrink-0"
                          />
                          <StatusDot level={part.level} className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-medium">{part.name}</span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {part.hint}
                          </span>
                        </label>
                        {sel && (
                          <div className="flex flex-col gap-2 px-3 pb-3 pl-10">
                            <div
                              role="radiogroup"
                              aria-label={`What was done to the ${part.name.toLowerCase()}`}
                              className="flex flex-wrap gap-1.5"
                            >
                              {serviceActions.map((a) => (
                                <label
                                  key={a}
                                  className={cn(
                                    "has-focus-visible:ring-ring cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors select-none has-focus-visible:ring-2",
                                    sel.type === a
                                      ? "border-foreground bg-foreground text-background"
                                      : "bg-background hover:bg-muted",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={`action-${part.id}`}
                                    value={a}
                                    checked={sel.type === a}
                                    onChange={() => update(part.id, { type: a })}
                                    className="sr-only"
                                  />
                                  {eventTypeLabels[a]}
                                </label>
                              ))}
                            </div>
                            <Input
                              name={`note-${part.id}`}
                              value={sel.note}
                              onChange={(e) => update(part.id, { note: e.target.value })}
                              maxLength={200}
                              placeholder="Note (optional)"
                              aria-label={`Note for ${part.name}`}
                              className="h-8"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </fieldset>
      </div>

      <div className="bg-popover flex flex-col gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {showError && state.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending
            ? "Saving…"
            : selected.size > 0
              ? `Save service round · ${selected.size} part${selected.size === 1 ? "" : "s"}`
              : "Save service round"}
        </Button>
      </div>
    </form>
  );
}
