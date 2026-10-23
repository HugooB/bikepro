import { format } from "date-fns";
import { cookies } from "next/headers";
import { Wizard } from "@/components/wizard/Wizard";
import { getBikes } from "@/db/queries";
import type { StravaConnection } from "@/db/schema";
import type { SessionUser } from "@/db/sessions";
import { getStravaConnection } from "@/db/strava";
import { lastBikeCookie } from "@/lib/last-bike";
import { requireUser } from "@/lib/auth/session";
import { getGearDetails, stravaConfig, type StravaConfig } from "@/lib/strava/api";
import { getAccessToken } from "@/lib/strava/sync";
import { toInput } from "@/lib/units";
import type { WizardDraft } from "@/lib/wizard-schema";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add a bike · BikePro" };

export default async function NewBikePage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const user = await requireUser();
  const { strava: param } = await searchParams;
  const bikes = await getBikes(user.id, { includeArchived: true });
  const lastId = Number((await cookies()).get(lastBikeCookie)?.value);
  const back =
    bikes.find((b) => b.id === lastId && !b.archivedAt) ?? bikes.find((b) => !b.archivedAt);

  const config = stravaConfig();
  const connection = getStravaConnection(user.id);
  const linked = new Set(bikes.map((b) => b.stravaGearId));
  const linkable = (connection?.gear ?? [])
    .filter((g) => !g.retired && !linked.has(g.id))
    .map(({ id, name, distanceKm }) => ({ id, name, distanceKm }));

  // ?strava=<gear id> starts from that Strava bike; after connecting it holds the outcome.
  const prefillGear = linkable.find((g) => g.id === param);
  const prefill =
    prefillGear && config && connection
      ? await stravaPrefill(user, config, connection, prefillGear.id)
      : undefined;

  return (
    <Wizard
      key={prefill?.stravaGearId}
      today={format(new Date(), "yyyy-MM-dd")}
      cancelHref={back ? `/bikes/${back.id}` : null}
      strava={{
        configured: config !== null,
        connected: Boolean(connection && connection.syncError !== "revoked"),
        bikes: linkable,
        outcome: prefillGear ? undefined : param,
      }}
      prefill={prefill}
    />
  );
}

/** Name and km from the last sync, plus brand, model and type when Strava knows them. */
async function stravaPrefill(
  user: SessionUser,
  config: StravaConfig,
  connection: StravaConnection,
  gearId: string,
): Promise<Partial<WizardDraft>> {
  const gear = connection.gear.find((g) => g.id === gearId)!;
  const prefill: Partial<WizardDraft> = {
    name: gear.name.slice(0, 40),
    stravaGearId: gear.id,
    odometerKm: String(toInput(gear.distanceKm, user.distanceUnit)),
  };
  try {
    const details = await getGearDetails(await getAccessToken(user.id, config), gear.id);
    return {
      ...prefill,
      brand: details.brand.slice(0, 60),
      model: details.model.slice(0, 80),
      ...(details.type && { type: details.type }),
    };
  } catch {
    // The details are a nicety; the wizard works without them.
    return prefill;
  }
}
