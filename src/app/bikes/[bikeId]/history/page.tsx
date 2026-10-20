import { notFound } from "next/navigation";
import { BikeNav } from "@/components/BikeNav";
import { RetiredPartsList } from "@/components/history/RetiredPartsList";
import { ServiceRoundList } from "@/components/history/ServiceRoundList";
import { getBike, getRetiredParts, getServiceRounds } from "@/db/queries";
import { getCurrentUser, requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ bikeId: string }>;

export default async function HistoryPage({ params }: { params: Params }) {
  const user = await requireUser();
  const bike = await getBike(user.id, Number((await params).bikeId));
  if (!bike) notFound();

  const [rounds, retired] = await Promise.all([
    getServiceRounds(bike.id),
    getRetiredParts(bike.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{bike.name}</h1>
        <BikeNav bikeId={bike.id} />
      </header>

      <section aria-labelledby="rounds-heading" className="flex flex-col gap-3">
        <h2 id="rounds-heading" className="text-lg font-semibold">
          Service rounds
        </h2>
        <ServiceRoundList rounds={rounds} />
      </section>

      <section aria-labelledby="retired-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="retired-heading" className="text-lg font-semibold">
            Replaced parts
          </h2>
          <p className="text-muted-foreground text-sm">
            How long and how far each old part lasted.
          </p>
        </div>
        <RetiredPartsList parts={retired} />
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const user = await getCurrentUser();
  const bike = user && (await getBike(user.id, Number((await params).bikeId)));
  return { title: bike ? `History · ${bike.name} · BikePro` : "BikePro" };
}
