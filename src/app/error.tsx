"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Shown when a page fails to load; the header stays, so the rest of the app is in reach. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <p className="text-destructive text-sm font-medium">Something went wrong</p>
      <h1 className="font-display text-3xl leading-tight">This page didn&apos;t load</h1>
      <p className="text-muted-foreground">
        Your data is safe. Try again, and if it keeps happening, restart BikePro.
        {error.digest && (
          <span className="mt-2 block text-xs">Reference for the logs: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to your bikes</Link>
        </Button>
      </div>
    </div>
  );
}
