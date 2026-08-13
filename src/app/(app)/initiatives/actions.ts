"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import {
  notifyItemCreated,
  notifyApproval,
  notifyRejection,
} from "@/lib/notifications";

const ALLOWED_ROLES_CREATE = ["super_admin", "admin"] as const;

const CLASSIFICATION_VALUES = [
  "product",
  "service",
  "project",
  "experiment",
  "stopgap",
  "internal_capability",
  "process",
] as const;

export type CreateInitiativeState = { error: string } | { id: string } | null;
export type ApproveInitiativeState = { error: string } | null;
export type RejectInitiativeState = { error: string } | null;

export async function createInitiative(
  _prev: CreateInitiativeState,
  formData: FormData
): Promise<CreateInitiativeState> {
  const t = await getTranslations("initiatives");

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
    !ALLOWED_ROLES_CREATE.includes(
      profile.role as (typeof ALLOWED_ROLES_CREATE)[number]
    )
  ) {
    return { error: t("notAdmin") };
  }

  const CreateInitiativeSchema = z.object({
    title: z
      .string()
      .min(1, t("form.titleRequired"))
      .max(200, t("titleTooLong")),
    description: z.string().max(2000, t("descriptionTooLong")).optional(),
    parent_id: z.string().uuid(t("parentRequired")),
    classification: z.enum(CLASSIFICATION_VALUES, {
      message: t("classificationRequired"),
    }),
    start_date: z.string().nullable(),
    due_date: z.string().nullable(),
    team_id: z.string().uuid().nullable(),
  });

  const raw = {
    title: (formData.get("title") as string | null)?.trim() ?? "",
    description:
      (formData.get("description") as string | null)?.trim() || undefined,
    parent_id: (formData.get("parent_id") as string | null) ?? "",
    classification: (formData.get("classification") as string | null) ?? "",
    start_date: (formData.get("start_date") as string | null) || null,
    due_date: (formData.get("due_date") as string | null) || null,
    team_id: (formData.get("team_id") as string | null) || null,
  };

  const parsed = CreateInitiativeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const { data, error } = await supabase
    .from("work_items")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      parent_id: parsed.data.parent_id,
      classification: parsed.data.classification,
      start_date: parsed.data.start_date,
      due_date: parsed.data.due_date,
      team_id: parsed.data.team_id,
      type: "initiative",
      approval_status: "pending",
      status: "not_started",
      created_by:
        profile.role === "super_admin"
          ? ((formData.get("owner_id") as string | null) || user.id)
          : user.id,
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

  revalidatePath("/initiatives");
  void notifyItemCreated(data.id, user.id, parsed.data.title, "initiative");
  return { id: data.id };
}

export async function approveInitiative(
  id: string,
  _prev: ApproveInitiativeState,
  formData: FormData
): Promise<ApproveInitiativeState> {
  const t = await getTranslations("initiatives");
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
    return { error: tApprovals("superAdminOnly") };
  }

  const ApproveSchema = z.object({
    priority: z.enum(["low", "medium", "high", "critical"], {
      message: tApprovals("priorityRequired"),
    }),
  });

  const parsed = ApproveSchema.safeParse({
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const { error } = await supabase.rpc("approve_work_item", {
    p_item: id,
    p_priority: parsed.data.priority,
  });

  if (error) return { error: error.message };

  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/initiatives");
  void notifyApproval(id, user.id, parsed.data.priority);
  return null;
}

export async function rejectInitiative(
  id: string,
  _prev: RejectInitiativeState,
  formData: FormData
): Promise<RejectInitiativeState> {
  const t = await getTranslations("initiatives");
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
    return { error: tApprovals("superAdminOnly") };
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

  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/initiatives");
  void notifyRejection(id, user.id, parsed.data.rejection_reason);
  return null;
}
