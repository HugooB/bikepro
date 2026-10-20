import Link from "next/link";
import { Plus } from "lucide-react";
import { BikeSettingsRow } from "@/components/settings/BikeSettingsRow";
import { Button } from "@/components/ui/button";
import { getBikes } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings · BikePro" };

export default async function SettingsPage() {
  const bikes = await getBikes({ includeArchived: true });
  const active = bikes.filter((b) => !b.archivedAt);
  const archived = bikes.filter((b) => b.archivedAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Settings</h1>

      <section aria-labelledby="bikes-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="bikes-heading" className="text-lg font-semibold">
            Bikes
          </h2>
          <Button asChild variant="outline">
            <Link href="/bikes/new">
              <Plus aria-hidden />
              Add bike
            </Link>
          </Button>
        </div>
        {active.length === 0 ? (
          <p className="text-muted-foreground text-sm">No bikes yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((bike) => (
              <BikeSettingsRow key={bike.id} bike={bike} />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="archived-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="archived-heading" className="text-lg font-semibold">
              Archived bikes
            </h2>
            <p className="text-muted-foreground text-sm">
              Hidden from the bike switcher. Their parts and history are kept.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {archived.map((bike) => (
              <BikeSettingsRow key={bike.id} bike={bike} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
