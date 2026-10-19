import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    sqlite.prepare("select 1").get();
    return Response.json({ status: "ok", db: "ok" });
  } catch {
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
