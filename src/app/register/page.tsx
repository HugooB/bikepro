import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { registrationOpen } from "@/db/users";
import { getT } from "@/i18n/server";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.title", { page: t("auth.createAccount") }) };
}

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  const open = registrationOpen();
  const t = await getT();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8 sm:py-16">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl leading-tight">{t("auth.createAccount")}</h1>
        <p className="text-muted-foreground">
          {open ? t("auth.registerIntro") : t("auth.registrationClosed")}
        </p>
      </div>
      {open && <AuthForm mode="register" passwordMin={PASSWORD_MIN} />}
      <p className="text-muted-foreground text-sm">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="text-foreground font-medium underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
