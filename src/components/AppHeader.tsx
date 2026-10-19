import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="bg-brand text-brand-foreground grid size-7 place-items-center rounded-full"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <circle cx="6" cy="16" r="3.5" />
              <circle cx="18" cy="16" r="3.5" />
              <path d="M6 16l4.5-8h5L18 16M10.5 8L13 16h-7" strokeLinejoin="round" />
            </svg>
          </span>
          BikePro
        </Link>
      </div>
    </header>
  );
}
