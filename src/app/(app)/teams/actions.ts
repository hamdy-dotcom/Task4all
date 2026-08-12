"use server";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

// ── guard ──────────────────────────────────────────────────────────────────────

type GuardStatus = "unauthenticated" | "forbidden" | "ok";

async function requireSuperAdmin(): Promise<
  | { status: "unauthenticated" | "forbidden"; supabase: null }
  | { status: "ok"; supabase: Awaited<ReturnType<typeof createClient>> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated", supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin")
    return { status: "forbidden", supabase: null };

  return { status: "ok", supabase };
}

async function guardError(status: GuardStatus, t: Awaited<ReturnType<typeof getTranslations<"teams">>>) {
  if (status === "unauthenticated") return t("notAuthenticated");
  if (status === "forbidden") return t("forbidden");
  return t("unauthorized");
}

// ── teams ──────────────────────────────────────────────────────────────────────

export type TeamFormState = { error?: string; ok?: boolean } | null;

export async function upsertTeam(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const id = (formData.get("id") as string) || null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: t("nameRequired") };

  const payload = {
    name,
    name_ar: (formData.get("name_ar") as string)?.trim() || null,
    purpose: (formData.get("purpose") as string)?.trim() || null,
    purpose_ar: (formData.get("purpose_ar") as string)?.trim() || null,
    leader_id: (formData.get("leader_id") as string) || null,
    sort_order: Number(formData.get("sort_order") || 0),
  };

  const { error: dbErr } = id
    ? await supabase.from("teams").update(payload).eq("id", id)
    : await supabase.from("teams").insert(payload);

  if (dbErr) return { error: dbErr.message };
  revalidatePath("/teams");
  revalidatePath("/teams/manage");
  return { ok: true };
}

export async function deleteTeam(id: string): Promise<{ error?: string }> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const { error: dbErr } = await supabase.from("teams").delete().eq("id", id);
  if (dbErr) return { error: dbErr.message };
  revalidatePath("/teams");
  revalidatePath("/teams/manage");
  return {};
}

// ── role cards ─────────────────────────────────────────────────────────────────

export type RoleCardFormState = { error?: string; ok?: boolean } | null;

export async function upsertRoleCard(
  _prev: RoleCardFormState,
  formData: FormData
): Promise<RoleCardFormState> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const id = (formData.get("id") as string) || null;
  const title_en = (formData.get("title_en") as string)?.trim();
  if (!title_en) return { error: t("titleRequired") };

  const is_vacant = formData.get("is_vacant") === "true";
  const profile_id = is_vacant
    ? null
    : (formData.get("profile_id") as string) || null;

  const payload = {
    title_en,
    title_ar: (formData.get("title_ar") as string)?.trim() || null,
    team_id: (formData.get("team_id") as string) || null,
    is_vacant,
    is_line_lead: formData.get("is_line_lead") === "true",
    profile_id,
    reports_to: (formData.get("reports_to") as string) || null,
    purpose: (formData.get("purpose") as string)?.trim() || null,
    scope: (formData.get("scope") as string)?.trim() || null,
    indicator: (formData.get("indicator") as string)?.trim() || null,
    gives_up: (formData.get("gives_up") as string)?.trim() || null,
    risk: (formData.get("risk") as string)?.trim() || null,
    branch: (formData.get("branch") as string)?.trim() || null,
    branch_note: (formData.get("branch_note") as string)?.trim() || null,
    sort_order: Number(formData.get("sort_order") || 0),
    updated_at: new Date().toISOString(),
  };

  const { error: dbErr, data: row } = id
    ? await supabase.from("role_cards").update(payload).eq("id", id).select("id").single()
    : await supabase.from("role_cards").insert(payload).select("id").single();

  if (dbErr) return { error: dbErr.message };
  revalidatePath("/teams");
  revalidatePath("/teams/manage");
  if (id) revalidatePath(`/teams/${id}`);
  if (row?.id) revalidatePath(`/teams/${row.id}`);
  return { ok: true };
}

export async function deleteRoleCard(id: string): Promise<{ error?: string }> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const { error: dbErr } = await supabase
    .from("role_cards")
    .delete()
    .eq("id", id);
  if (dbErr) return { error: dbErr.message };
  revalidatePath("/teams");
  revalidatePath("/teams/manage");
  return {};
}

// ── tasks ──────────────────────────────────────────────────────────────────────

export type TaskFormState = { error?: string; ok?: boolean } | null;

