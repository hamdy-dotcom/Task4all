// Server-side only. Never import from client components.
// Uses service-role client so RLS is bypassed for cross-user notification inserts.

import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { approvedEmail } from "@/lib/emails/approved";
import { rejectedEmail } from "@/lib/emails/rejected";
import { doneEmail } from "@/lib/emails/done";
import { approvalRequestEmail } from "@/lib/emails/approval-request";
import type { Database } from "@/lib/database.types";

type NotificationType = Database["public"]["Enums"]["notification_type"];

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM_EMAIL ?? "task4all <notifications@nml.sa>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

// ── helpers ───────────────────────────────────────────────────────────────────

function itemUrl(type: string, id: string): string {
  const seg: Record<string, string> = {
    initiative: "initiatives",
    task: "tasks",
    subtask: "subtasks",
  };
  return `${APP_URL}/${seg[type] ?? type}/${id}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "No due date";
  // due_date is stored as YYYY-MM-DD; parse in UTC to avoid midnight roll-back
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function getProfile(userId: string): Promise<{ full_name: string; email: string } | null> {
  const { data } = await createServiceClient()
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();
  return data;
}

async function getSuperAdminIds(): Promise<string[]> {
  const { data } = await createServiceClient()
    .from("profiles")
    .select("id")
    .eq("role", "super_admin");
  return (data ?? []).map((r) => r.id);
}

interface ItemContext {
  id: string;
  title: string;
  type: string;
  created_by: string;
  parent_id: string | null;
  due_date: string | null;
  description: string | null;
  priority: string | null;
  classification: string | null;
}

async function getItemFull(itemId: string): Promise<{
  item: ItemContext | null;
  pathLabel: string;
  assignees: Array<{ id: string; full_name: string; email: string }>;
  milestones: Array<{ title: string; status: string; rejection_reason: string | null }>;
}> {
  const supabase = createServiceClient();

  const [{ data: item }, { data: pathRow }, { data: assigneeRows }] = await Promise.all([
    supabase
      .from("work_items")
      .select("id, title, type, created_by, parent_id, due_date, description, priority, classification")
      .eq("id", itemId)
      .single(),
    supabase.from("v_item_path").select("path_label").eq("item_id", itemId).maybeSingle(),
    supabase
      .from("work_item_assignees")
      .select("user_id, profiles!work_item_assignees_user_id_fkey(full_name, email)")
      .eq("work_item_id", itemId),
  ]);

  type ProfileShape = { full_name: string; email: string };
  const assignees = (assigneeRows ?? []).map((r) => {
    const p = (r as unknown as { user_id: string; profiles: ProfileShape | null }).profiles;
    return { id: r.user_id, full_name: p?.full_name ?? "", email: p?.email ?? "" };
  });

  let milestones: Array<{ title: string; status: string; rejection_reason: string | null }> = [];
  if (item?.type === "subtask") {
    const { data } = await supabase
      .from("subtask_milestones")
      .select("title, approval_status, rejection_reason")
      .eq("work_item_id", itemId)
      .order("sort_order");
    milestones = (data ?? []).map((m) => ({
      title: m.title ?? "",
      status: m.approval_status ?? "pending",
      rejection_reason: m.rejection_reason ?? null,
    }));
  }

  return {
    item: item ?? null,
    pathLabel: pathRow?.path_label ?? "",
    assignees,
    milestones,
  };
}

// ── core notify ───────────────────────────────────────────────────────────────

interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

interface NotifyOpts {
  actorId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  workItemId?: string;
  /** Single email sent to every recipient. */
  email?: EmailPayload;
  /** Per-recipient email — overrides `email` when provided. Return null to skip email for that recipient. */
  emailFor?: (recipientId: string) => EmailPayload | null;
}

async function notify(opts: NotifyOpts): Promise<void> {
  const { actorId, userIds, type, title, body, workItemId, email, emailFor } = opts;

  const recipients = [...new Set(userIds)].filter((id) => id && id !== actorId);
  if (recipients.length === 0) return;

  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("notifications")
    .insert(
      recipients.map((userId) => ({
        user_id: userId,
        type,
        title,
        body: body ?? null,
        work_item_id: workItemId ?? null,
      }))
    )
    .select("id, user_id");

  if (error) {
    console.error("[notifications] insert failed:", error.message);
    return;
  }

  const hasEmail = emailFor || email;
  if (!hasEmail || !rows || rows.length === 0) return;

  const notifByUser: Record<string, string> = {};
  for (const row of rows) notifByUser[row.user_id] = row.id;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", recipients);

  if (!profiles || profiles.length === 0) return;

  await Promise.all(
    profiles.map(async (p) => {
      const payload = emailFor ? emailFor(p.id) : email!;
      if (!payload) return;
      try {
        await resend.emails.send({
          from: FROM,
          to: p.email,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });
        const notifId = notifByUser[p.id];
        if (notifId) {
          await supabase
            .from("notifications")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", notifId);
        }
      } catch (err) {
        console.error("[notifications] email failed for user", p.id, err);
      }
    })
  );
}

// ── public helpers ────────────────────────────────────────────────────────────

/** Notify all super_admins when an item is created: in-app row + instant email. */
export async function notifyItemCreated(
  itemId: string,
  actorId: string,
  itemTitle: string,
  itemType: string
): Promise<void> {
  try {
    const [superAdminIds, { item, pathLabel, milestones }] = await Promise.all([
      getSuperAdminIds(),
      getItemFull(itemId),
    ]);

    const creatorProfile = item ? await getProfile(item.created_by) : null;
    const creatorName = creatorProfile?.full_name ?? "Someone";
    const dueDate = item ? formatDate(item.due_date) : "No due date";
    const url = `${APP_URL}/approvals`;

    await notify({
      actorId,
      userIds: superAdminIds,
      type: "approval_required",
      title: `New ${itemType} pending approval`,
      body: itemTitle,
      workItemId: itemId,
      email: (() => {
        const { html, text } = approvalRequestEmail({
          itemTitle,
          itemType,
          pathLabel,
          creatorName,
          dueDate,
          description: item?.description,
          classification: item?.type === "initiative" ? item.classification : undefined,
          milestoneCount: item?.type === "subtask" ? milestones.length : undefined,
          itemUrl: url,
        });
        return { subject: `Approval needed: ${itemTitle}`, html, text };
      })(),
    });
  } catch (err) {
    console.error("[notifyItemCreated]", err);
  }
}

/** Notify creator + assignees when an item is approved. Each gets different copy. */
export async function notifyApproval(
  itemId: string,
  actorId: string,
  priority: string
): Promise<void> {
  try {
    const { item, pathLabel, assignees, milestones } = await getItemFull(itemId);
    if (!item) return;

    const approverProfile = await getProfile(actorId);
    const creatorProfile = await getProfile(item.created_by);
    const approverName = approverProfile?.full_name ?? "Someone";
    const creatorName = creatorProfile?.full_name ?? "Unknown";
    const dueDate = formatDate(item.due_date);
    const url = itemUrl(item.type, itemId);
    const assigneeNames = assignees.map((a) => a.full_name);
    const subtaskMilestones = item.type === "subtask" ? milestones : undefined;

    const assigneeIds = assignees.map((a) => a.id);
    const recipients = [item.created_by, ...assigneeIds].filter(Boolean);

    await notify({
      actorId,
      userIds: recipients,
      type: "approved",
      title: `${cap(item.type)} approved`,
      body: item.title,
      workItemId: itemId,
      emailFor: (recipientId) => {
        const isCreator = recipientId === item.created_by;
        const role = isCreator ? "creator" : "assignee";
        const { html, text, subject } = approvedEmail({
          recipientRole: role,
          itemTitle: item.title,
          itemType: item.type,
          pathLabel,
          priority,
          approverName,
          creatorName,
          assigneeNames,
          dueDate,
          description: item.description,
          itemUrl: url,
          milestones: subtaskMilestones,
        });
        return { subject, html, text };
      },
    });
  } catch (err) {
    console.error("[notifyApproval]", err);
  }
}

/** Notify creator when an item is rejected. */
export async function notifyRejection(
  itemId: string,
  actorId: string,
  reason: string
): Promise<void> {
  try {
    const { item, pathLabel } = await getItemFull(itemId);
    if (!item) return;

    const url = itemUrl(item.type, itemId);
    const dueDate = formatDate(item.due_date);
    const { html, text } = rejectedEmail({
      itemTitle: item.title,
      itemType: item.type,
      pathLabel,
      reason,
      dueDate,
      description: item.description,
      itemUrl: url,
    });

    await notify({
      actorId,
      userIds: [item.created_by],
      type: "rejected",
      title: `${cap(item.type)} rejected`,
      body: item.title,
      workItemId: itemId,
      email: { subject: `Rejected: ${item.title}`, html, text },
    });
  } catch (err) {
    console.error("[notifyRejection]", err);
  }
}

/** Notify creator + assignees when an item is marked done. */
export async function notifyStatusDone(
  itemId: string,
  actorId: string,
  actorName: string
): Promise<void> {
  try {
    const { item, pathLabel, assignees } = await getItemFull(itemId);
    if (!item) return;

    let parentTitle = "";
    let parentProgress = 0;
    if (item.parent_id) {
      const { data: parent } = await createServiceClient()
        .from("v_work_item_tree")
        .select("title, progress")
        .eq("id", item.parent_id)
        .single();
      parentTitle = parent?.title ?? "";
      parentProgress = parent?.progress ?? 0;
    }

    const url = itemUrl(item.type, itemId);
    const assigneeIds = assignees.map((a) => a.id);
    const recipients = [item.created_by, ...assigneeIds].filter(Boolean);

    await notify({
      actorId,
      userIds: recipients,
      type: "marked_done",
      title: `${cap(item.type)} marked as done`,
      body: item.title,
      workItemId: itemId,
      emailFor: (recipientId) => {
        const role = recipientId === item.created_by ? "creator" : "assignee";
        const { html, text } = doneEmail({
          recipientRole: role,
          itemTitle: item.title,
          itemType: item.type,
          pathLabel,
          markedByName: actorName,
          parentTitle,
          parentProgress,
          itemUrl: url,
        });
        return { subject: `Done: ${item.title}`, html, text };
      },
    });
  } catch (err) {
    console.error("[notifyStatusDone]", err);
  }
}

/** Notify a newly-assigned person when the item is already approved. */
export async function notifyAssignment(
  itemId: string,
  actorId: string,
  assigneeId: string
): Promise<void> {
  try {
    const { item, pathLabel } = await getItemFull(itemId);
    if (!item) return;

    const supabase = createServiceClient();
    const { data: wi } = await supabase
      .from("work_items")
      .select("approval_status, priority")
      .eq("id", itemId)
      .single();
    if (wi?.approval_status !== "approved") return;

    const priority = wi.priority ?? "medium";
    const approverProfile = await getProfile(actorId);
    const creatorProfile = await getProfile(item.created_by);
    const url = itemUrl(item.type, itemId);

    const { html, text, subject } = approvedEmail({
      recipientRole: "assignee",
      itemTitle: item.title,
      itemType: item.type,
      pathLabel,
      priority,
      approverName: approverProfile?.full_name ?? "Someone",
      creatorName: creatorProfile?.full_name ?? "Unknown",
      dueDate: formatDate(item.due_date),
      description: item.description,
      itemUrl: url,
    });

    await notify({
      actorId,
      userIds: [assigneeId],
      type: "assigned",
      title: `You were assigned to a ${item.type}`,
      body: item.title,
      workItemId: itemId,
      email: { subject, html, text },
    });
  } catch (err) {
    console.error("[notifyAssignment]", err);
  }
}
