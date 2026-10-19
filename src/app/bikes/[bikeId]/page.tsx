import { notFound } from "next/navigation";
import { BikeHeader } from "@/components/BikeHeader";
import { PartList } from "@/components/PartList";
import { StatusSummary } from "@/components/StatusSummary";
import { getActiveParts, getBike, getLastResets } from "@/db/queries";
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

  return (
    <div className="flex flex-col gap-8">
      <BikeHeader bike={bike} />
      <div className="flex flex-col gap-4">
        <StatusSummary statuses={[...statuses.values()]} />
        <PartList parts={parts} statuses={statuses} odometerKm={bike.odometerKm} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bikeId: string }> }) {
  const bike = await getBike(Number((await params).bikeId));
  return { title: bike ? `${bike.name} · BikePro` : "BikePro" };
}
