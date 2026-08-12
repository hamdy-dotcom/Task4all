"use server";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  notifyItemCreated,
  notifyApproval,
  notifyRejection,
  notifyStatusDone,
} from "@/lib/notifications";

const CREATOR_ROLES = ["super_admin", "admin", "team_leader", "team_member"] as const;

export type CreateSubtaskState = { error: string } | { id: string } | null;
export type ApproveSubtaskState = { error: string } | null;
export type RejectSubtaskState = { error: string } | null;
export type UpdateSubtaskStatusState = { error: string } | null;
export type ToggleMilestoneState = { error: string } | null;
export type ApproveMilestoneState = { error: string } | null;
export type RejectMilestoneState = { error: string } | null;
export type ApproveAllMilestonesState = { error: string; count?: never } | { count: number; error?: never } | null;

export async function createSubtask(
  _prev: CreateSubtaskState,
  formData: FormData
): Promise<CreateSubtaskState> {
  const t = await getTranslations("subtasks");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !CREATOR_ROLES.includes(profile.role as (typeof CREATOR_ROLES)[number])
  ) {
    return { error: t("notAuthorized") };
  }

  const CreateSubtaskSchema = z.object({
    title: z
      .string()
      .min(1, t("form.titleRequired"))
      .max(200, t("titleTooLong")),
    description: z.string().max(2000, t("descriptionTooLong")).optional(),
    parent_id: z.string().uuid(t("parentRequired")),
    start_date: z.string().nullable(),
    due_date: z.string().nullable(),
  });

  const raw = {
    title: (formData.get("title") as string | null)?.trim() ?? "",
    description:
      (formData.get("description") as string | null)?.trim() || undefined,
    parent_id: (formData.get("parent_id") as string | null) ?? "",
    start_date: (formData.get("start_date") as string | null) || null,
    due_date: (formData.get("due_date") as string | null) || null,
  };

  const parsed = CreateSubtaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const milestoneTitles = (formData.getAll("milestone_title") as string[])
    .map((title) => title.trim())
    .filter(Boolean);

  if (milestoneTitles.length === 0) {
    return { error: t("atLeastOneMilestone") };
  }

  const insertPayload = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    parent_id: parsed.data.parent_id,
    start_date: parsed.data.start_date,
    due_date: parsed.data.due_date,
    type: "subtask" as const,
    approval_status: "pending" as const,
    status: "not_started" as const,
    created_by: user.id,
  };

  const { error: insertError } = await supabase
    .from("work_items")
    .insert(insertPayload);

  if (insertError) return { error: insertError.message };

  // SELECT back the id separately to avoid RETURNING triggering the SELECT policy on pending rows.
  const { data, error: selectError } = await supabase
    .from("work_items")
    .select("id")
    .eq("created_by", user.id)
    .eq("type", "subtask")
    .eq("title", insertPayload.title)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (selectError) return { error: selectError.message };

  const { error: milestoneError } = await supabase
    .from("subtask_milestones")
    .insert(
      milestoneTitles.map((title, idx) => ({
        work_item_id: data.id,
        title,
        sort_order: idx,
        created_by: user.id,
      }))
    );

  if (milestoneError) return { error: milestoneError.message };

  const assigneeIds = formData.getAll("assignees") as string[];
  if (assigneeIds.length > 0) {
    await supabase.from("work_item_assignees").insert(
      assigneeIds.map((uid) => ({
        work_item_id: data.id,
        user_id: uid,
        assigned_by: user.id,
      }))
    );
  }

  revalidatePath("/subtasks");
  void notifyItemCreated(data.id, user.id, parsed.data.title, "subtask");
  return { id: data.id };
}

export async function approveSubtask(
  id: string,
  _prev: ApproveSubtaskState,
  formData: FormData
): Promise<ApproveSubtaskState> {
  const t = await getTranslations("subtasks");
  const tApprovals = await getTranslations("approvals");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { error: t("superAdminOnly") };
  }

  const ApproveSchema = z.object({
    priority: z.enum(["low", "medium", "high", "critical"], {
      message: tApprovals("priorityRequiredToApprove"),
    }),
  });

  const parsed = ApproveSchema.safeParse({
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? tApprovals("priorityRequired") };
  }

  const { error } = await supabase.rpc("approve_work_item", {
    p_item: id,
    p_priority: parsed.data.priority,
  });

  if (error) return { error: error.message };

  revalidatePath(`/subtasks/${id}`);
  revalidatePath("/subtasks");
  void notifyApproval(id, user.id, parsed.data.priority);
  return null;
}

