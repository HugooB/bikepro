import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Plus } from "lucide-react";
import { disconnectStrava } from "@/actions/strava";
import { Button } from "@/components/ui/button";
import type { Bike, StravaConnection } from "@/db/schema";
import type { MessageKey } from "@/i18n";
import { rich } from "@/i18n/rich";
import { getT, getUnits } from "@/i18n/server";
import { StravaBikeLink, SyncNowButton } from "./StravaControls";

const outcomes: Record<string, { key: MessageKey; error?: boolean }> = {
  connected: { key: "strava.outcomes.connected" },
  denied: { key: "strava.outcomes.denied", error: true },
  scope: { key: "strava.outcomes.scope", error: true },
  taken: { key: "strava.outcomes.taken", error: true },
  failed: { key: "strava.outcomes.failed", error: true },
};

export async function ConnectStravaButton({ next }: { next?: string }) {
  const t = await getT();
  const href = next
    ? `/api/strava/connect?next=${encodeURIComponent(next)}`
    : "/api/strava/connect";
  return (
    <Button asChild className="bg-strava hover:bg-strava/90 text-white">
      {/* A plain link: the connect route redirects to strava.com. */}
      <a href={href}>{t("strava.connect")}</a>
    </Button>
  );
}

export async function StravaSettings({
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
  const [t, u] = await Promise.all([getT(), getUnits()]);
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
          {t("strava.intro", { distances: u.unitLong })}
        </p>
      </div>

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={message.error ? "text-destructive text-sm" : "text-sm"}
        >
          {t(message.key)}
        </p>
      )}

      {!configured ? (
        <p className="bg-card text-muted-foreground rounded-xl border px-4 py-3 text-sm">
          {rich(t("strava.notConfigured"), { code: (text) => <code>{text}</code> })}
        </p>
      ) : !connection ? (
        <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground min-w-0 flex-1 text-sm">{t("strava.readsOnly")}</p>
          <ConnectStravaButton />
        </div>
      ) : (
        <>
          <div className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {t("strava.connectedAs", { name: connection.athleteName })}
                </p>
                <p className="text-muted-foreground text-sm">
                  {connection.syncedAt
                    ? t("strava.synced", {
                        ago: formatDistanceToNowStrict(connection.syncedAt, {
                          addSuffix: true,
                          locale: u.dateFnsLocale,
                        }),
                      })
                    : t("strava.notSynced")}
                </p>
              </div>
              <div className="flex gap-2">
                <SyncNowButton />
                <form action={disconnectStrava}>
                  <Button type="submit" variant="ghost">
                    {t("strava.disconnect")}
                  </Button>
                </form>
              </div>
            </div>
            {connection.syncError === "revoked" && (
              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <p role="alert" className="text-destructive min-w-0 flex-1 text-sm">
                  {t("strava.revoked", { distances: u.unitLong })}
                </p>
                <ConnectStravaButton />
              </div>
            )}
            {connection.syncError === "failed" && (
              <p className="text-muted-foreground border-t pt-3 text-sm">
                {t("strava.syncFailed")}
              </p>
            )}
          </div>

          {active.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label={t("strava.linkYourBikes")}>
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
              <h3 className="text-sm font-medium">{t("strava.notInBikePro")}</h3>
              <ul className="flex flex-col gap-2">
                {unlinkedGear.map((g) => (
                  <li
                    key={g.id}
                    className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{g.name}</p>
                      <p className="text-muted-foreground text-sm">{u.distance(g.distanceKm)}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bikes/new?strava=${encodeURIComponent(g.id)}`}>
                        <Plus aria-hidden />
                        {t("strava.addToBikePro")}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {connection && <p className="text-muted-foreground text-xs">{t("strava.poweredBy")}</p>}
    </section>
  );
}
