import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import SubtaskDetail from "@/components/subtasks/SubtaskDetail";
import type { FileItemProp, HistoryEntryProp } from "@/components/work-item/types";
import {
  approveSubtask,
  rejectSubtask,
  updateSubtaskStatus,
  toggleMilestone,
  approveMilestone,
  rejectMilestone,
  approveAllMilestones,
} from "@/app/(app)/subtasks/actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SubtaskPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("subtasks");

  const [
    { data: profile },
    { data: subtask },
    { data: milestones },
    { data: assigneeRows },
    { data: attachments },
    { data: historyRows },
    { count: historyTotal },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("v_work_item_tree")
      .select(
        "id, title, status, approval_status, priority, progress, milestone_count, milestone_done_count, milestone_pending_count, description, start_date, due_date, created_by, created_by_name, team_name, parent_title, parent_id, rejection_reason"
      )
      .eq("type", "subtask")
      .eq("id", id)
      .single(),
    supabase
      .from("subtask_milestones")
      .select("id, title, is_done, sort_order, approval_status, rejection_reason")
      .eq("work_item_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("work_item_assignees")
      .select("user_id")
      .eq("work_item_id", id),
    supabase
      .from("work_item_attachments")
      .select("id, file_name, size_bytes, mime_type, storage_path, uploaded_by, created_at, profiles!uploaded_by(full_name)")
      .eq("work_item_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("work_item_history")
      .select("id, action, field, old_value, new_value, metadata, created_at, actor_id, profiles!actor_id(full_name, avatar_url)")
      .eq("work_item_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("work_item_history")
      .select("*", { count: "exact", head: true })
      .eq("work_item_id", id),
  ]);

  if (!subtask) notFound();

  const assigneeIds = (assigneeRows ?? []).map((r) => r.user_id);
  const assignees =
    assigneeIds.length > 0
      ? (
          await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, title")
            .in("id", assigneeIds)
        ).data ?? []
      : [];

  const isSuperAdmin = profile?.role === "super_admin";
  const isAssigned = assigneeIds.includes(user.id);
  const canChangeStatus = isSuperAdmin || isAssigned;
  const canUpload = isSuperAdmin || isAssigned || subtask.created_by === user.id;

  // Generate signed URLs for image thumbnails
  const imageAttachments = (attachments ?? []).filter((a) =>
    a.mime_type?.startsWith("image/")
  );
  const signedUrlMap: Record<string, string> = {};
  if (imageAttachments.length > 0) {
    const { data: signed } = await supabase.storage
      .from("work-item-files")
      .createSignedUrls(
        imageAttachments.map((a) => a.storage_path),
        300
      );
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) signedUrlMap[s.path] = s.signedUrl;
    });
  }

  const files: FileItemProp[] = (attachments ?? []).map((a) => {
    const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    return {
      id: a.id,
      file_name: a.file_name,
      size_bytes: a.size_bytes,
      mime_type: a.mime_type,
      storage_path: a.storage_path,
      uploaded_by: a.uploaded_by,
      uploader_name: (p as { full_name?: string } | null)?.full_name ?? null,
      created_at: a.created_at,
      signed_url: signedUrlMap[a.storage_path] ?? null,
    };
  });

  const historyEntries: HistoryEntryProp[] = (historyRows ?? []).map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      action: row.action,
      actor_id: row.actor_id,
      actor_name: (p as { full_name?: string } | null)?.full_name ?? null,
      actor_avatar: (p as { avatar_url?: string } | null)?.avatar_url ?? null,
      field: row.field,
      old_value: row.old_value,
      new_value: row.new_value,
      metadata: row.metadata,
      created_at: row.created_at,
    };
  });

  const boundApprove = approveSubtask.bind(null, id);
  const boundReject = rejectSubtask.bind(null, id);
  const boundStatus = updateSubtaskStatus.bind(null, id);
  const boundApproveAll = approveAllMilestones.bind(null, id);

  type ToggleFn = (prevState: Awaited<ReturnType<typeof toggleMilestone>>, formData: FormData) => Promise<Awaited<ReturnType<typeof toggleMilestone>>>;
  type ApproveFn = (prevState: Awaited<ReturnType<typeof approveMilestone>>, formData: FormData) => Promise<Awaited<ReturnType<typeof approveMilestone>>>;
  type RejectFn = (prevState: Awaited<ReturnType<typeof rejectMilestone>>, formData: FormData) => Promise<Awaited<ReturnType<typeof rejectMilestone>>>;

  const toggleActions: Record<string, ToggleFn> = {};
  const approveMilestoneActions: Record<string, ApproveFn> = {};
  const rejectMilestoneActions: Record<string, RejectFn> = {};

  for (const m of milestones ?? []) {
    toggleActions[m.id] = toggleMilestone.bind(null, m.id);
    approveMilestoneActions[m.id] = approveMilestone.bind(null, m.id);
    rejectMilestoneActions[m.id] = rejectMilestone.bind(null, m.id);
  }

  return (
    <div style={{ maxWidth: 900 }}>
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
          className="truncate"
          style={{
            fontSize: 14,
            color: "var(--color-ink-900)",
            fontWeight: 500,
            maxWidth: 320,
          }}
        >
          {subtask.title}
        </span>
      </div>

      <SubtaskDetail
        subtask={subtask}
        milestones={(milestones ?? []).map((m) => ({
          id: m.id,
          title: m.title ?? "",
          is_done: m.is_done ?? false,
          sort_order: m.sort_order ?? 0,
          approval_status: m.approval_status ?? "pending",
          rejection_reason: m.rejection_reason ?? null,
        }))}
        assignees={assignees}
        canChangeStatus={canChangeStatus}
        isApprover={isSuperAdmin}
        isSuperAdmin={isSuperAdmin}
        files={files}
        historyEntries={historyEntries}
        historyTotal={historyTotal ?? 0}
        currentUserId={user.id}
        canUpload={canUpload}
        approveAction={boundApprove}
        rejectAction={boundReject}
        statusAction={boundStatus}
        toggleActions={toggleActions}
        approveMilestoneActions={approveMilestoneActions}
        rejectMilestoneActions={rejectMilestoneActions}
        approveAllMilestonesAction={boundApproveAll}
      />
    </div>
  );
}
