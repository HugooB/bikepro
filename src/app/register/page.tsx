import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { registrationOpen } from "@/db/users";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create an account · BikePro" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  const open = registrationOpen();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8 sm:py-16">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl leading-tight">Create an account</h1>
        <p className="text-muted-foreground">
          {open
            ? "Then add your bike and BikePro keeps track of every part on it."
            : "Registration is closed on this BikePro. Ask its owner to open it, or sign in if you already have an account."}
        </p>
      </div>
      {open && <AuthForm mode="register" passwordMin={PASSWORD_MIN} />}
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
