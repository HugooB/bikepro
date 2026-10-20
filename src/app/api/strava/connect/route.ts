import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { authorizeUrl, stravaConfig } from "@/lib/strava/api";
import { startOAuth } from "@/lib/strava/oauth-state";

export const dynamic = "force-dynamic";

/** Sends the user to Strava to approve BikePro; ?next= is where they come back to. */
export async function GET(request: NextRequest) {
  await requireUser();
  const config = stravaConfig(request.nextUrl.origin);
  if (!config) redirect("/settings");
  const state = await startOAuth(request.nextUrl.searchParams.get("next") ?? "/settings");
  redirect(authorizeUrl(config, state));
}
