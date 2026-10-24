"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** Shown when a page fails to load; the header stays, so the rest of the app is in reach. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <p className="text-destructive text-sm font-medium">{t("common.somethingWentWrong")}</p>
      <h1 className="font-display text-3xl leading-tight">{t("errorPage.title")}</h1>
      <p className="text-muted-foreground">
        {t("errorPage.body")}
        {error.digest && (
          <span className="mt-2 block text-xs">
            {t("errorPage.reference", { digest: error.digest })}
          </span>
        )}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>{t("errorPage.tryAgain")}</Button>
        <Button asChild variant="outline">
          <Link href="/">{t("common.backToBikes")}</Link>
        </Button>
      </div>
    </div>
  );
}
