import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Num } from "@/components/ui/Num";
import {
  WorkItemApprovalRow,
  type PathSegment,
  type PendingMilestone,
} from "@/components/approvals/ApprovalRows";
import {
  approveWorkItem,
  rejectWorkItem,
  approveSubtaskWithMilestones,
} from "./actions";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [t, tc] = await Promise.all([
    getTranslations("approvals"),
    getTranslations("common"),
  ]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div style={{ maxInlineSize: 640 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBlockEnd: 8,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
          {t("notAuthorized")}
        </p>
      </div>
    );
  }

  const { data: workItems } = await supabase
    .from("v_pending_approvals")
    .select("id, title, type, classification, created_at")
    .order("created_at", { ascending: true });

  const itemIds = (workItems ?? [])
    .map((i) => i.id)
    .filter((id): id is string => Boolean(id));

  const subtaskIds = (workItems ?? [])
    .filter((i) => i.type === "subtask" && i.id)
    .map((i) => i.id as string);

  const [{ data: pathRows }, { data: milestoneRows }] = await Promise.all([
    itemIds.length > 0
      ? supabase
          .from("v_item_path")
          .select("item_id, path")
          .in("item_id", itemIds)
      : Promise.resolve({ data: [] as { item_id: string | null; path: unknown }[] }),
    subtaskIds.length > 0
      ? supabase
          .from("v_pending_milestones")
          .select("milestone_id, milestone_title, subtask_id, sort_order")
          .in("subtask_id", subtaskIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({
          data: [] as {
            milestone_id: string | null;
            milestone_title: string | null;
            subtask_id: string | null;
            sort_order: number | null;
          }[],
        }),
  ]);

  const pathByItemId: Record<string, PathSegment[]> = {};
  for (const row of pathRows ?? []) {
    if (row.item_id && row.path && Array.isArray(row.path)) {
      pathByItemId[row.item_id] = row.path as PathSegment[];
    }
  }

  const milestonesBySubtaskId: Record<string, PendingMilestone[]> = {};
  for (const m of milestoneRows ?? []) {
    if (!m.subtask_id || !m.milestone_id) continue;
    if (!milestonesBySubtaskId[m.subtask_id]) {
      milestonesBySubtaskId[m.subtask_id] = [];
    }
    milestonesBySubtaskId[m.subtask_id].push({
      milestone_id: m.milestone_id,
      milestone_title: m.milestone_title ?? "",
      sort_order: m.sort_order ?? 0,
    });
  }

  type ApproveAction = (
    prev: Awaited<ReturnType<typeof approveWorkItem>>,
    fd: FormData
  ) => Promise<Awaited<ReturnType<typeof approveWorkItem>>>;

  type RejectAction = (
    prev: Awaited<ReturnType<typeof rejectWorkItem>>,
    fd: FormData
  ) => Promise<Awaited<ReturnType<typeof rejectWorkItem>>>;

  type ApproveSubtaskAction = (
    prev: Awaited<ReturnType<typeof approveSubtaskWithMilestones>>,
    fd: FormData
  ) => Promise<Awaited<ReturnType<typeof approveSubtaskWithMilestones>>>;

  const approveActions: Record<string, ApproveAction> = {};
  const rejectActions: Record<string, RejectAction> = {};
  const approveSubtaskActions: Record<string, ApproveSubtaskAction> = {};

  for (const item of workItems ?? []) {
    if (!item.id) continue;
    approveActions[item.id] = approveWorkItem.bind(null, item.id);
    rejectActions[item.id] = rejectWorkItem.bind(null, item.id);
    if (item.type === "subtask") {
      approveSubtaskActions[item.id] = approveSubtaskWithMilestones.bind(
        null,
        item.id
      );
    }
  }

  const count = workItems?.length ?? 0;

  return (
    <div style={{ maxInlineSize: 720 }}>
      <div style={{ marginBlockEnd: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBlockEnd: 4,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
          {count > 0 ? (
            count === 1 ? (
              t("itemAwaiting", { count: <Num>{count}</Num> })
            ) : (
              t("itemsAwaiting", { count: <Num>{count}</Num> })
            )
          ) : (
            t("allCaughtUp")
          )}
        </p>
      </div>

      {count > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(workItems ?? []).map((item) => {
            if (!item.id) return null;
            return (
              <WorkItemApprovalRow
                key={item.id}
                id={item.id}
                title={item.title ?? tc("untitled")}
                type={item.type ?? "subtask"}
                classification={item.classification ?? null}
                createdAt={item.created_at ?? null}
                path={pathByItemId[item.id] ?? []}
                pendingMilestones={milestonesBySubtaskId[item.id] ?? []}
                approveAction={approveActions[item.id]}
                approveSubtaskAction={
                  approveSubtaskActions[item.id] ??
                  approveSubtaskWithMilestones.bind(null, item.id)
                }
                rejectAction={rejectActions[item.id]}
              />
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            borderRadius: "var(--radius-card)",
            border: "1px dashed var(--color-ink-200)",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--color-ink-400)", margin: 0 }}>
            {t("noPending")}
          </p>
        </div>
      )}
    </div>
  );
}
