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

const CREATOR_ROLES = ["super_admin", "admin", "team_leader"] as const;

export type CreateTaskState = { error: string } | { id: string } | null;
export type ApproveTaskState = { error: string } | null;
export type RejectTaskState = { error: string } | null;
export type UpdateTaskStatusState = { error: string } | null;

export async function createTask(
  _prev: CreateTaskState,
  formData: FormData
): Promise<CreateTaskState> {
  const supabase = await createClient();
  const t = await getTranslations("tasks");

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

  const CreateTaskSchema = z.object({
    title: z
      .string()
      .min(1, t("form.titleRequired"))
      .max(200, t("titleTooLong")),
    description: z.string().max(2000, t("descriptionTooLong")).optional(),
    parent_id: z.string().uuid(t("parentRequired")),
    start_date: z.string().nullable(),
    due_date: z.string().nullable(),
    team_id: z.string().uuid().nullable(),
  });

  const raw = {
    title: (formData.get("title") as string | null)?.trim() ?? "",
    description:
      (formData.get("description") as string | null)?.trim() || undefined,
    parent_id: (formData.get("parent_id") as string | null) ?? "",
    start_date: (formData.get("start_date") as string | null) || null,
    due_date: (formData.get("due_date") as string | null) || null,
    team_id: (formData.get("team_id") as string | null) || null,
  };

  const parsed = CreateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const { data, error } = await supabase
    .from("work_items")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      parent_id: parsed.data.parent_id,
      start_date: parsed.data.start_date,
      due_date: parsed.data.due_date,
      team_id: parsed.data.team_id,
      type: "task",
      approval_status: "pending",
      status: "not_started",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

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

  revalidatePath("/tasks");
  void notifyItemCreated(data.id, user.id, parsed.data.title, "task");
  return { id: data.id };
}

export async function approveTask(
  id: string,
  _prev: ApproveTaskState,
  formData: FormData
): Promise<ApproveTaskState> {
  const supabase = await createClient();
  const [t, ta] = await Promise.all([
    getTranslations("tasks"),
    getTranslations("approvals"),
  ]);

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
      message: ta("priorityRequiredToApprove"),
    }),
  });

  const parsed = ApproveSchema.safeParse({
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? ta("priorityRequired"),
    };
  }

  const { error } = await supabase.rpc("approve_work_item", {
    p_item: id,
    p_priority: parsed.data.priority,
  });

  if (error) return { error: error.message };

  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks");
  void notifyApproval(id, user.id, parsed.data.priority);
  return null;
}

export async function rejectTask(
  id: string,
  _prev: RejectTaskState,
  formData: FormData
): Promise<RejectTaskState> {
  const supabase = await createClient();
  const [t, ta] = await Promise.all([
    getTranslations("tasks"),
    getTranslations("approvals"),
  ]);

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
      .min(1, ta("reasonRequired"))
      .max(1000, ta("reasonTooLong")),
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

  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks");
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

export async function updateTaskStatus(
  id: string,
  _prev: UpdateTaskStatusState,
  formData: FormData
): Promise<UpdateTaskStatusState> {
  const supabase = await createClient();
  const t = await getTranslations("tasks");

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
          blockers: blockers.map((b) => b.detail).join("; "),
        }),
      };
    }
  }

  const { error } = await supabase
    .from("work_items")
    .update({ status: newStatus as WorkStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks");
  if (newStatus === "done") {
    void notifyStatusDone(id, user.id, profile.full_name);
  }
  return null;
}
