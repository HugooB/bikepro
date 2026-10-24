import { notFound } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { BikeDrawing } from "@/components/bike/BikeDrawing";
import { ZoneProvider } from "@/components/bike/zone-context";
import { BikeHeader } from "@/components/BikeHeader";
import { BikeNav } from "@/components/BikeNav";
import { CostTotalCard } from "@/components/CostTotalCard";
import { OdometerForm } from "@/components/OdometerForm";
import { PartList } from "@/components/PartList";
import { RememberBike } from "@/components/RememberBike";
import { ServiceRoundSheet } from "@/components/ServiceRoundSheet";
import { StatusSummary } from "@/components/StatusSummary";
import {
  getActiveParts,
  getBike,
  getCostEntries,
  getKnownShops,
  getLastResets,
  getLastServiceRound,
} from "@/db/queries";
import { getStravaConnection } from "@/db/strava";
import { getT, getUnits } from "@/i18n/server";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { summarizeCosts } from "@/lib/costs";
import { partName } from "@/lib/default-parts";
import { computeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function BikePage({ params }: { params: Promise<{ bikeId: string }> }) {
  const { bikeId } = await params;
  const id = Number(bikeId);
  if (!Number.isInteger(id)) notFound();

  const user = await requireUser();
  const bike = await getBike(user.id, id);
  if (!bike) notFound();
  const [t, u] = await Promise.all([getT(), getUnits()]);
  // Template part names in the user's language, everywhere on this page.
  const parts = (await getActiveParts(bike.id)).map((p) => ({ ...p, name: partName(p, t) }));
  const resets = getLastResets(bike.id);
  const rows = parts.map((part) => ({
    part,
    status: computeStatus(part, resets.get(part.id) ?? null, bike.odometerKm, {
      unit: u.unit,
      locale: u.locale,
    }),
  }));
  const lastRound = await getLastServiceRound(bike.id);
  const connection = bike.stravaGearId ? getStravaConnection(user.id) : undefined;
  const strava = connection && {
    gearName: connection.gear.find((g) => g.id === bike.stravaGearId)?.name ?? null,
    syncedAgo: connection.syncedAt
      ? formatDistanceToNowStrict(connection.syncedAt, {
          addSuffix: true,
          locale: u.dateFnsLocale,
        })
      : null,
  };
  const summaryParts = rows.map(({ part, status }) => ({
    id: part.id,
    name: part.name,
    category: part.category,
    zone: part.svgZone,
    level: status.level,
    hint: status.condition,
  }));

  return (
    <ZoneProvider>
      <RememberBike bikeId={bike.id} />
      {/* Mobile: one column. Desktop: the bike stays in view on the left while the list scrolls. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:gap-12">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <BikeHeader bike={bike} lastRound={lastRound} />
          <BikeDrawing
            parts={summaryParts}
            color={bike.color}
            brakeType={bike.brakeType}
            className="-mx-2 sm:mx-0"
          />
          <div className="flex flex-col gap-3">
            <OdometerForm bikeId={bike.id} odometerKm={bike.odometerKm} strava={strava} />
            <CostTotalCard
              bikeId={bike.id}
              summary={summarizeCosts(getCostEntries(bike, t), new Date().getFullYear())}
            />
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
  const user = await getCurrentUser();
  const bike = user && (await getBike(user.id, Number((await params).bikeId)));
  const t = await getT();
  return { title: bike ? t("meta.title", { page: bike.name }) : t("common.appName") };
}
