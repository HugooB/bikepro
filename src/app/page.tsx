import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBikes } from "@/db/queries";
import { lastBikeCookie } from "@/lib/last-bike";

export const dynamic = "force-dynamic";

export default async function Home() {
  const bikes = await getBikes();
  const lastId = Number((await cookies()).get(lastBikeCookie)?.value);
  const bike = bikes.find((b) => b.id === lastId) ?? bikes[0];
  if (bike) redirect(`/bikes/${bike.id}`);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-8 py-8 sm:py-16">
      <section className="flex flex-col gap-3">
        <p className="text-brand text-sm font-medium">Welcome to BikePro</p>
        <h1 className="font-display text-3xl leading-tight text-balance sm:text-4xl">
          Never wonder how old your chain is again.
        </h1>
        <p className="text-muted-foreground max-w-prose">
          Add your bike and BikePro keeps track of every part on it, from chain to bar tape, and
          tells you when each one is due for maintenance. It takes about a minute.
        </p>
      </section>
      <Button
        asChild
        size="lg"
        className="bg-brand text-brand-foreground hover:bg-brand/90 h-12 rounded-full px-6 text-base"
      >
        <Link href="/bikes/new">
          <Plus aria-hidden className="size-5" />
          Add your first bike
        </Link>
      </Button>
    </div>
  );
}
