"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // Null out children's parent_id before deleting — works regardless of FK mode.
  // Store the deleted parent's title so children can surface it in the UI.
  await supabase
    .from("work_items")
    .update({ parent_id: null, deleted_parent_title: item.title })
    .eq("parent_id", id);

  // Delete rows that reference this work_item via FK before deleting the item
  // itself. The delete trigger on work_items writes to work_item_history AFTER
  // the row is gone, causing a FK violation if history rows still exist.
  await Promise.all([
    supabase.from("work_item_history").delete().eq("work_item_id", id),
    supabase.from("work_item_assignees").delete().eq("work_item_id", id),
    supabase.from("work_item_attachments").delete().eq("work_item_id", id),
    supabase.from("meeting_topics").delete().eq("work_item_id", id),
    supabase.from("subtask_milestones").delete().eq("work_item_id", id),
  ]);

  const { error } = await supabase.from("work_items").delete().eq("id", id);
  if (error) return { error: error.message };

  redirect(redirectTo);
}
