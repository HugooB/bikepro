import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { AddPartForm } from "@/components/part/AddPartForm";
import { getBike } from "@/db/queries";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NewPartPage({ params }: { params: Promise<{ bikeId: string }> }) {
  const user = await requireUser();
  const bike = await getBike(user.id, Number((await params).bikeId));
  if (!bike) notFound();
  const t = await getT();

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
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">{t("bike.addPart")}</h1>
        <p className="text-muted-foreground">{t("part.addIntro")}</p>
      </header>
      <AddPartForm
        bikeId={bike.id}
        today={format(new Date(), "yyyy-MM-dd")}
        odometerKm={bike.odometerKm}
      />
    </div>
  );
}

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.title", { page: t("bike.addPart") }) };
}
