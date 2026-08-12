"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export async function updateName(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const full_name = (formData.get("full_name") as string | null)?.trim() ?? "";
  if (full_name.length < 2) return;

  await supabase.from("profiles").update({ full_name }).eq("id", user.id);
  revalidatePath("/profile");
}

export async function changePassword(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const [supabase, t] = await Promise.all([
    createClient(),
    getTranslations("profile"),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: t("passwordAllRequired") };

  const currentPassword = (formData.get("current_password") as string) ?? "";
  const newPassword = (formData.get("new_password") as string) ?? "";
  const confirmPassword = (formData.get("confirm_password") as string) ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: t("passwordAllRequired") };
  }
  if (newPassword.length < 8) {
    return { error: t("passwordTooShort") };
  }
  if (newPassword !== confirmPassword) {
    return { error: t("passwordMismatch") };
  }

  // Re-authenticate with current password before allowing the change
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reAuthError) {
    return { error: t("passwordIncorrect") };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { error: updateError.message };

  return { success: true };
}
