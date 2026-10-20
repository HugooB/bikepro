import { notFound } from "next/navigation";
import { format } from "date-fns";
import { BikeDrawing } from "@/components/bike/BikeDrawing";
import { ZoneProvider } from "@/components/bike/zone-context";
import { BikeHeader } from "@/components/BikeHeader";
import { BikeNav } from "@/components/BikeNav";
import { OdometerForm } from "@/components/OdometerForm";
import { PartList } from "@/components/PartList";
import { RememberBike } from "@/components/RememberBike";
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
  const rows = parts.map((part) => ({
    part,
    status: computeStatus(part, resets.get(part.id) ?? null, bike.odometerKm),
  }));
  const lastRound = await getLastServiceRound(bike.id);
  const summaryParts = rows.map(({ part, status }) => ({
    id: part.id,
    name: part.name,
    category: part.category,
    zone: part.svgZone,
    level: status.level,
    hint: status.hint,
  }));

  return (
    <ZoneProvider>
      <RememberBike bikeId={bike.id} />
      {/* Mobile: one column. Desktop: the bike stays in view on the left while the list scrolls. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:gap-12">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <BikeHeader bike={bike} lastRound={lastRound} />
          <BikeDrawing parts={summaryParts} color={bike.color} className="-mx-2 sm:mx-0" />
          <div className="flex flex-col gap-3">
            <OdometerForm bikeId={bike.id} odometerKm={bike.odometerKm} />
            <StatusSummary statuses={rows.map((r) => r.status)} />
          </div>
        </aside>
        <div className="flex flex-col gap-4">
          <BikeNav bikeId={bike.id} />
          <PartList bikeId={bike.id} rows={rows} odometerKm={bike.odometerKm} />
        </div>
      </div>
      <ServiceRoundSheet
        bikeId={bike.id}
        odometerKm={bike.odometerKm}
        today={format(new Date(), "yyyy-MM-dd")}
        knownShops={getKnownShops(bike.id)}
        parts={summaryParts}
      />
    </ZoneProvider>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bikeId: string }> }) {
  const bike = await getBike(Number((await params).bikeId));
  return { title: bike ? `${bike.name} · BikePro` : "BikePro" };
}
