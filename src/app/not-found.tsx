import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.title", { page: t("notFound.label") }) };
}

/** A bike or part that doesn't exist, or belongs to someone else. */
export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <p className="text-brand text-sm font-medium">{t("notFound.label")}</p>
      <h1 className="font-display text-3xl leading-tight">{t("notFound.title")}</h1>
      <p className="text-muted-foreground">{t("notFound.body")}</p>
      <Button asChild>
        <Link href="/">{t("common.backToBikes")}</Link>
      </Button>
    </div>
  );
}
