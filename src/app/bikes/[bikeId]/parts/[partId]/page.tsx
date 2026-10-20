import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, CircleCheck, RefreshCw } from "lucide-react";
import { DeletePartButton } from "@/components/part/DeletePartButton";
import { EditPartForm } from "@/components/part/EditPartForm";
import { EventTimeline } from "@/components/part/EventTimeline";
import { LogEventForm } from "@/components/part/LogEventForm";
import { PartOverview, RetiredPartOverview } from "@/components/part/PartOverview";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { getBike, getLastResets, getPart, getPartEvents } from "@/db/queries";
import { computeStatus } from "@/lib/status";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ bikeId: string; partId: string }>;
type SearchParams = Promise<{ log?: string; replaced?: string }>;

async function load(params: Params) {
  const { bikeId, partId } = await params;
  const user = await requireUser();
  const bike = await getBike(user.id, Number(bikeId));
  const part = bike ? await getPart(bike.id, Number(partId)) : undefined;
  return bike && part ? { bike, part } : null;
}

export default async function PartPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const data = await load(params);
  if (!data) notFound();
  const { bike, part } = data;
  const { log, replaced } = await searchParams;

  const retired = part.status === "retired";
  const events = await getPartEvents(part.id);
  const detail = [part.brand, part.model].filter(Boolean).join(" ");
  const status = retired
    ? null
    : computeStatus(part, getLastResets(bike.id).get(part.id) ?? null, bike.odometerKm);
  const backHref = retired ? `/bikes/${bike.id}/history` : `/bikes/${bike.id}`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground -ml-1 flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {retired ? "History" : bike.name}
      </Link>

      {replaced && !retired && (
        <p
          role="status"
          className="border-status-ok/30 bg-status-ok/10 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
        >
          <CircleCheck className="text-status-ok mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            New {part.name.toLowerCase()} installed. The old one is in{" "}
            <Link href={`/bikes/${bike.id}/history`} className="font-medium underline">
              History
            </Link>
            .
          </span>
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">{part.name}</h1>
            {!status ? (
              <span className="bg-muted text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
                Retired
              </span>
            ) : (
              <StatusBadge level={status.level} />
            )}
          </div>
          {detail && <p className="text-muted-foreground">{detail}</p>}
        </div>
        {!retired && (
          <Button asChild variant="outline">
            <Link href="?log=replaced#log-heading">
              <RefreshCw aria-hidden />
              Replace part
            </Link>
          </Button>
        )}
      </header>

      {status ? (
        <PartOverview part={part} status={status} odometerKm={bike.odometerKm} />
      ) : (
        <RetiredPartOverview part={part} bikeId={bike.id} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {!retired && (
          <section aria-labelledby="log-heading" className="flex scroll-mt-20 flex-col gap-3">
            <h2 id="log-heading" className="scroll-mt-20 text-lg font-semibold">
              Log maintenance
            </h2>
            <LogEventForm
              // Remount when arriving via "Replace part" so the form switches to replacing.
              key={log ?? "default"}
              partId={part.id}
              partName={part.name}
              odometerKm={bike.odometerKm}
              today={format(new Date(), "yyyy-MM-dd")}
              initialType={log === "replaced" ? "replaced" : undefined}
            />
          </section>
        )}

        <section aria-labelledby="history-heading" className="flex flex-col gap-3">
          <h2 id="history-heading" className="text-lg font-semibold">
            History
          </h2>
          <EventTimeline events={events} readOnly={retired} />
        </section>
      </div>

      {!retired && (
        // Remount when the part changes so the form never submits stale values.
        <EditPartForm key={JSON.stringify(part)} part={part} />
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">Remove this part</p>
          <p className="text-muted-foreground">
            {retired
              ? "Deletes this old part and its history for good."
              : "For parts your bike doesn't have. Deletes the part and its history for good. To swap in a new one, use Replace part instead."}
          </p>
        </div>
        <DeletePartButton partId={part.id} partName={part.name} />
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const data = await load(params);
  return { title: data ? `${data.part.name} · ${data.bike.name} · BikePro` : "BikePro" };
}
