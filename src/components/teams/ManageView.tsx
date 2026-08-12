"use client";

import React, { useActionState, useState } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  upsertTeam,
  deleteTeam,
  upsertRoleCard,
  deleteRoleCard,
  upsertTask,
  deleteTask,
  upsertDecision,
  deleteDecision,
  upsertCollaboration,
  deleteCollaboration,
  updateProfileAdmin,
  type TeamFormState,
  type RoleCardFormState,
  type TaskFormState,
  type DecisionFormState,
  type CollabFormState,
  type ProfileFormState,
} from "@/app/(app)/teams/actions";

// ── types ──────────────────────────────────────────────────────────────────────

type Team = {
  id: string; name: string; name_ar: string | null; purpose: string | null;
  purpose_ar: string | null; leader_id: string | null; sort_order: number;
};
type RoleCard = {
  id: string; title_en: string; title_ar: string | null; team_id: string | null;
  is_line_lead: boolean; is_vacant: boolean; profile_id: string | null;
  reports_to: string | null; purpose: string | null; scope: string | null;
  indicator: string | null; gives_up: string | null; risk: string | null;
  branch: string | null; branch_note: string | null; sort_order: number;
};
type RoleTask = {
  id: string; role_card_id: string; body: string;
  cadence: "daily" | "weekly" | "monthly" | "quarterly" | "founding"; sort_order: number;
};
type RoleDecision = {
  id: string; role_card_id: string; body: string;
  kind: "decides_alone" | "consults" | "stops_and_escalates"; sort_order: number;
};
type RoleCollab = {
  id: string; role_card_id: string; counterpart_id: string | null;
  counterpart_label: string | null; topic: string; exchange: string | null; sort_order: number;
};
type Profile = {
  id: string; full_name: string; title: string | null;
  role: string; team_id: string | null;
};

interface Props {
  teams: Team[];
  roleCards: RoleCard[];
  tasks: RoleTask[];
  decisions: RoleDecision[];
  collabs: RoleCollab[];
  profiles: Profile[];
}

// ── shared styles ──────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface)",
  fontSize: 13,
  color: "var(--color-ink-900)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const textareaSt: React.CSSProperties = {
  ...inputSt,
  height: "auto",
  padding: "8px 12px",
  resize: "vertical",
  lineHeight: 1.5,
};
const labelSt: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-ink-500)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: 4,
};
const btnPrimary: React.CSSProperties = {
  height: 34,
  padding: "0 16px",
  borderRadius: 999,
  border: "none",
  background: "var(--color-nml)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid var(--color-ink-200)",
  background: "transparent",
  color: "var(--color-ink-600)",
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};
const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: "var(--color-crit, #A50E14)",
  borderColor: "var(--color-crit-soft, #FBE4E5)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  );
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-crit, #A50E14)" }}>{msg}</p>
  );
}

// ── team form ──────────────────────────────────────────────────────────────────

function TeamForm({
  team,
  profiles,
  onDone,
}: {
  team?: Team;
  profiles: Profile[];
  onDone: () => void;
}) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<TeamFormState, FormData>(upsertTeam, null);
  if (state?.ok) { onDone(); return null; }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {team && <input type="hidden" name="id" value={team.id} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t("nameEn")}>
          <input style={inputSt} name="name" defaultValue={team?.name} required />
        </Field>
        <Field label={t("nameAr")}>
          <input style={inputSt} name="name_ar" defaultValue={team?.name_ar ?? ""} dir="rtl" />
        </Field>
      </div>
      <Field label={t("purposeEn")}>
        <textarea style={{ ...textareaSt, minHeight: 60 }} name="purpose" defaultValue={team?.purpose ?? ""} />
      </Field>
      <Field label={t("purposeAr")}>
        <textarea style={{ ...textareaSt, minHeight: 60 }} name="purpose_ar" defaultValue={team?.purpose_ar ?? ""} dir="rtl" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Field label={t("leader")}>
          <select style={inputSt} name="leader_id" defaultValue={team?.leader_id ?? ""}>
            <option value="">{t("noneOption")}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("sortOrder")}>
          <input style={inputSt} name="sort_order" type="number" defaultValue={team?.sort_order ?? 0} />
        </Field>
      </div>
      <ErrMsg msg={state?.error} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" style={btnPrimary} disabled={pending}>
          {pending ? t("saving") : team ? tc("save") : tc("create")}
        </button>
        <button type="button" style={btnGhost} onClick={onDone}>{tc("cancel")}</button>
      </div>
    </form>
  );
}

// ── role card form ─────────────────────────────────────────────────────────────

