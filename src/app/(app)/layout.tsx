import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shell/AppShell";
import type { BellNotification } from "@/components/shell/NotificationBell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const [{ count: pendingCount }, { count: unreadCount }, { data: rawNotifs }] =
    await Promise.all([
      supabase
        .from("v_pending_approvals")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending"),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("notifications")
        .select("id, title, body, is_read, created_at, work_item_id, meeting_id, work_items(type)")
        .eq("user_id", user.id)
        .order("is_read", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const notifications: BellNotification[] = (rawNotifs ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    is_read: n.is_read,
    created_at: n.created_at,
    work_item_id: n.work_item_id,
    meeting_id: n.meeting_id,
    item_type: (n.work_items as { type?: string } | null)?.type as BellNotification["item_type"] ?? null,
  }));

  return (
    <AppShell
      profile={profile}
      pendingCount={pendingCount ?? 0}
      unreadCount={unreadCount ?? 0}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
