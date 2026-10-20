import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Plus } from "lucide-react";
import { disconnectStrava } from "@/actions/strava";
import { Button } from "@/components/ui/button";
import type { Bike, StravaConnection } from "@/db/schema";
import { formatKm } from "@/lib/age";
import { StravaBikeLink, SyncNowButton } from "./StravaControls";

const outcomes: Record<string, { text: string; error?: boolean }> = {
  connected: { text: "Strava is connected. Link your bikes below." },
  denied: { text: "Connecting Strava was cancelled.", error: true },
  scope: {
    text: "BikePro needs to see your bikes on Strava to read their kilometres. Connect again and leave every permission ticked.",
    error: true,
  },
  taken: {
    text: "That Strava account is already connected to another BikePro account.",
    error: true,
  },
  failed: { text: "Couldn't connect to Strava. Try again.", error: true },
};

export function ConnectStravaButton({ next }: { next?: string }) {
  const href = next
    ? `/api/strava/connect?next=${encodeURIComponent(next)}`
    : "/api/strava/connect";
  return (
    <Button asChild className="bg-strava hover:bg-strava/90 text-white">
      {/* A plain link: the connect route redirects to strava.com. */}
      <a href={href}>Connect with Strava</a>
    </Button>
  );
}

export function StravaSettings({
  configured,
  connection,
  bikes,
  outcome,
}: {
  configured: boolean;
  connection: StravaConnection | undefined;
  /** All the user's bikes, archived ones included. */
  bikes: Bike[];
  outcome?: string;
}) {
  const message = outcome ? outcomes[outcome] : undefined;
  // Archived bikes are listed elsewhere, but keep their Strava bike taken.
  const active = bikes.filter((b) => !b.archivedAt);
  const linkedTo = Object.fromEntries(
    bikes.filter((b) => b.stravaGearId).map((b) => [b.stravaGearId!, b.name]),
  );
  const unlinkedGear = connection?.gear.filter((g) => !g.retired && !(g.id in linkedTo)) ?? [];

  return (
    <section aria-labelledby="strava-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="strava-heading" className="text-lg font-semibold">
          Strava
        </h2>
        <p className="text-muted-foreground text-sm">
          Linked bikes take their kilometres from Strava, updated when you open BikePro.
        </p>
      </div>

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={message.error ? "text-destructive text-sm" : "text-sm"}
        >
          {message.text}
        </p>
      )}

      {!configured ? (
        <p className="bg-card text-muted-foreground rounded-xl border px-4 py-3 text-sm">
          To connect Strava, set <code>STRAVA_CLIENT_ID</code> and <code>STRAVA_CLIENT_SECRET</code>{" "}
          in <code>.env</code> and restart BikePro. The README explains how to get them.
        </p>
      ) : !connection ? (
        <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground min-w-0 flex-1 text-sm">
            BikePro only reads your bikes and their total distance, never your rides.
          </p>
          <ConnectStravaButton />
        </div>
      ) : (
        <>
          <div className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Connected as {connection.athleteName}</p>
                <p className="text-muted-foreground text-sm">
                  {connection.syncedAt
                    ? `Synced ${formatDistanceToNowStrict(connection.syncedAt, { addSuffix: true })}`
                    : "Not synced yet"}
                </p>
              </div>
              <div className="flex gap-2">
                <SyncNowButton />
                <form action={disconnectStrava}>
                  <Button type="submit" variant="ghost">
                    Disconnect
                  </Button>
                </form>
              </div>
            </div>
            {connection.syncError === "revoked" && (
              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <p role="alert" className="text-destructive min-w-0 flex-1 text-sm">
                  Strava no longer gives BikePro access, so kilometres aren&apos;t updating.
                </p>
                <ConnectStravaButton />
              </div>
            )}
            {connection.syncError === "failed" && (
              <p className="text-muted-foreground border-t pt-3 text-sm">
                The last sync couldn&apos;t reach Strava. BikePro tries again next time you open it.
              </p>
            )}
          </div>

          {active.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Link your bikes">
              {active.map((bike) => (
                <StravaBikeLink
                  key={bike.id}
                  bike={{
                    id: bike.id,
                    name: bike.name,
                    color: bike.color,
                    odometerKm: bike.odometerKm,
                    stravaGearId: bike.stravaGearId,
                  }}
                  gear={connection.gear}
                  linkedTo={linkedTo}
                />
              ))}
            </ul>
          )}

          {unlinkedGear.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">On Strava, not in BikePro yet</h3>
              <ul className="flex flex-col gap-2">
                {unlinkedGear.map((g) => (
                  <li
                    key={g.id}
                    className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{g.name}</p>
                      <p className="text-muted-foreground text-sm">{formatKm(g.distanceKm)}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bikes/new?strava=${encodeURIComponent(g.id)}`}>
                        <Plus aria-hidden />
                        Add to BikePro
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {connection && <p className="text-muted-foreground text-xs">Powered by Strava</p>}
    </section>
  );
}
