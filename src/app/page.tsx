import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirstBike } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const bike = await getFirstBike();
  if (bike) redirect(`/bikes/${bike.id}`);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="text-brand text-sm font-medium">Welcome</p>
        <h1 className="font-display text-3xl leading-tight text-balance sm:text-4xl">
          Never wonder how old your chain is again.
        </h1>
        <p className="text-muted-foreground max-w-prose">
          BikePro keeps track of every part on your bike and tells you when it&apos;s due for
          maintenance.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Your garage is empty</CardTitle>
          <CardDescription>
            Adding bikes arrives with the bike wizard. For now, run{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">npm run db:seed</code>{" "}
            to create a sample race bike.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
