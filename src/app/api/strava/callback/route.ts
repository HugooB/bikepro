import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { saveStravaConnection, StravaAccountTakenError } from "@/db/strava";
import { requireUser } from "@/lib/auth/session";
import { exchangeCode, hasRequiredScope, stravaConfig } from "@/lib/strava/api";
import { finishOAuth, withOutcome } from "@/lib/strava/oauth-state";
import { syncStrava } from "@/lib/strava/sync";

export const dynamic = "force-dynamic";

/** Strava sends the user back here after they approved (or declined) BikePro. */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const params = request.nextUrl.searchParams;
  const { back, ok } = await finishOAuth(params.get("state"));
  const config = stravaConfig(request.nextUrl.origin);
  const code = params.get("code");

  if (!config || !ok) redirect(withOutcome(back, "failed"));
  if (params.get("error") || !code) redirect(withOutcome(back, "denied"));
  const scope = params.get("scope");
  if (!hasRequiredScope(scope)) redirect(withOutcome(back, "scope"));

  let outcome = "connected";
  try {
    const { tokens, athlete } = await exchangeCode(config, code);
    saveStravaConnection(user.id, {
      athleteId: athlete.id,
      athleteName: athlete.name,
      scope: scope!,
      tokens,
    });
    await syncStrava(user.id, { manual: true });
  } catch (e) {
    if (!(e instanceof StravaAccountTakenError)) console.error("Connecting Strava failed", e);
    outcome = e instanceof StravaAccountTakenError ? "taken" : "failed";
  }
  redirect(withOutcome(back, outcome));
}
