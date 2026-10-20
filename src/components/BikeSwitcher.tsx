"use client";

import { startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, LogOut, Plus, Settings } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";

export type SwitcherBike = { id: number; name: string; color: string | null };

const itemClass =
  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none select-none data-highlighted:bg-muted";

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-full"
      style={{ background: color || "var(--brand)" }}
    />
  );
}

/** Header dropdown to jump between bikes, add one, or open settings. */
export function BikeSwitcher({ bikes, userName }: { bikes: SwitcherBike[]; userName: string }) {
  const pathname = usePathname();
  const currentId = Number(pathname.match(/^\/bikes\/(\d+)/)?.[1]);
  const current = bikes.find((b) => b.id === currentId);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="hover:bg-muted focus-visible:ring-ring/50 data-[state=open]:bg-muted flex h-9 max-w-[55vw] items-center gap-2 rounded-lg px-2.5 text-sm font-medium outline-none focus-visible:ring-3 sm:max-w-xs"
        aria-label={current ? `Bike: ${current.name}. Switch bike` : "Your bikes"}
      >
        {current && <Swatch color={current.color} />}
        <span className="truncate">{current ? current.name : "Your bikes"}</span>
        <ChevronsUpDown aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 min-w-56 rounded-xl border p-1 shadow-lg"
        >
          {bikes.length > 0 && (
            <DropdownMenu.Label className="text-muted-foreground px-2.5 pt-1.5 pb-1 text-xs font-medium">
              Your bikes
            </DropdownMenu.Label>
          )}
          {bikes.map((bike) => (
            <DropdownMenu.Item key={bike.id} asChild className={itemClass}>
              <Link
                href={`/bikes/${bike.id}`}
                aria-current={bike.id === currentId ? "page" : undefined}
              >
                <Swatch color={bike.color} />
                <span className="flex-1 truncate">{bike.name}</span>
                {bike.id === currentId && <Check aria-hidden className="size-4" />}
              </Link>
            </DropdownMenu.Item>
          ))}
          {bikes.length > 0 && <DropdownMenu.Separator className="bg-border my-1 h-px" />}
          <DropdownMenu.Item asChild className={cn(itemClass, "text-brand font-medium")}>
            <Link href="/bikes/new">
              <Plus aria-hidden className="size-4" />
              Add bike
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/settings">
              <Settings aria-hidden className="text-muted-foreground size-4" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="bg-border my-1 h-px" />
          {/* Selecting an item closes (unmounts) the menu, so a <form> in here would vanish
              before it submits; call the action directly instead. */}
          <DropdownMenu.Item className={itemClass} onSelect={() => startTransition(logout)}>
            <LogOut aria-hidden className="text-muted-foreground size-4" />
            <span className="flex-1 truncate">Sign out</span>
            <span className="text-muted-foreground max-w-28 truncate text-xs">{userName}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
