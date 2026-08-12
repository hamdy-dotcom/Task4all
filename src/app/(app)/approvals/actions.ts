"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyApproval, notifyRejection } from "@/lib/notifications";
import { getTranslations } from "next-intl/server";

export type ApproveWorkItemState = { error: string } | null;
export type RejectWorkItemState = { error: string } | null;
export type ApproveSubtaskWithMilestonesState = { error: string } | null;

async function requireSuperAdmin() {
  const [supabase, t, tc] = await Promise.all([
    createClient(),
    getTranslations("approvals"),
    getTranslations("common"),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: tc("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { supabase: null, user: null, error: t("superAdminOnly") };
  }

  return { supabase, user, error: null };
}

export async function approveWorkItem(
  itemId: string,
  _prev: ApproveWorkItemState,
  formData: FormData
): Promise<ApproveWorkItemState> {
  const [{ supabase, user, error: authError }, t] = await Promise.all([
    requireSuperAdmin(),
    getTranslations("approvals"),
  ]);
  if (!supabase || !user) return { error: authError! };

  const parsed = z
    .object({
      priority: z.enum(["low", "medium", "high", "critical"], {
        message: t("priorityRequiredToApprove"),
      }),
    })
    .safeParse({ priority: formData.get("priority") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("priorityRequired") };
  }

  const { error } = await supabase.rpc("approve_work_item", {
    p_item: itemId,
    p_priority: parsed.data.priority,
  });

  if (error) return { error: error.message };

  revalidatePath("/approvals");
  void notifyApproval(itemId, user.id, parsed.data.priority);
  return null;
}

export async function rejectWorkItem(
  itemId: string,
  _prev: RejectWorkItemState,
  formData: FormData
): Promise<RejectWorkItemState> {
  const [{ supabase, user, error: authError }, t] = await Promise.all([
    requireSuperAdmin(),
    getTranslations("approvals"),
  ]);
  if (!supabase || !user) return { error: authError! };

  const parsed = z
    .object({
      rejection_reason: z
        .string()
        .min(1, t("reasonRequired"))
        .max(1000, t("reasonTooLong")),
    })
    .safeParse({
      rejection_reason: (formData.get("rejection_reason") as string | null)?.trim(),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("reasonRequired") };
  }

  const { error } = await supabase.rpc("reject_work_item", {
    p_item: itemId,
    p_reason: parsed.data.rejection_reason,
  });

  if (error) return { error: error.message };

  revalidatePath("/approvals");
  void notifyRejection(itemId, user.id, parsed.data.rejection_reason);
  return null;
}

export async function approveSubtaskWithMilestones(
  subtaskId: string,
  _prev: ApproveSubtaskWithMilestonesState,
  formData: FormData
): Promise<ApproveSubtaskWithMilestonesState> {
  const [{ supabase, user, error: authError }, t] = await Promise.all([
    requireSuperAdmin(),
    getTranslations("approvals"),
  ]);
  if (!supabase || !user) return { error: authError! };

  const parsed = z
    .object({
      priority: z.enum(["low", "medium", "high", "critical"], {
        message: t("priorityRequiredToApprove"),
      }),
    })
    .safeParse({ priority: formData.get("priority") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("priorityRequired") };
  }

  const { error: workItemError } = await supabase.rpc("approve_work_item", {
    p_item: subtaskId,
    p_priority: parsed.data.priority,
  });
  if (workItemError) return { error: workItemError.message };

  const milestoneIds = formData.getAll("milestone_id") as string[];

  for (const milestoneId of milestoneIds) {
    const decision = formData.get(`decision_${milestoneId}`) as string;

    if (decision === "approve") {
      const { error } = await supabase.rpc("approve_milestone", {
        p_milestone: milestoneId,
      });
      if (error) return { error: t("milestoneError", { msg: error.message }) };
    } else if (decision === "reject") {
      const reason =
        (formData.get(`reason_${milestoneId}`) as string | null)?.trim() ?? "";
      if (!reason) return { error: t("reasonRequired") };
      const { error } = await supabase.rpc("reject_milestone", {
        p_milestone: milestoneId,
        p_reason: reason,
      });
      if (error) return { error: t("milestoneError", { msg: error.message }) };
    }
    // decision === 'skip' → leave as-is
  }

  revalidatePath(`/subtasks/${subtaskId}`);
  revalidatePath("/subtasks");
  revalidatePath("/approvals");
  void notifyApproval(subtaskId, user.id, parsed.data.priority);
  return null;
}
