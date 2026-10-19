import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { EditPartForm } from "@/components/part/EditPartForm";
import { EventTimeline } from "@/components/part/EventTimeline";
import { LogEventForm } from "@/components/part/LogEventForm";
import { PartOverview } from "@/components/part/PartOverview";
import { StatusBadge } from "@/components/StatusBadge";
import { getBike, getLastResets, getPart, getPartEvents } from "@/db/queries";
import { computeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

type Params = Promise<{ bikeId: string; partId: string }>;

async function load(params: Params) {
  const { bikeId, partId } = await params;
  const bike = await getBike(Number(bikeId));
  const part = bike ? await getPart(bike.id, Number(partId)) : undefined;
  return bike && part ? { bike, part } : null;
}

export default async function PartPage({ params }: { params: Params }) {
  const data = await load(params);
  if (!data) notFound();
  const { bike, part } = data;

  const events = await getPartEvents(part.id);
  const status = computeStatus(part, getLastResets(bike.id).get(part.id) ?? null, bike.odometerKm);
  const detail = [part.brand, part.model].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/bikes/${bike.id}`}
        className="text-muted-foreground hover:text-foreground -ml-1 flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {bike.name}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{part.name}</h1>
          <StatusBadge level={status.level} />
        </div>
        {detail && <p className="text-muted-foreground">{detail}</p>}
      </header>

      <PartOverview part={part} status={status} odometerKm={bike.odometerKm} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="log-heading" className="flex flex-col gap-3">
          <h2 id="log-heading" className="text-lg font-semibold">
            Log maintenance
          </h2>
          <LogEventForm
            partId={part.id}
            partName={part.name}
            odometerKm={bike.odometerKm}
            today={format(new Date(), "yyyy-MM-dd")}
          />
        </section>

        <section aria-labelledby="history-heading" className="flex flex-col gap-3">
          <h2 id="history-heading" className="text-lg font-semibold">
            History
          </h2>
          <EventTimeline events={events} />
        </section>
      </div>

      {/* Remount when the part changes so the form never submits stale values. */}
      <EditPartForm key={JSON.stringify(part)} part={part} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const data = await load(params);
  return { title: data ? `${data.part.name} · ${data.bike.name} · BikePro` : "BikePro" };
}
