import { notFound } from "next/navigation";
import { BikeHeader } from "@/components/BikeHeader";
import { PartList } from "@/components/PartList";
import { getActiveParts, getBike } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function BikePage({ params }: { params: Promise<{ bikeId: string }> }) {
  const { bikeId } = await params;
  const id = Number(bikeId);
  if (!Number.isInteger(id)) notFound();

  const bike = await getBike(id);
  if (!bike) notFound();
  const parts = await getActiveParts(bike.id);

  return (
    <div className="flex flex-col gap-8">
      <BikeHeader bike={bike} />
      <PartList parts={parts} odometerKm={bike.odometerKm} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bikeId: string }> }) {
  const bike = await getBike(Number((await params).bikeId));
  return { title: bike ? `${bike.name} · BikePro` : "BikePro" };
}
