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

  // Single RPC call = single transaction. All trigger-generated history rows
  // are written and wiped within the same transaction before the row is gone.
  const service = createServiceClient();
  const { error } = await service.rpc("delete_work_item_safe", { p_id: id });
  if (error) return { error: error.message };

  redirect(redirectTo);
}
