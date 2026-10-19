import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { bikes, parts } from "./schema";

export function getFirstBike() {
  return db.query.bikes.findFirst({
    where: isNull(bikes.archivedAt),
    orderBy: asc(bikes.createdAt),
  });
}

export function getBike(id: number) {
  return db.query.bikes.findFirst({ where: eq(bikes.id, id) });
}

export function getActiveParts(bikeId: number) {
  return db.query.parts.findMany({
    where: and(eq(parts.bikeId, bikeId), eq(parts.status, "active")),
    orderBy: [asc(parts.sortOrder), asc(parts.id)],
  });
}
