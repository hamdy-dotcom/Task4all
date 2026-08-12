import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManageView from "@/components/teams/ManageView";

export default async function ManageTeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/teams");

  const [
    { data: teams },
    { data: roleCards },
    { data: tasks },
    { data: decisions },
    { data: collabs },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("sort_order"),
    supabase.from("role_cards").select("*").order("sort_order"),
    supabase.from("role_tasks").select("*").order("sort_order"),
    supabase.from("role_decisions").select("*").order("sort_order"),
    supabase.from("role_collaborations").select("*").order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name, title, role, team_id")
      .order("full_name"),
  ]);

  return (
    <ManageView
      teams={teams ?? []}
      roleCards={roleCards ?? []}
      tasks={tasks ?? []}
      decisions={decisions ?? []}
      collabs={collabs ?? []}
      profiles={profiles ?? []}
    />
  );
}
