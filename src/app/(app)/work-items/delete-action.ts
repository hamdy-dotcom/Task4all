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

  // Null out children's parent_id before deleting — works regardless of FK mode.
  // Store the deleted parent's title so children can surface it in the UI.
  await supabase
    .from("work_items")
    .update({ parent_id: null, deleted_parent_title: item.title })
    .eq("parent_id", id);

  // Use the service client so RLS doesn't silently skip these deletes.
  // Role has already been verified above — this is safe.
  //
  // ORDER MATTERS: log_assignee_history and log_attachment_history are triggers
  // that fire on DELETE of their tables and re-insert rows into work_item_history.
  // So we must: (1) delete assignees/attachments first (triggers fire and write
  // history back), (2) delete ALL history last (clears originals + trigger rows),
  // (3) THEN delete the work_item — otherwise history rows remain and block it.
  const service = createServiceClient();

  await Promise.all([
    service.from("work_item_assignees").delete().eq("work_item_id", id),
    service.from("work_item_attachments").delete().eq("work_item_id", id),
    service.from("meeting_topics").delete().eq("work_item_id", id),
    service.from("subtask_milestones").delete().eq("work_item_id", id),
  ]);

  // Delete history after the above so trigger-generated 'unassigned' /
  // 'attachment_removed' entries are included in the wipe.
  await service.from("work_item_history").delete().eq("work_item_id", id);

  const { error } = await supabase.from("work_items").delete().eq("id", id);
  if (error) return { error: error.message };

  redirect(redirectTo);
}