function RoleCardForm({
  card,
  teams,
  profiles,
  tasks,
  decisions,
  collabs,
  onDone,
}: {
  card?: RoleCard;
  teams: Team[];
  profiles: Profile[];
  tasks: RoleTask[];
  decisions: RoleDecision[];
  collabs: RoleCollab[];
  onDone: () => void;
}) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<RoleCardFormState, FormData>(upsertRoleCard, null);
  const [isVacant, setIsVacant] = useState(card?.is_vacant ?? false);
  const [taskState, taskAction] = useActionState<TaskFormState, FormData>(upsertTask, null);
  const [decState, decAction] = useActionState<DecisionFormState, FormData>(upsertDecision, null);
  const [collabState, collabAction] = useActionState<CollabFormState, FormData>(upsertCollaboration, null);

  if (state?.ok) { onDone(); return null; }

  const cardTasks = card ? tasks.filter((t) => t.role_card_id === card.id) : [];
  const cardDecisions = card ? decisions.filter((d) => d.role_card_id === card.id) : [];
  const cardCollabs = card ? collabs.filter((c) => c.role_card_id === card.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Main card fields */}
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {card && <input type="hidden" name="id" value={card.id} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label={t("titleEn")}>
            <input style={inputSt} name="title_en" defaultValue={card?.title_en} required />
          </Field>
          <Field label={t("titleAr")}>
            <input style={inputSt} name="title_ar" defaultValue={card?.title_ar ?? ""} dir="rtl" />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10 }}>
          <Field label={t("teamField")}>
            <select style={inputSt} name="team_id" defaultValue={card?.team_id ?? ""}>
              <option value="">{t("noneOption")}</option>
              {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </Field>
          <Field label={t("reportsToField")}>
            <select style={inputSt} name="reports_to" defaultValue={card?.reports_to ?? ""}>
              <option value="">{t("noneOption")}</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
          <Field label={t("orderField")}>
            <input style={inputSt} name="sort_order" type="number" defaultValue={card?.sort_order ?? 0} />
          </Field>
        </div>

        {/* Vacant toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--color-ink-700)" }}>
            <input
              type="checkbox"
              name="is_vacant"
              value="true"
              checked={isVacant}
              onChange={(e) => setIsVacant(e.target.checked)}
            />
            {t("vacantRole")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--color-ink-700)" }}>
            <input type="checkbox" name="is_line_lead" value="true" defaultChecked={card?.is_line_lead} />
            {t("lineLead")}
          </label>
        </div>
        {/* Hidden is_vacant value for false case */}
        {!isVacant && <input type="hidden" name="is_vacant" value="false" />}

        {/* Profile assignment — hidden when vacant */}
        {!isVacant && (
          <Field label={t("profileField")}>
            <select style={inputSt} name="profile_id" defaultValue={card?.profile_id ?? ""}>
              <option value="">{t("unassigned")}</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
        )}
        {isVacant && (
          <p style={{ fontSize: 11, color: "var(--color-ink-400)", margin: 0 }}>
            {t("vacantNoProfile")}
          </p>
        )}

        {/* Text fields */}
        {(["purpose", "scope", "indicator", "gives_up", "risk", "branch", "branch_note"] as const).map(
          (field) => (
            <Field key={field} label={field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
              <textarea
                style={{ ...textareaSt, minHeight: 54 }}
                name={field}
                defaultValue={(card as Record<string, string | null> | undefined)?.[field] ?? ""}
              />
            </Field>
          )
        )}

        <ErrMsg msg={state?.error} />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={btnPrimary} disabled={pending}>
            {pending ? t("saving") : card ? t("saveCard") : t("createCard")}
          </button>
          <button type="button" style={btnGhost} onClick={onDone}>{tc("cancel")}</button>
        </div>
      </form>

      {/* Tasks sub-section (only for existing cards) */}
      {card && (
        <SubSection title={t("tasksSection")}>
          {cardTasks.map((task) => (
            <SubRow key={task.id} label={`[${task.cadence}] ${task.body}`} onDelete={() => deleteTask(task.id, card.id)} />
          ))}
          <form action={taskAction} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="role_card_id" value={card.id} />
            <input type="hidden" name="sort_order" value={cardTasks.length} />
            <select style={{ ...inputSt, width: 110, flexShrink: 0 }} name="cadence" defaultValue="daily">
              {["daily", "weekly", "monthly", "quarterly", "founding"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input style={{ ...inputSt, flex: 1, minWidth: 140 }} name="body" placeholder={t("taskPlaceholder")} required />
            <button type="submit" style={{ ...btnPrimary, flexShrink: 0 }}>{tc("add")}</button>
            <ErrMsg msg={taskState?.error} />
          </form>
        </SubSection>
      )}

      {/* Decisions sub-section */}
      {card && (
        <SubSection title={t("decisionRights")}>
          {cardDecisions.map((d) => (
            <SubRow
              key={d.id}
              label={`[${d.kind.replace(/_/g, " ")}] ${d.body}`}
              onDelete={() => deleteDecision(d.id, card.id)}
            />
          ))}
          <form action={decAction} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="role_card_id" value={card.id} />
            <input type="hidden" name="sort_order" value={cardDecisions.length} />
            <select style={{ ...inputSt, width: 160, flexShrink: 0 }} name="kind" defaultValue="decides_alone">
              <option value="decides_alone">{t("decidesAlone")}</option>
              <option value="consults">{t("consults")}</option>
              <option value="stops_and_escalates">{t("stopsAndEscalates")}</option>
            </select>
            <input style={{ ...inputSt, flex: 1, minWidth: 140 }} name="body" placeholder={t("decisionPlaceholder")} required />
            <button type="submit" style={{ ...btnPrimary, flexShrink: 0 }}>{tc("add")}</button>
            <ErrMsg msg={decState?.error} />
          </form>
        </SubSection>
      )}

      {/* Collaborations sub-section */}
      {card && (
        <SubSection title={t("collaborationsSection")}>
          {cardCollabs.map((c) => (
            <SubRow
              key={c.id}
              label={`${c.counterpart_label ?? t("externalLabel")} — ${c.topic}`}
              onDelete={() => deleteCollaboration(c.id, card.id)}
            />
          ))}
          <form action={collabAction} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="role_card_id" value={card.id} />
            <input type="hidden" name="sort_order" value={cardCollabs.length} />
            <select style={{ ...inputSt, width: 160, flexShrink: 0 }} name="counterpart_id" defaultValue="">
              <option value="">{t("counterpartOptional")}</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <input style={{ ...inputSt, flex: 1, minWidth: 100 }} name="counterpart_label" placeholder={t("labelPlaceholder")} />
            <input style={{ ...inputSt, flex: 1, minWidth: 100 }} name="topic" placeholder={t("topicPlaceholder")} required />
            <input style={{ ...inputSt, flex: 1, minWidth: 100 }} name="exchange" placeholder={t("exchangePlaceholder")} />
            <button type="submit" style={{ ...btnPrimary, flexShrink: 0 }}>{tc("add")}</button>
            <ErrMsg msg={collabState?.error} />
          </form>
        </SubSection>
      )}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-ink-100)",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--color-ink-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function SubRow({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1, fontSize: 12, color: "var(--color-ink-700)" }}>{label}</span>
      <button
        type="button"
        onClick={onDelete}
        style={{ ...btnDanger, padding: "0 6px", height: 24, border: "none", background: "transparent" }}
        aria-label="Remove"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── profile form ───────────────────────────────────────────────────────────────

function ProfileForm({
  profile,
  teams,
  onDone,
}: {
  profile: Profile;
  teams: Team[];
  onDone: () => void;
}) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAdmin, null);
  if (state?.ok) { onDone(); return null; }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="id" value={profile.id} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t("fullNameField")}>
          <input style={inputSt} name="full_name" defaultValue={profile.full_name} required />
        </Field>
        <Field label={t("titleField")}>
          <input style={inputSt} name="title" defaultValue={profile.title ?? ""} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t("teamField")}>
          <select style={inputSt} name="team_id" defaultValue={profile.team_id ?? ""}>
            <option value="">{t("noneOption")}</option>
            {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
          </select>
        </Field>
        <Field label={t("accessRoleField")}>
          <select style={inputSt} name="role" defaultValue={profile.role}>
            <option value="team_member">{t("teamMember")}</option>
            <option value="team_leader">{t("teamLeader")}</option>
            <option value="admin">{t("adminRole")}</option>
            <option value="super_admin">{t("superAdmin")}</option>
          </select>
        </Field>
      </div>
      <ErrMsg msg={state?.error} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" style={btnPrimary} disabled={pending}>
          {pending ? t("saving") : tc("save")}
        </button>
        <button type="button" style={btnGhost} onClick={onDone}>{tc("cancel")}</button>
      </div>
    </form>
  );
}

