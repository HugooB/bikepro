import { notFound } from "next/navigation";
import { format } from "date-fns";
import { BikeHeader } from "@/components/BikeHeader";
import { BikeNav } from "@/components/BikeNav";
import { PartList } from "@/components/PartList";
import { ServiceRoundSheet } from "@/components/ServiceRoundSheet";
import { StatusSummary } from "@/components/StatusSummary";
import {
  getActiveParts,
  getBike,
  getKnownShops,
  getLastResets,
  getLastServiceRound,
} from "@/db/queries";
import { computeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function BikePage({ params }: { params: Promise<{ bikeId: string }> }) {
  const { bikeId } = await params;
  const id = Number(bikeId);
  if (!Number.isInteger(id)) notFound();

  const bike = await getBike(id);
  if (!bike) notFound();
  const parts = await getActiveParts(bike.id);
  const resets = getLastResets(bike.id);
  const statuses = new Map(
    parts.map((p) => [p.id, computeStatus(p, resets.get(p.id) ?? null, bike.odometerKm)]),
  );

  const lastRound = await getLastServiceRound(bike.id);

  return (
    <div className="flex flex-col gap-8">
      <BikeHeader bike={bike} lastRound={lastRound} />
      <div className="flex flex-col gap-4">
        <BikeNav bikeId={bike.id} />
        <StatusSummary statuses={[...statuses.values()]} />
        <PartList bikeId={bike.id} parts={parts} statuses={statuses} odometerKm={bike.odometerKm} />
      </div>
      <ServiceRoundSheet
        bikeId={bike.id}
        odometerKm={bike.odometerKm}
        today={format(new Date(), "yyyy-MM-dd")}
        knownShops={getKnownShops(bike.id)}
        parts={parts.map((p) => {
          const status = statuses.get(p.id)!;
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            level: status.level,
            hint: status.hint,
          };
        })}
      />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bikeId: string }> }) {
  const bike = await getBike(Number((await params).bikeId));
  return { title: bike ? `${bike.name} · BikePro` : "BikePro" };
}
