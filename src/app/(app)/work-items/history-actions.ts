"use server";

import { createClient } from "@/lib/supabase/server";
import type { HistoryEntryProp } from "@/components/work-item/types";

export async function loadMoreHistory(
  workItemId: string,
  cursor: string // ISO timestamp of the last loaded entry
): Promise<HistoryEntryProp[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("work_item_history")
    .select("id, action, field, old_value, new_value, metadata, created_at, actor_id, profiles!actor_id(full_name, avatar_url)")
    .eq("work_item_id", workItemId)
    .lt("created_at", cursor)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      action: row.action,
      actor_id: row.actor_id,
      actor_name: (profile as { full_name?: string } | null)?.full_name ?? null,
      actor_avatar: (profile as { avatar_url?: string } | null)?.avatar_url ?? null,
      field: row.field,
      old_value: row.old_value,
      new_value: row.new_value,
      metadata: row.metadata,
      created_at: row.created_at,
    };
  });
}
