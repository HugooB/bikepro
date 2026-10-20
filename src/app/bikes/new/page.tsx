import { format } from "date-fns";
import { cookies } from "next/headers";
import { Wizard } from "@/components/wizard/Wizard";
import { getBikes } from "@/db/queries";
import { lastBikeCookie } from "@/lib/last-bike";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add a bike · BikePro" };

export default async function NewBikePage() {
  const user = await requireUser();
  const bikes = await getBikes(user.id);
  const lastId = Number((await cookies()).get(lastBikeCookie)?.value);
  const back = bikes.find((b) => b.id === lastId) ?? bikes[0];

  return (
    <Wizard
      today={format(new Date(), "yyyy-MM-dd")}
      cancelHref={back ? `/bikes/${back.id}` : null}
    />
  );
}
