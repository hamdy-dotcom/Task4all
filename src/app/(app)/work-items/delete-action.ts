"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type DeleteWorkItemState = { error: string } | null;

export async function deleteWorkItem(
  redirectTo: string,
  _prev: DeleteWorkItemState,
  _formData: FormData
): Promise<DeleteWorkItemState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") return { error: "Only super admins can delete work items" };

  const id = _formData.get("id") as string | null;
  if (!id) return { error: "Missing item id" };

  const { data: item } = await supabase
    .from("work_items")
    .select("title")
    .eq("id", id)
    .single();
  if (!item) return { error: "Item not found" };

  // Null out direct children so they aren't cascade-deleted with the parent.
  // Use service client so RLS doesn't silently skip rows owned by other users.
  const service = createServiceClient();
  await service
    .from("work_items")
    .update({ parent_id: null, deleted_parent_title: item.title })
    .eq("parent_id", id);

  // All dependent tables (assignees, attachments, history, etc.) have
  // ON DELETE CASCADE, so deleting the row cleans everything up automatically.
  const { error } = await service.from("work_items").delete().eq("id", id);
  if (error) return { error: error.message };

  redirect(redirectTo);
}
