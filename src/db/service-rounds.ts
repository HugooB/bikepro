import { and, eq, inArray } from "drizzle-orm";
import { resetsByDefault, type ServiceAction } from "@/lib/event-types";
import { db } from "./index";
import { bumpOdometer, recordPartEvent } from "./part-events";
import { parts, serviceRounds } from "./schema";

export type NewServiceRound = {
  bikeId: number;
  date: string;
  shop?: string | null;
  odometerKm: number;
  totalCost?: number | null;
  notes?: string | null;
  parts: { partId: number; type: ServiceAction; note?: string | null }[];
};

/** Saves a service round and logs one event on every part it covered, in one transaction. */
export function createServiceRound(input: NewServiceRound) {
  return db.transaction((tx) => {
    const round = tx
      .insert(serviceRounds)
      .values({
        bikeId: input.bikeId,
        date: input.date,
        shop: input.shop ?? null,
        odometerKm: input.odometerKm,
        totalCost: input.totalCost ?? null,
        notes: input.notes ?? null,
      })
      .returning()
      .get();

    const ids = input.parts.map((p) => p.partId);
    const owned = ids.length
      ? tx
          .select()
          .from(parts)
          .where(and(eq(parts.bikeId, input.bikeId), inArray(parts.id, ids)))
          .all()
      : [];
    const byId = new Map(owned.map((p) => [p.id, p]));

    for (const item of input.parts) {
      const part = byId.get(item.partId);
      if (!part) throw new Error(`Part ${item.partId} does not belong to bike ${input.bikeId}`);
      recordPartEvent(tx, part, {
        type: item.type,
        description: item.note ?? null,
        date: input.date,
        odometerKm: input.odometerKm,
        resetsInterval: resetsByDefault[item.type],
        serviceRoundId: round.id,
      });
    }

    bumpOdometer(tx, input.bikeId, input.odometerKm);
    return round;
  });
}