// ── expandable section ─────────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        background: "var(--color-surface-inner)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "16px 20px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "start",
        }}
      >
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "var(--color-ink-900)" }}>
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-ink-400)",
            background: "var(--color-ink-100)",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {count}
        </span>
        {open ? <ChevronUp size={16} color="var(--color-ink-400)" /> : <ChevronDown size={16} color="var(--color-ink-400)" />}
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────────────

export default function ManageView({ teams, roleCards, tasks, decisions, collabs, profiles }: Props) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [editingTeam, setEditingTeam] = useState<string | "new" | null>(null);
  const [editingCard, setEditingCard] = useState<string | "new" | null>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);

  async function handleDeleteTeam(id: string) {
    if (!confirm(t("deleteTeamConfirm"))) return;
    await deleteTeam(id);
  }

  async function handleDeleteCard(id: string) {
    if (!confirm(t("deleteCardConfirm"))) return;
    await deleteRoleCard(id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--color-ink-900)" }}>
          {t("manageTeams")}
        </h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-nml)",
            background: "var(--color-nml-soft)",
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          {t("superAdminOnly")}
        </span>
      </div>

      {/* ── TEAMS ── */}
      <Section title={t("lines")} count={teams.length}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {teams.map((team) => {
            const displayName = locale === "ar" && team.name_ar ? team.name_ar : team.name;
            return (
              <div key={team.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-ink-100)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-ink-900)" }}>
                      {displayName}
                      {team.name_ar && locale !== "ar" && (
                        <span lang="ar" dir="rtl" style={{ marginInlineStart: 8, fontSize: 12, color: "var(--color-ink-400)", fontWeight: 400 }}>
                          {team.name_ar}
                        </span>
                      )}
                    </p>
                    {team.purpose && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-ink-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {team.purpose.slice(0, 80)}{team.purpose.length > 80 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <button type="button" style={btnGhost} onClick={() => setEditingTeam(editingTeam === team.id ? null : team.id)}>
                    <Pencil size={11} /> {tc("edit")}
                  </button>
                  <button type="button" style={btnDanger} onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
                {editingTeam === team.id && (
                  <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-ink-100)" }}>
                    <TeamForm team={team} profiles={profiles} onDone={() => setEditingTeam(null)} />
                  </div>
                )}
              </div>
            );
          })}

          {/* New team form */}
          {editingTeam === "new" ? (
            <div style={{ paddingTop: 8 }}>
              <TeamForm profiles={profiles} onDone={() => setEditingTeam(null)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTeam("new")}
              style={{ ...btnGhost, marginTop: 4, alignSelf: "flex-start" }}
            >
              <Plus size={12} /> {t("newLine")}
            </button>
          )}
        </div>
      </Section>

      {/* ── ROLE CARDS ── */}
      <Section title={t("roleCards")} count={roleCards.length}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {roleCards.map((card) => {
            const team = teams.find((tm) => tm.id === card.team_id);
            const profile = card.profile_id ? profiles.find((p) => p.id === card.profile_id) : null;
            const teamDisplayName = team
              ? (locale === "ar" && team.name_ar ? team.name_ar : team.name)
              : t("noTeamChip");
            return (
              <div key={card.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-ink-100)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-ink-900)" }}>
                        {locale === "ar" && card.title_ar ? card.title_ar : card.title_en}
                      </p>
                      {card.is_vacant && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: "var(--color-nml-soft)", color: "var(--color-nml)", textTransform: "uppercase" }}>
                          {t("vacantChip")}
                        </span>
                      )}
                      {card.is_line_lead && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: "var(--color-ink-900)", color: "#fff", textTransform: "uppercase" }}>
                          {t("leadChip")}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-ink-400)" }}>
                      {teamDisplayName} {profile ? `· ${profile.full_name}` : ""}
                    </p>
                  </div>
                  <button type="button" style={btnGhost} onClick={() => setEditingCard(editingCard === card.id ? null : card.id)}>
                    <Pencil size={11} /> {tc("edit")}
                  </button>
                  <button type="button" style={btnDanger} onClick={() => handleDeleteCard(card.id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
                {editingCard === card.id && (
                  <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-ink-100)" }}>
                    <RoleCardForm
                      card={card}
                      teams={teams}
                      profiles={profiles}
                      tasks={tasks}
                      decisions={decisions}
                      collabs={collabs}
                      onDone={() => setEditingCard(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {editingCard === "new" ? (
            <div style={{ paddingTop: 8 }}>
              <RoleCardForm
                teams={teams}
                profiles={profiles}
                tasks={tasks}
                decisions={decisions}
                collabs={collabs}
                onDone={() => setEditingCard(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingCard("new")}
              style={{ ...btnGhost, marginTop: 4, alignSelf: "flex-start" }}
            >
              <Plus size={12} /> {t("newRoleCard")}
            </button>
          )}
        </div>
      </Section>

      {/* ── PROFILES ── */}
      <Section title={t("people")} count={profiles.length}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {profiles.map((p) => {
            const team = teams.find((tm) => tm.id === p.team_id);
            const teamDisplayName = team
              ? (locale === "ar" && team.name_ar ? team.name_ar : team.name)
              : t("noTeamChip");
            return (
              <div key={p.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-ink-100)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-ink-900)" }}>
                      {p.full_name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-ink-400)" }}>
                      {p.role.replace(/_/g, " ")} · {teamDisplayName} {p.title ? `· ${p.title}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    style={btnGhost}
                    onClick={() => setEditingProfile(editingProfile === p.id ? null : p.id)}
                  >
                    <Pencil size={11} /> {tc("edit")}
                  </button>
                </div>
                {editingProfile === p.id && (
                  <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-ink-100)" }}>
                    <ProfileForm profile={p} teams={teams} onDone={() => setEditingProfile(null)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