export async function rejectSubtask(
  id: string,
  _prev: RejectSubtaskState,
  formData: FormData
): Promise<RejectSubtaskState> {
  const t = await getTranslations("subtasks");
  const tApprovals = await getTranslations("approvals");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { error: t("superAdminOnly") };
  }

  const RejectSchema = z.object({
    rejection_reason: z
      .string()
      .min(1, tApprovals("reasonRequired"))
      .max(1000, tApprovals("reasonTooLong")),
  });

  const parsed = RejectSchema.safeParse({
    rejection_reason: (
      formData.get("rejection_reason") as string | null
    )?.trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const { error } = await supabase.rpc("reject_work_item", {
    p_item: id,
    p_reason: parsed.data.rejection_reason,
  });

  if (error) return { error: error.message };

  revalidatePath(`/subtasks/${id}`);
  revalidatePath("/subtasks");
  void notifyRejection(id, user.id, parsed.data.rejection_reason);
  return null;
}

const VALID_STATUSES = [
  "not_started",
  "pending",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
type WorkStatus = (typeof VALID_STATUSES)[number];

export async function updateSubtaskStatus(
  id: string,
  _prev: UpdateSubtaskStatusState,
  formData: FormData
): Promise<UpdateSubtaskStatusState> {
  const t = await getTranslations("subtasks");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: t("profileNotFound") };

  const isSuperAdmin = profile.role === "super_admin";

  if (!isSuperAdmin) {
    const { data: isAssigned } = await supabase.rpc("is_assigned", {
      p_item: id,
    });
    if (!isAssigned) return { error: t("notAssigned") };
  }

  const newStatus = formData.get("status") as string;
  if (!(VALID_STATUSES as readonly string[]).includes(newStatus)) {
    return { error: t("invalidStatus") };
  }

  if (newStatus === "done") {
    const { data: blockers } = await supabase.rpc("completion_blockers", {
      p_item: id,
    });
    if (blockers && blockers.length > 0) {
      return {
        error: t("cannotMarkDone", {
          blockers: blockers.map((b: { detail: string }) => b.detail).join("; "),
        }),
      };
    }
  }

  const { error } = await supabase
    .from("work_items")
    .update({ status: newStatus as WorkStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/subtasks/${id}`);
  revalidatePath("/subtasks");
  if (newStatus === "done") {
    void notifyStatusDone(id, user.id, profile.full_name);
  }
  return null;
}

export async function toggleMilestone(
  milestoneId: string,
  _prev: ToggleMilestoneState,
  formData: FormData
): Promise<ToggleMilestoneState> {
  const t = await getTranslations("subtasks");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const isDone = formData.get("is_done") === "true";
  const subtaskId = (formData.get("subtask_id") as string | null) ?? "";

  const { error } = await supabase
    .from("subtask_milestones")
    .update({
      is_done: isDone,
      completed_at: isDone ? new Date().toISOString() : null,
      completed_by: isDone ? user.id : null,
    })
    .eq("id", milestoneId);

  if (error) return { error: error.message };

  revalidatePath(`/subtasks/${subtaskId}`);
  return null;
}

export async function approveMilestone(
  milestoneId: string,
  _prev: ApproveMilestoneState,
  _formData: FormData
): Promise<ApproveMilestoneState> {
  const t = await getTranslations("subtasks");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { error: t("superAdminMilestone") };
  }

  const { error } = await supabase.rpc("approve_milestone", {
    p_milestone: milestoneId,
  });

  if (error) return { error: error.message };

  revalidatePath("/subtasks");
  revalidatePath("/approvals");
  return null;
}

export async function rejectMilestone(
  milestoneId: string,
  _prev: RejectMilestoneState,
  formData: FormData
): Promise<RejectMilestoneState> {
  const t = await getTranslations("subtasks");
  const tApprovals = await getTranslations("approvals");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { error: t("superAdminMilestone") };
  }

  const RejectMilestoneSchema = z.object({
    rejection_reason: z
      .string()
      .min(1, tApprovals("reasonRequired"))
      .max(1000, tApprovals("reasonTooLong")),
  });

  const parsed = RejectMilestoneSchema.safeParse({
    rejection_reason: (
      formData.get("rejection_reason") as string | null
    )?.trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const { error } = await supabase.rpc("reject_milestone", {
    p_milestone: milestoneId,
    p_reason: parsed.data.rejection_reason,
  });

  if (error) return { error: error.message };

  revalidatePath("/subtasks");
  revalidatePath("/approvals");
  return null;
}

export async function approveAllMilestones(
  subtaskId: string,
  _prev: ApproveAllMilestonesState,
  _formData: FormData
): Promise<ApproveAllMilestonesState> {
  const t = await getTranslations("subtasks");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { error: t("superAdminMilestone") };
  }

  const { data, error } = await supabase.rpc("approve_all_milestones", {
    p_item: subtaskId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/subtasks/${subtaskId}`);
  revalidatePath("/subtasks");
  revalidatePath("/approvals");
  return { count: data ?? 0 };
}
