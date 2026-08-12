import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import SubtaskForm from "@/components/subtasks/SubtaskForm";

const CREATOR_ROLES = ["super_admin", "admin", "team_leader", "team_member"] as const;

interface Props {
  searchParams: Promise<{ task_id?: string }>;
}

export default async function NewSubtaskPage({ searchParams }: Props) {
  const { task_id } = await searchParams;

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
    redirect("/subtasks");
  }

  const t = await getTranslations("subtasks");
  const tCommon = await getTranslations("common");

  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("v_work_item_tree")
      .select("id, title")
      .eq("type", "task")
      .eq("approval_status", "approved")
      .order("title"),
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
          href="/subtasks"
          className="flex items-center"
          style={{
            fontSize: 14,
            color: "var(--color-ink-400)",
            textDecoration: "none",
            gap: 4,
          }}
        >
          <ChevronLeft size={16} />
          {t("title")}
        </Link>
        <span style={{ fontSize: 14, color: "var(--color-ink-300)" }}>/</span>
        <span
          style={{
            fontSize: 14,
            color: "var(--color-ink-900)",
            fontWeight: 500,
          }}
        >
          {t("newSubtask")}
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
        {t("newSubtask")}
      </h2>

      <SubtaskForm
        tasks={(tasks ?? []).map((t) => ({
          id: t.id!,
          title: t.title ?? tCommon("untitled"),
        }))}
        profiles={(profiles ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          title: p.title,
          role: p.role,
        }))}
        defaultTaskId={task_id}
      />
    </div>
  );
}
