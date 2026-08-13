import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TaskForm from "@/components/tasks/TaskForm";

const CREATOR_ROLES = ["super_admin", "admin", "team_leader"] as const;

export default async function NewTaskPage() {
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

  if (
    !profile ||
    !(CREATOR_ROLES as readonly string[]).includes(profile.role)
  ) {
    redirect("/tasks");
  }

  const [t, tn, locale] = await Promise.all([
    getTranslations("tasks"),
    getTranslations("nav"),
    getLocale(),
  ]);

  const [{ data: initiatives }, { data: teams }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("v_work_item_tree")
        .select("id, title")
        .eq("type", "initiative")
        .eq("approval_status", "approved")
        .order("title"),
      supabase.from("teams").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, title, role")
        .eq("is_active", true)
        .order("full_name"),
    ]);

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="flex items-center" style={{ marginBottom: 24, gap: 8 }}>
        <Link
          href="/tasks"
          className="flex items-center"
          style={{
            fontSize: 14,
            color: "var(--color-ink-400)",
            textDecoration: "none",
            gap: 4,
          }}
        >
          <ChevronLeft size={16} />
          {tn("tasks")}
        </Link>
        <span style={{ fontSize: 14, color: "var(--color-ink-300)" }}>/</span>
        <span
          style={{
            fontSize: 14,
            color: "var(--color-ink-900)",
            fontWeight: 500,
          }}
        >
          {t("newTask")}
        </span>
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          lineHeight: "26px",
          color: "var(--color-ink-900)",
          marginBottom: 24,
        }}
      >
        {t("newTask")}
      </h2>

      <TaskForm
        initiatives={(initiatives ?? []).map((i) => ({
          id: i.id!,
          title: i.title ?? "",
          title_ar: null,
        }))}
        teams={teams ?? []}
        profiles={(profiles ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          title: p.title,
          role: p.role,
        }))}
        locale={locale}
        isSuperAdmin={profile?.role === "super_admin"}
      />
    </div>
  );
}
