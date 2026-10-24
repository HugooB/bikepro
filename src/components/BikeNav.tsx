"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function BikeNav({ bikeId }: { bikeId: number }) {
  const t = useT();
  const pathname = usePathname();
  const tabs = [
    { href: `/bikes/${bikeId}`, label: t("bike.tabs.parts") },
    { href: `/bikes/${bikeId}/history`, label: t("bike.tabs.history") },
    { href: `/bikes/${bikeId}/costs`, label: t("bike.tabs.costs") },
  ];

  return (
    <nav aria-label={t("bike.tabs.label")} className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