export async function upsertTask(
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const id = (formData.get("id") as string) || null;
  const role_card_id = formData.get("role_card_id") as string;
  const body = (formData.get("body") as string)?.trim();
  if (!body || !role_card_id) return { error: t("missingFields") };

  const payload = {
    role_card_id,
    body,
    cadence: formData.get("cadence") as
      | "daily"
      | "weekly"
      | "monthly"
      | "quarterly"
      | "founding",
    sort_order: Number(formData.get("sort_order") || 0),
  };

  const { error: dbErr } = id
    ? await supabase.from("role_tasks").update(payload).eq("id", id)
    : await supabase.from("role_tasks").insert(payload);

  if (dbErr) return { error: dbErr.message };
  revalidatePath(`/teams/${role_card_id}`);
  revalidatePath("/teams/manage");
  return { ok: true };
}

export async function deleteTask(
  id: string,
  roleCardId: string
): Promise<{ error?: string }> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const { error: dbErr } = await supabase
    .from("role_tasks")
    .delete()
    .eq("id", id);
  if (dbErr) return { error: dbErr.message };
  revalidatePath(`/teams/${roleCardId}`);
  revalidatePath("/teams/manage");
  return {};
}

// ── decisions ──────────────────────────────────────────────────────────────────

export type DecisionFormState = { error?: string; ok?: boolean } | null;

export async function upsertDecision(
  _prev: DecisionFormState,
  formData: FormData
): Promise<DecisionFormState> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const id = (formData.get("id") as string) || null;
  const role_card_id = formData.get("role_card_id") as string;
  const body = (formData.get("body") as string)?.trim();
  if (!body || !role_card_id) return { error: t("missingFields") };

  const payload = {
    role_card_id,
    body,
    kind: formData.get("kind") as
      | "decides_alone"
      | "consults"
      | "stops_and_escalates",
    sort_order: Number(formData.get("sort_order") || 0),
  };

  const { error: dbErr } = id
    ? await supabase.from("role_decisions").update(payload).eq("id", id)
    : await supabase.from("role_decisions").insert(payload);

  if (dbErr) return { error: dbErr.message };
  revalidatePath(`/teams/${role_card_id}`);
  revalidatePath("/teams/manage");
  return { ok: true };
}

export async function deleteDecision(
  id: string,
  roleCardId: string
): Promise<{ error?: string }> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const { error: dbErr } = await supabase
    .from("role_decisions")
    .delete()
    .eq("id", id);
  if (dbErr) return { error: dbErr.message };
  revalidatePath(`/teams/${roleCardId}`);
  revalidatePath("/teams/manage");
  return {};
}

// ── collaborations ─────────────────────────────────────────────────────────────

export type CollabFormState = { error?: string; ok?: boolean } | null;

export async function upsertCollaboration(
  _prev: CollabFormState,
  formData: FormData
): Promise<CollabFormState> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const id = (formData.get("id") as string) || null;
  const role_card_id = formData.get("role_card_id") as string;
  const topic = (formData.get("topic") as string)?.trim();
  if (!topic || !role_card_id) return { error: t("topicRequired") };

  const payload = {
    role_card_id,
    counterpart_id: (formData.get("counterpart_id") as string) || null,
    counterpart_label:
      (formData.get("counterpart_label") as string)?.trim() || null,
    topic,
    exchange: (formData.get("exchange") as string)?.trim() || null,
    sort_order: Number(formData.get("sort_order") || 0),
  };

  const { error: dbErr } = id
    ? await supabase.from("role_collaborations").update(payload).eq("id", id)
    : await supabase.from("role_collaborations").insert(payload);

  if (dbErr) return { error: dbErr.message };
  revalidatePath(`/teams/${role_card_id}`);
  revalidatePath("/teams/manage");
  return { ok: true };
}

export async function deleteCollaboration(
  id: string,
  roleCardId: string
): Promise<{ error?: string }> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const { error: dbErr } = await supabase
    .from("role_collaborations")
    .delete()
    .eq("id", id);
  if (dbErr) return { error: dbErr.message };
  revalidatePath(`/teams/${roleCardId}`);
  revalidatePath("/teams/manage");
  return {};
}

// ── profiles ───────────────────────────────────────────────────────────────────

export type ProfileFormState = { error?: string; ok?: boolean } | null;

export async function updateProfileAdmin(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const t = await getTranslations("teams");
  const guard = await requireSuperAdmin();
  if (guard.status !== "ok") return { error: await guardError(guard.status, t) };
  const { supabase } = guard;

  const id = formData.get("id") as string;
  if (!id) return { error: t("profileIdRequired") };

  const full_name = (formData.get("full_name") as string)?.trim();
  if (!full_name) return { error: t("nameRequired") };

  const payload = {
    full_name,
    title: (formData.get("title") as string)?.trim() || null,
    team_id: (formData.get("team_id") as string) || null,
    role: formData.get("role") as
      | "super_admin"
      | "admin"
      | "team_leader"
      | "team_member",
  };

  const { error: dbErr } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id);

  if (dbErr) return { error: dbErr.message };
  revalidatePath("/teams");
  revalidatePath("/teams/manage");
  return { ok: true };
}
