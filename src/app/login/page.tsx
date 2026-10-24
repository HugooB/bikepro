import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { registrationOpen } from "@/db/users";
import { getT } from "@/i18n/server";
import { safeNextPath } from "@/lib/auth/next-path";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.title", { page: t("auth.signIn") }) };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);
  const t = await getT();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8 sm:py-16">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl leading-tight">{t("auth.signIn")}</h1>
        <p className="text-muted-foreground">{t("auth.welcomeBack")}</p>
      </div>
      {params.deleted && (
        <p role="status" className="bg-card rounded-xl border px-4 py-3 text-sm">
          {t("auth.accountDeleted")}
        </p>
      )}
      <AuthForm mode="login" next={next === "/" ? undefined : next} />
      {registrationOpen() && (
        <p className="text-muted-foreground text-sm">
          {t("auth.newHere")}{" "}
          <Link href="/register" className="text-foreground font-medium underline">
            {t("auth.createAccount")}
          </Link>
        </p>
      )}
    </div>
  );
}
