"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setLocale(locale: "en" | "ar"): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Persist to profile so locale follows the user across devices
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ locale }).eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
