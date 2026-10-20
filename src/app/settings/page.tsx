import Link from "next/link";
import { Plus } from "lucide-react";
import { logout, logoutEverywhere } from "@/actions/auth";
import { BikeSettingsRow } from "@/components/settings/BikeSettingsRow";
import { Button } from "@/components/ui/button";
import { getBikes } from "@/db/queries";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings · BikePro" };

export default async function SettingsPage() {
  const user = await requireUser();
  const bikes = await getBikes(user.id, { includeArchived: true });
  const active = bikes.filter((b) => !b.archivedAt);
  const archived = bikes.filter((b) => b.archivedAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Settings</h1>

      <section aria-labelledby="account-heading" className="flex flex-col gap-3">
        <h2 id="account-heading" className="text-lg font-semibold">
          Account
        </h2>
        <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{user.name}</p>
            <p className="text-muted-foreground truncate text-sm">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <form action={logout}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
            <form action={logoutEverywhere}>
              <Button type="submit" variant="ghost">
                Sign out everywhere
              </Button>
            </form>
          </div>
        </div>
      </section>

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
