"use server";

import { revalidatePath } from "next/cache";
import { setRegistrationOpen } from "@/db/users";
import { requireUser } from "@/lib/auth/session";

/** Opens or closes registration (Settings → Admin). Refused for anyone who isn't an admin. */
export async function updateRegistration(formData: FormData) {
  const user = await requireUser();
  setRegistrationOpen(user.id, formData.get("open") === "true");
  revalidatePath("/settings");
}
