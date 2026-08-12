import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { RoleCardDetail } from "@/components/teams/RoleCardDetail";
import { Num } from "@/components/ui/Num";
import { PasswordForm } from "./PasswordForm";
import { updateName } from "./actions";

// ── section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--color-surface-inner)",
        borderRadius: 20,
        padding: 24,
      }}
    >
      <h2
        style={{
          margin: "0 0 20px",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--color-ink-900)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 4px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--color-ink-400)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </p>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <p style={{ margin: 0, fontSize: 14, color: "var(--color-ink-700)", lineHeight: 1.5 }}>
        {value ?? <span style={{ color: "var(--color-ink-300)" }}>—</span>}
      </p>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [t, locale] = await Promise.all([
    getTranslations("profile"),
    getLocale(),
  ]);

  // Parallel data fetch
  const [
    { data: profile },
    { data: roleCard },
    { data: googleAccount },
    { data: assignedRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, title, team_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("role_cards")
      .select("id, title_en, title_ar, team_id, is_line_lead, is_vacant, profile_id, reports_to, purpose, purpose_ar, scope, scope_ar, indicator, indicator_ar, gives_up, gives_up_ar, risk, risk_ar, branch, branch_ar, branch_note, branch_note_ar")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("google_accounts")
      .select("google_email, connected_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("work_item_assignees")
      .select("work_item_id, work_items!inner(type, status, progress)")
      .eq("user_id", user.id),
  ]);

  if (!profile) redirect("/login");

  // Fetch role card related data if a card exists
  let tasks: { id: string; body: string; body_ar: string | null; cadence: string; sort_order: number }[] = [];
  let decisions: { id: string; body: string; body_ar: string | null; kind: string; sort_order: number }[] = [];
  let collabs: { id: string; counterpart_id: string | null; counterpart_label: string | null; counterpart_label_ar: string | null; topic: string; topic_ar: string | null; exchange: string | null; exchange_ar: string | null; sort_order: number }[] = [];
  let cardTeam: { id: string; name: string; name_ar: string | null } | null = null;
  let profileMap = new Map<string, { id: string; full_name: string; title: string | null }>();
  let profileToCard = new Map<string, string>();

  if (roleCard) {
    const [
      { data: taskRows },
      { data: decisionRows },
      { data: collabRows },
      { data: allCards },
    ] = await Promise.all([
      supabase.from("role_tasks").select("id, body, body_ar, cadence, sort_order").eq("role_card_id", roleCard.id).order("sort_order"),
      supabase.from("role_decisions").select("id, body, body_ar, kind, sort_order").eq("role_card_id", roleCard.id).order("sort_order"),
      supabase.from("role_collaborations").select("id, counterpart_id, counterpart_label, counterpart_label_ar, topic, topic_ar, exchange, exchange_ar, sort_order").eq("role_card_id", roleCard.id).order("sort_order"),
      supabase.from("role_cards").select("id, profile_id"),
    ]);

    tasks = taskRows ?? [];
    decisions = decisionRows ?? [];
    collabs = collabRows ?? [];

    const profileIds = new Set<string>();
    if (roleCard.reports_to) profileIds.add(roleCard.reports_to);
    for (const c of collabRows ?? []) {
      if (c.counterpart_id) profileIds.add(c.counterpart_id);
    }

    const [{ data: pRows }, { data: teamRow }] = await Promise.all([
      profileIds.size > 0
        ? supabase.from("profiles").select("id, full_name, title").in("id", [...profileIds])
        : Promise.resolve({ data: [] }),
      roleCard.team_id
        ? supabase.from("teams").select("id, name, name_ar").eq("id", roleCard.team_id).single()
        : Promise.resolve({ data: null }),
    ]);

    profileMap = new Map((pRows ?? []).map((p) => [p.id, p]));
    profileToCard = new Map(
      (allCards ?? []).filter((c) => c.profile_id).map((c) => [c.profile_id!, c.id])
    );
    cardTeam = teamRow ?? null;
  }

  // Work counts
  type AssignedItem = { type: string; status: string; progress: number | null };
  const assigned = (assignedRows ?? []).map((r) => r.work_items as unknown as AssignedItem);
  const initiatives = assigned.filter((i) => i.type === "initiative");
  const tasks_wi = assigned.filter((i) => i.type === "task");
  const subtasks = assigned.filter((i) => i.type === "subtask");
  const avgCompletion = assigned.length
    ? Math.round(assigned.reduce((s, i) => s + (i.progress ?? 0), 0) / assigned.length)
    : null;

  // Team for identity section
  const { data: profileTeam } = profile.team_id
    ? await supabase.from("teams").select("id, name, name_ar").eq("id", profile.team_id).single()
    : { data: null };

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  type Role = "super_admin" | "admin" | "team_leader" | "team_member";
  const role = profile.role as Role;
  const teamName = profileTeam
    ? (locale === "ar" && (profileTeam as { name_ar?: string | null }).name_ar)
      ? (profileTeam as { name_ar: string }).name_ar
      : profileTeam.name
    : null;

  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "var(--color-ink-900)" }}>
          {t("title")}
        </h1>
      </div>

      {/* ── 1. Identity ──────────────────────────────────────────────────────── */}
      <Section title={t("identity")}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--color-ink-900)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Name edit + email */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <form
              action={updateName}
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
            >
              <input
                name="full_name"
                defaultValue={profile.full_name}
                required
                minLength={2}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid var(--color-ink-200)",
                  background: "var(--color-surface)",
                  padding: "0 12px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--color-ink-900)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  height: 40,
                  borderRadius: 999,
                  border: "none",
                  padding: "0 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--color-ink-100)",
                  color: "var(--color-ink-700)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t("saveName")}
              </button>
            </form>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)" }}>
              {profile.email}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 20,
          }}
        >
          {/* Role */}
          <div>
            <Label>{t("accessRole")}</Label>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--color-ink-100)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-ink-700)",
                marginBottom: 6,
              }}
            >
              {t(`roles.${role}` as `roles.${Role}`)}
            </span>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-500, var(--color-ink-600))", lineHeight: 1.5 }}>
              {t(`roleDesc.${role}` as `roleDesc.${Role}`)}
            </p>
          </div>

          {/* Title */}
          <ReadOnlyField label={t("jobTitle")} value={profile.title} />

          {/* Team */}
          <div>
            <Label>{t("team")}</Label>
            {teamName ? (
              <Link
                href="/teams"
                style={{
                  fontSize: 14,
                  color: "var(--color-nml)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {teamName} →
              </Link>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-ink-300)" }}>{t("noTeam")}</p>
            )}
          </div>
        </div>

        <p
          style={{
            margin: "20px 0 0",
            fontSize: 12,
            color: "var(--color-ink-400)",
            lineHeight: 1.5,
          }}
        >
          {t("adminNote")}{" "}
          <Link href="/teams/manage" style={{ color: "var(--color-ink-600)", textDecoration: "underline" }}>
            {t("teamStructureEditor")}
          </Link>
          .
        </p>
      </Section>

      {/* ── 2. My role card ──────────────────────────────────────────────────── */}
      <Section title={t("myRoleCard")}>
        {roleCard ? (
          <RoleCardDetail
            card={roleCard}
            tasks={tasks ?? []}
            decisions={decisions ?? []}
            collabs={collabs ?? []}
            profileMap={profileMap}
            profileToCard={profileToCard}
            team={cardTeam}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "32px 0",
              textAlign: "center",
            }}
          >
            <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
              <rect x={6} y={10} width={28} height={22} rx={5} stroke="var(--color-ink-200)" strokeWidth={2} />
              <path d="M13 18h14M13 23h8" stroke="var(--color-ink-200)" strokeWidth={2} strokeLinecap="round" />
            </svg>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-ink-600)" }}>
              {t("noRoleCard")}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)", maxWidth: 280 }}>
              {t("noRoleCardDesc")}
            </p>
          </div>
        )}
      </Section>

      {/* ── 3. My work ───────────────────────────────────────────────────────── */}
      <Section title={t("myWork")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: avgCompletion !== null ? 16 : 0,
          }}
        >
          {[
            { label: t("initiatives"), count: initiatives.length, href: "/initiatives" },
            { label: t("tasks"), count: tasks_wi.length, href: "/tasks" },
            { label: t("subtasks"), count: subtasks.length, href: "/subtasks" },
          ].map(({ label, count, href }) => (
            <Link key={label} href={href} style={{ textDecoration: "none" }}>
              <div
                className="card-hover"
                style={{
                  background: "var(--color-surface)",
                  borderRadius: 16,
                  padding: "16px 20px",
                }}
              >
                <p
                  className="tnum"
                  style={{
                    margin: "0 0 4px",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--color-ink-900)",
                    lineHeight: 1,
                  }}
                >
                  <Num>{count}</Num>
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-600)" }}>{label}</p>
              </div>
            </Link>
          ))}

          {avgCompletion !== null && (
            <div
              style={{
                background: "var(--color-nml)",
                borderRadius: 16,
                padding: "16px 20px",
              }}
            >
              {/* bdi dir="ltr": keeps numeral and % together, never reversed */}
              <p
                className="tnum"
                style={{
                  margin: "0 0 4px",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                <bdi dir="ltr"><Num>{avgCompletion}</Num>%</bdi>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.8)" }}>
                {t("avgCompletion")}
              </p>
            </div>
          )}
        </div>

        {assigned.length === 0 && (
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-ink-400)" }}>
            {t("noWorkItems")}
          </p>
        )}
      </Section>

      {/* ── 4. Google Calendar ───────────────────────────────────────────────── */}
      <Section title={t("googleCalendar")}>
        {googleAccount ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--color-ok)" }}>
                {t("googleConnected")}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-600)" }}>
                {googleAccount.google_email}
              </p>
            </div>
            <a
              href="/api/google/connect"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                borderRadius: 999,
                border: "1px solid var(--color-ink-200)",
                padding: "0 18px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink-700)",
                textDecoration: "none",
                background: "var(--color-surface)",
              }}
            >
              {t("googleReconnect")}
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-ink-600)", maxWidth: 360 }}>
              {t("googleConnectDesc")}
            </p>
            <a
              href="/api/google/connect"
              className="btn-nml"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                borderRadius: 999,
                border: "none",
                padding: "0 18px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
              }}
            >
              {t("googleConnect")}
            </a>
          </div>
        )}
      </Section>

      {/* ── 5. Change password ───────────────────────────────────────────────── */}
      <Section title={t("changePassword")}>
        <PasswordForm />
      </Section>

    </div>
  );
}
