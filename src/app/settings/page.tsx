import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { updateRegistration } from "@/actions/admin";
import { logout, logoutEverywhere } from "@/actions/auth";
import { ChangePasswordForm, DeleteAccountForm } from "@/components/settings/AccountForms";
import { BikeSettingsRow } from "@/components/settings/BikeSettingsRow";
import { ImportDataForm } from "@/components/settings/ImportDataForm";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { ResetPasswordButton } from "@/components/settings/ResetPasswordButton";
import { StravaSettings } from "@/components/settings/StravaSettings";
import { Button } from "@/components/ui/button";
import { getBikes } from "@/db/queries";
import { getStravaConnection } from "@/db/strava";
import { listUsers, registrationOpen } from "@/db/users";
import type { T } from "@/i18n";
import { rich } from "@/i18n/rich";
import { getPrefs, getT } from "@/i18n/server";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { stravaConfig } from "@/lib/strava/api";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.title", { page: t("nav.settings") }) };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const user = await requireUser();
  const [t, prefs] = await Promise.all([getT(), getPrefs()]);
  const { strava } = await searchParams;
  const bikes = await getBikes(user.id, { includeArchived: true });
  const active = bikes.filter((b) => !b.archivedAt);
  const archived = bikes.filter((b) => b.archivedAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{t("nav.settings")}</h1>

      <section aria-labelledby="account-heading" className="flex flex-col gap-3">
        <h2 id="account-heading" className="text-lg font-semibold">
          {t("settings.account.title")}
        </h2>
        <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3">
          {/* On phones the buttons wrap below rather than squeezing the email. */}
          <div className="min-w-48 flex-1">
            <p className="font-semibold">{user.name}</p>
            <p className="text-muted-foreground truncate text-sm">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <form action={logout}>
              <Button type="submit" variant="outline">
                {t("nav.signOut")}
              </Button>
            </form>
            <form action={logoutEverywhere}>
              <Button type="submit" variant="ghost">
                {t("settings.account.signOutEverywhere")}
              </Button>
            </form>
          </div>
        </div>
        <ChangePasswordForm passwordMin={PASSWORD_MIN} />
      </section>

      <section aria-labelledby="preferences-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="preferences-heading" className="text-lg font-semibold">
            {t("settings.preferences.title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("settings.preferences.intro")}</p>
        </div>
        <PreferencesForm prefs={prefs} />
      </section>

      {user.isAdmin && <AdminSettings adminId={user.id} t={t} />}

      <section aria-labelledby="bikes-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="bikes-heading" className="text-lg font-semibold">
            {t("settings.bikes.title")}
          </h2>
          <Button asChild variant="outline">
            <Link href="/bikes/new">
              <Plus aria-hidden />
              {t("nav.addBike")}
            </Link>
          </Button>
        </div>
        {active.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("settings.bikes.none")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((bike) => (
              <BikeSettingsRow key={bike.id} bike={bike} />
            ))}
          </ul>
        )}
      </section>

      <StravaSettings
        configured={stravaConfig() !== null}
        connection={getStravaConnection(user.id)}
        bikes={bikes}
        outcome={strava}
      />

      <section aria-labelledby="data-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="data-heading" className="text-lg font-semibold">
            {t("settings.data.title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("settings.data.intro")}</p>
        </div>
        <Button asChild variant="outline" className="self-start">
          {/* A plain link: the route answers with a file download. */}
          <a href="/api/export" download>
            <Download aria-hidden />
            {t("settings.data.download")}
          </a>
        </Button>
        <ImportDataForm />
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="archived-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="archived-heading" className="text-lg font-semibold">
              {t("settings.archived.title")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("settings.archived.intro")}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {archived.map((bike) => (
              <BikeSettingsRow key={bike.id} bike={bike} />
            ))}
          </ul>
        </section>
      )}

      {/* The admin account can't be deleted: the install would be left without an admin. */}
      {!user.isAdmin && (
        <section aria-labelledby="danger-heading" className="flex flex-col gap-3">
          <h2 id="danger-heading" className="text-destructive text-lg font-semibold">
            {t("settings.danger.title")}
          </h2>
          <DeleteAccountForm />
        </section>
      )}
    </div>
  );
}

/** Install-wide settings, shown to admins only. */
function AdminSettings({ adminId, t }: { adminId: number; t: T }) {
  const open = registrationOpen();
  const users = listUsers();
  return (
    <section aria-labelledby="admin-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="admin-heading" className="text-lg font-semibold">
          {t("settings.admin.title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("settings.admin.intro")}</p>
      </div>
      <div className="bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3">
        <div className="min-w-48 flex-1">
          <p className="font-semibold">
            {open ? t("settings.admin.registrationOpen") : t("settings.admin.registrationClosed")}
          </p>
          <p className="text-muted-foreground text-sm">
            {open ? t("settings.admin.openHint") : t("settings.admin.closedHint")}
          </p>
        </div>
        <form action={updateRegistration}>
          <input type="hidden" name="open" value={String(!open)} />
          <Button type="submit" variant="outline">
            {open ? t("settings.admin.close") : t("settings.admin.open")}
          </Button>
        </form>
      </div>
      <h3 className="mt-2 font-semibold">{t("settings.admin.users")}</h3>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3"
          >
            <div className="min-w-48 flex-1">
              <p className="font-semibold">
                {u.name}
                {u.isAdmin && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {t("settings.admin.adminBadge")}
                  </span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-sm">{u.email}</p>
            </div>
            {u.id !== adminId && <ResetPasswordButton userId={u.id} name={u.name} />}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        {rich(t("settings.admin.lockedOut"), {
          code: (text) => <code className="font-mono">{text}</code>,
        })}
      </p>
    </section>
  );
}
