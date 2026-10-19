import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { AddPartForm } from "@/components/part/AddPartForm";
import { getBike } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function NewPartPage({ params }: { params: Promise<{ bikeId: string }> }) {
  const bike = await getBike(Number((await params).bikeId));
  if (!bike) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/bikes/${bike.id}`}
        className="text-muted-foreground hover:text-foreground -ml-1 flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {bike.name}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Add a part</h1>
        <p className="text-muted-foreground">
          Track something that isn&apos;t in the default list, like a power meter or bottle cages.
        </p>
      </header>
      <AddPartForm
        bikeId={bike.id}
        today={format(new Date(), "yyyy-MM-dd")}
        odometerKm={bike.odometerKm}
      />
    </div>
  );
}

export const metadata = { title: "Add a part · BikePro" };
