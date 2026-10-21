import { format } from "date-fns";
import { buildExport } from "@/db/export";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Downloads the signed-in user's data as a JSON backup (Settings → Your data). */
export async function GET() {
  const user = await requireUser();
  const data = buildExport(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bikepro-${format(new Date(), "yyyy-MM-dd")}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
