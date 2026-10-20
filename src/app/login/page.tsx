import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { registrationOpen } from "@/db/users";
import { safeNextPath } from "@/lib/auth/next-path";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in · BikePro" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8 sm:py-16">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl leading-tight">Sign in</h1>
        <p className="text-muted-foreground">Welcome back. Your bikes are waiting.</p>
      </div>
      <AuthForm mode="login" next={next === "/" ? undefined : next} />
      {registrationOpen() && (
        <p className="text-muted-foreground text-sm">
          New here?{" "}
          <Link href="/register" className="text-foreground font-medium underline">
            Create an account
          </Link>
        </p>
      )}
    </div>
  );
}
