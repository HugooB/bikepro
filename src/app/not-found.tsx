import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Not found · BikePro" };

/** A bike or part that doesn't exist, or belongs to someone else. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <p className="text-brand text-sm font-medium">Not found</p>
      <h1 className="font-display text-3xl leading-tight">This page took a wrong turn</h1>
      <p className="text-muted-foreground">
        The bike or part you&apos;re looking for doesn&apos;t exist, or it was removed.
      </p>
      <Button asChild>
        <Link href="/">Back to your bikes</Link>
      </Button>
    </div>
  );
}
