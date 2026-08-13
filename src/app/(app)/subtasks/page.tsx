import Link from "next/link";
import { redirect } from "next/navigation";
import { CornerDownRight, Plus, ClipboardList } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Num } from "@/components/ui/Num";
import StatusPill from "@/components/ui/StatusPill";
import ApprovalPill from "@/components/ui/ApprovalPill";
import ProgressBar from "@/components/ui/ProgressBar";

interface Props {
  searchParams: Promise<{
    approval_status?: string;
    task_id?: string;
  }>;
}

type WorkStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";
type ApprovalStatus = "pending" | "approved" | "rejected";
type PriorityLevel = "low" | "medium" | "high" | "critical";

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: "var(--color-ink-300)",
  medium: "var(--color-warn)",
  high: "var(--color-alert)",
  critical: "var(--color-crit)",
};

const CREATOR_ROLES = ["super_admin", "admin", "team_leader", "team_member"];

export default async function SubtasksPage({ searchParams }: Props) {
  const { approval_status, task_id } = await searchParams;

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

  const canCreate = profile?.role && CREATOR_ROLES.includes(profile.role);

  const t = await getTranslations("subtasks");
  const tCommon = await getTranslations("common");
  const tApprovals = await getTranslations("approvals");

  const validApproval = ["pending", "approved", "rejected"] as const;
  type ValidApproval = (typeof validApproval)[number];

  let query = supabase
    .from("v_work_item_tree")
    .select(
      "id, title, status, approval_status, priority, progress, milestone_count, milestone_done_count, parent_title, parent_id, created_by_name, due_date"
    )
    .eq("type", "subtask")
    .order("created_at", { ascending: false });

  if (
    approval_status &&
    (validApproval as readonly string[]).includes(approval_status)
  ) {
    query = query.eq("approval_status", approval_status as ValidApproval);
  }
  if (task_id) {
    query = query.eq("parent_id", task_id);
  }

  const { data: subtasks } = await query;
  const rawList = subtasks ?? [];

  // Fetch deleted_parent_title for items whose parent was deleted
  const deletedParentMap: Record<string, string> = {};
  if (rawList.length > 0) {
    const { data: extras } = await supabase
      .from("work_items")
      .select("id, deleted_parent_title")
      .in("id", rawList.map((r) => r.id!).filter(Boolean))
      .not("deleted_parent_title", "is", null);
    for (const row of extras ?? []) {
      if (row.deleted_parent_title) deletedParentMap[row.id] = row.deleted_parent_title;
    }
  }

  const list = rawList.map((item) => ({
    ...item,
    deleted_parent_title: deletedParentMap[item.id!] ?? null,
  }));

  return (
    <div>
      <div
        className="flex items-center flex-wrap"
        style={{ marginBottom: 20, gap: 12 }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            lineHeight: "26px",
            color: "var(--color-ink-900)",
          }}
        >
          {t("title")}
        </h2>

        {list.length > 0 && (
          <span
            className="flex items-center justify-center tnum"
            style={{
              width: 24,
              height: 24,
              borderRadius: "999px",
              background: "var(--color-ink-100)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-ink-600)",
            }}
          >
            <Num>{list.length}</Num>
          </span>
        )}

        {/* Inline filters */}
        <div className="flex items-center flex-wrap" style={{ gap: 8, marginInlineStart: 4 }}>
          {(["", "pending", "approved", "rejected"] as const).map((v) => (
            <Link
              key={v}
              href={`/subtasks?${new URLSearchParams({
                ...(v ? { approval_status: v } : {}),
                ...(task_id ? { task_id } : {}),
              }).toString()}`}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: "999px",
                border: `1px solid ${approval_status === v || (!approval_status && v === "") ? "var(--color-ink-900)" : "var(--color-ink-200)"}`,
                background: approval_status === v || (!approval_status && v === "") ? "var(--color-ink-900)" : "transparent",
                color: approval_status === v || (!approval_status && v === "") ? "#fff" : "var(--color-ink-600)",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {v === ""
                ? tCommon("all")
                : tApprovals(`approvalStatus.${v}`)}
            </Link>
          ))}
        </div>

        {canCreate && (
          <Link
            href="/subtasks/new"
            className="flex items-center btn-nml"
            style={{
              marginInlineStart: "auto",
              height: 44,
              padding: "0 20px",
              borderRadius: "999px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              gap: 8,
            }}
          >
            <Plus size={18} />
            {t("newSubtask")}
          </Link>
        )}
      </div>

      {list.length === 0 && (
        <div
          className="flex flex-col items-center justify-center"
          style={{ minHeight: 320, gap: 16 }}
        >
          <ClipboardList
            size={48}
            strokeWidth={1.25}
            color="var(--color-ink-300)"
          />
          <div style={{ textAlign: "center" }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--color-ink-900)",
              }}
            >
              {t("noSubtasks")}
            </h3>
            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "var(--color-ink-400)",
                maxWidth: 280,
              }}
            >
              {approval_status || task_id
                ? t("filteredEmpty")
                : t("intro")}
            </p>
          </div>
          {canCreate && !approval_status && !task_id && (
            <Link
              href="/subtasks/new"
              className="flex items-center"
              style={{
                marginTop: 4,
                height: 44,
                padding: "0 24px",
                borderRadius: "999px",
                background: "var(--color-nml)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                gap: 8,
              }}
            >
              <Plus size={18} />
              {t("newSubtask")}
            </Link>
          )}
        </div>
      )}

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((item) => (
            <SubtaskRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

type SubtaskItem = {
  id: string | null;
  title: string | null;
  status: WorkStatus | null;
  approval_status: ApprovalStatus | null;
  priority: PriorityLevel | null;
  progress: number | null;
  milestone_count: number | null;
  milestone_done_count: number | null;
  parent_title: string | null;
  parent_id: string | null;
  deleted_parent_title: string | null;
  created_by_name: string | null;
  due_date: string | null;
};

async function SubtaskRow({ item }: { item: SubtaskItem }) {
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const dueLabel = item.due_date
    ? new Date(item.due_date).toLocaleDateString(
        locale === "ar" ? "ar-u-nu-latn" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : null;

  const milestoneLabel =
    item.milestone_count != null && item.milestone_count > 0
      ? `${item.milestone_done_count ?? 0}/${item.milestone_count} ${tCommon("milestones")}`
      : null;

  const parentLabel = item.parent_title
    ?? (item.deleted_parent_title ? `${item.deleted_parent_title} (Deleted)` : null);

  const meta = [
    parentLabel,
    milestoneLabel,
    item.created_by_name,
    dueLabel ? tCommon("due", { date: dueLabel }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/subtasks/${item.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{ position: "relative" }}>
        {item.priority && (
          <div
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: "999px",
              background: PRIORITY_COLORS[item.priority],
              zIndex: 1,
            }}
          />
        )}

        <div
          className="flex items-center row-hover"
          style={{
            borderRadius: "var(--radius-row)",
            padding: item.priority ? "12px 16px 12px 20px" : "12px 16px",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: "999px",
              background: "var(--color-ink-300)",
            }}
          >
            <CornerDownRight size={18} color="#fff" strokeWidth={1.75} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              className="truncate"
              style={{
                fontSize: 16,
                fontWeight: 600,
                lineHeight: "22px",
                color: "var(--color-ink-900)",
              }}
            >
              {item.title}
            </p>
            {meta && (
              <p
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  color: "var(--color-ink-400)",
                }}
              >
                {meta}
              </p>
            )}
          </div>

          <div
            className="shrink-0 flex flex-col items-end"
            style={{ gap: 6, minWidth: 160 }}
          >
            <div className="flex items-center" style={{ gap: 6 }}>
              {item.status && <StatusPill status={item.status} />}
              {item.approval_status && (
                <ApprovalPill status={item.approval_status} />
              )}
            </div>
            <div style={{ width: 140 }}>
              <ProgressBar progress={item.progress ?? 0} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
