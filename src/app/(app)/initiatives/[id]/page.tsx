import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import InitiativeDetail from "@/components/initiatives/InitiativeDetail";
import type { FileItemProp, HistoryEntryProp } from "@/components/work-item/types";
import {
  approveInitiative,
  rejectInitiative,
} from "@/app/(app)/initiatives/actions";
import { deleteWorkItem } from "@/app/(app)/work-items/delete-action";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InitiativePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("initiatives");
  const locale = await getLocale();

  const [
    { data: profile },
    { data: initiative },
    { data: tasks },
    { data: assigneeRows },
    { data: attachments },
    { data: historyRows },
    { count: historyTotal },
    { data: wiExtra },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("v_work_item_tree")
      .select(
        "id, title, title_ar, status, approval_status, priority, progress, classification, is_continuous, child_count, done_child_count, description, description_ar, start_date, due_date, created_by, created_by_name, team_name, parent_title, parent_id, rejection_reason"
      )
      .eq("type", "initiative")
      .eq("id", id)
      .single(),
    supabase
      .from("v_work_item_tree")
      .select("id, title, status, progress, created_by_name, due_date")
      .eq("type", "task")
      .eq("parent_id", id)
      .order("created_at", { ascending: true }),
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
    supabase
      .from("work_items")
      .select("deleted_parent_title")
      .eq("id", id)
      .single(),
  ]);

  if (!initiative) notFound();

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
  const canUpload = isSuperAdmin || isAssigned || initiative.created_by === user.id;

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

  const boundApprove = approveInitiative.bind(null, id);
  const boundReject = rejectInitiative.bind(null, id);
  const boundDelete = deleteWorkItem.bind(null, "/initiatives");

  const breadcrumbTitle =
    locale === "ar" && initiative.title_ar
      ? initiative.title_ar
      : initiative.title;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="flex items-center" style={{ marginBottom: 24, gap: 8 }}>
        <Link
          href="/initiatives"
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
          {breadcrumbTitle}
        </span>
      </div>

      <InitiativeDetail
        initiative={{ ...initiative, deleted_parent_title: wiExtra?.deleted_parent_title ?? null }}
        tasks={tasks ?? []}
        assignees={assignees}
        isSuperAdmin={isSuperAdmin}
        files={files}
        historyEntries={historyEntries}
        historyTotal={historyTotal ?? 0}
        currentUserId={user.id}
        canUpload={canUpload}
        approveAction={boundApprove}
        rejectAction={boundReject}
        deleteAction={boundDelete}
      />
    </div>
  );
}
