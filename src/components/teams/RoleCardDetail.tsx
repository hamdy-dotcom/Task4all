import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { pickLocalised } from "@/lib/localise";

// ── shared style helpers ───────────────────────────────────────────────────────

const DECISION_KIND_STYLE: Record<string, { bg: string; color: string }> = {
  decides_alone: { bg: "var(--color-ink-100)", color: "var(--color-ink-700)" },
  consults: { bg: "var(--color-warn-soft, #FBF1DF)", color: "var(--color-warn, #C08A2E)" },
  stops_and_escalates: { bg: "var(--color-crit-soft, #FBE4E5)", color: "var(--color-crit, #A50E14)" },
};

const CADENCE_ORDER = ["daily", "weekly", "monthly", "quarterly", "founding"] as const;

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "0 0 8px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--color-ink-400)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {children}
    </h3>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface-inner)",
        borderRadius: 16,
        padding: "16px 20px",
      }}
    >
      {children}
    </div>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 14, color: "var(--color-ink-700)", lineHeight: 1.7 }}>
      {children}
    </p>
  );
}

// ── types ──────────────────────────────────────────────────────────────────────

export interface RoleCardData {
  id: string;
  title_en: string;
  title_ar: string | null;
  team_id: string | null;
  is_line_lead: boolean;
  is_vacant: boolean;
  profile_id: string | null;
  reports_to: string | null;
  purpose: string | null;
  purpose_ar: string | null;
  scope: string | null;
  scope_ar: string | null;
  indicator: string | null;
  indicator_ar: string | null;
  gives_up: string | null;
  gives_up_ar: string | null;
  risk: string | null;
  risk_ar: string | null;
  branch: string | null;
  branch_ar: string | null;
  branch_note: string | null;
  branch_note_ar: string | null;
}

export interface ProfileEntry {
  id: string;
  full_name: string;
  title: string | null;
}

export interface TeamEntry {
  id: string;
  name: string;
  name_ar: string | null;
}

export interface TaskEntry {
  id: string;
  body: string;
  body_ar: string | null;
  cadence: string;
  sort_order: number;
}

export interface DecisionEntry {
  id: string;
  body: string;
  body_ar: string | null;
  kind: string;
  sort_order: number;
}

export interface CollabEntry {
  id: string;
  counterpart_id: string | null;
  counterpart_label: string | null;
  counterpart_label_ar: string | null;
  topic: string;
  topic_ar: string | null;
  exchange: string | null;
  exchange_ar: string | null;
  sort_order: number;
}

interface Props {
  card: RoleCardData;
  tasks: TaskEntry[];
  decisions: DecisionEntry[];
  collabs: CollabEntry[];
  profileMap: Map<string, ProfileEntry>;
  profileToCard: Map<string, string>;
  team: TeamEntry | null;
}

// ── component ──────────────────────────────────────────────────────────────────

export async function RoleCardDetail({ card, tasks, decisions, collabs, profileMap, profileToCard, team }: Props) {
  const [rc, locale] = await Promise.all([
    getTranslations("roleCard"),
    getLocale(),
  ]);

  const teamName = locale === "ar" ? (team?.name_ar ?? team?.name) : team?.name;

  const CADENCE_LABEL: Record<string, string> = {
    daily: rc("cadenceDaily"),
    weekly: rc("cadenceWeekly"),
    monthly: rc("cadenceMonthly"),
    quarterly: rc("cadenceQuarterly"),
    founding: rc("cadenceFounding"),
  };

  const DECISION_KIND_LABEL: Record<string, string> = {
    decides_alone: rc("decidesAlone"),
    consults: rc("consults"),
    stops_and_escalates: rc("stopsAndEscalates"),
  };

  const profile = card.profile_id ? profileMap.get(card.profile_id) : null;
  const reportsToProfile = card.reports_to ? profileMap.get(card.reports_to) : null;

  // Group tasks by cadence
  const tasksByCadence: Record<string, TaskEntry[]> = {};
  for (const t of tasks) {
    if (!tasksByCadence[t.cadence]) tasksByCadence[t.cadence] = [];
    tasksByCadence[t.cadence]!.push(t);
  }

  // Group decisions by kind
  const decisionsByKind: Record<string, DecisionEntry[]> = {};
  for (const d of decisions) {
    if (!decisionsByKind[d.kind]) decisionsByKind[d.kind] = [];
    decisionsByKind[d.kind]!.push(d);
  }

  const decisionKinds = Object.keys(DECISION_KIND_LABEL);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header card */}
      <div
        style={{
          background: "var(--color-surface-inner)",
          borderRadius: 24,
          padding: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: card.is_vacant ? "var(--color-ink-100)" : "var(--color-ink-900)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: card.is_vacant ? "var(--color-ink-300)" : "#fff",
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
            border: card.is_vacant ? "2px dashed var(--color-nml)" : "none",
          }}
        >
          {card.is_vacant
            ? "?"
            : profile
              ? profile.full_name.split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("")
              : "—"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: card.is_vacant ? "var(--color-ink-400)" : "var(--color-ink-900)",
              }}
            >
              {card.is_vacant ? card.title_en : (profile?.full_name ?? card.title_en)}
            </h2>
            {card.is_vacant && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "var(--color-nml-soft)",
                  color: "var(--color-nml)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {rc("vacant")}
              </span>
            )}
          </div>

          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--color-ink-600)" }}>
            {card.title_en}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {teamName && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "var(--color-ink-100)",
                  color: "var(--color-ink-600)",
                }}
              >
                {teamName}
              </span>
            )}
            {reportsToProfile && (
              <span style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
                {rc("reportsTo")}{" "}
                <span style={{ color: "var(--color-ink-700)", fontWeight: 600 }}>
                  {reportsToProfile.full_name}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Purpose */}
      {card.purpose && (
        <SectionCard>
          <SectionHead>{rc("purpose")}</SectionHead>
          <BodyText>{pickLocalised(card as Record<string, unknown>, "purpose", locale)}</BodyText>
        </SectionCard>
      )}

      {/* Scope */}
      {card.scope && (
        <SectionCard>
          <SectionHead>{rc("scope")}</SectionHead>
          <BodyText>{pickLocalised(card as Record<string, unknown>, "scope", locale)}</BodyText>
        </SectionCard>
      )}

      {/* Tasks by cadence */}
      {CADENCE_ORDER.filter((c) => (tasksByCadence[c]?.length ?? 0) > 0).length > 0 && (
        <SectionCard>
          <SectionHead>{rc("tasks")}</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {CADENCE_ORDER.filter((c) => (tasksByCadence[c]?.length ?? 0) > 0).map((cadence) => (
              <div key={cadence}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-ink-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {CADENCE_LABEL[cadence]}
                </p>
                <ul
                  style={{
                    margin: 0,
                    padding: "0 0 0 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  {tasksByCadence[cadence]!.map((t) => (
                    <li key={t.id} style={{ fontSize: 13, color: "var(--color-ink-700)", lineHeight: 1.6 }}>
                      {pickLocalised(t as Record<string, unknown>, "body", locale)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Decision rights */}
      {Object.keys(decisionsByKind).length > 0 && (
        <div>
          <SectionHead>{rc("decisionRights")}</SectionHead>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {decisionKinds.map((kind) => {
              const items = decisionsByKind[kind] ?? [];
              const s = DECISION_KIND_STYLE[kind]!;
              return (
                <div key={kind} style={{ background: s.bg, borderRadius: 16, padding: "14px 16px" }}>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: s.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {DECISION_KIND_LABEL[kind]}
                  </p>
                  {items.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-300)" }}>—</p>
                  ) : (
                    <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {items.map((d) => (
                        <li key={d.id} style={{ fontSize: 12, color: s.color, lineHeight: 1.5 }}>
                          {pickLocalised(d as Record<string, unknown>, "body", locale)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicator */}
      {card.indicator && (
        <SectionCard>
          <SectionHead>{rc("indicator")}</SectionHead>
          <BodyText>{pickLocalised(card as Record<string, unknown>, "indicator", locale)}</BodyText>
        </SectionCard>
      )}

      {/* Gives up */}
      {card.gives_up && (
        <SectionCard>
          <SectionHead>{rc("givesUp")}</SectionHead>
          <BodyText>{pickLocalised(card as Record<string, unknown>, "gives_up", locale)}</BodyText>
        </SectionCard>
      )}

      {/* Risk */}
      {card.risk && (
        <div
          style={{
            background: "var(--color-warn-soft, #FBF1DF)",
            borderRadius: 16,
            padding: "16px 20px",
            borderInlineStart: "3px solid var(--color-warn, #C08A2E)",
          }}
        >
          <SectionHead>{rc("namedRisk")}</SectionHead>
          <BodyText>{pickLocalised(card as Record<string, unknown>, "risk", locale)}</BodyText>
        </div>
      )}

      {/* Path to North Star */}
      {card.branch && (
        <SectionCard>
          <SectionHead>{rc("pathToNorthStar")}</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-700)" }}>
              <span style={{ fontWeight: 600 }}>{rc("branch")}: </span>
              {pickLocalised(card as Record<string, unknown>, "branch", locale)}
            </p>
            {card.branch_note && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-600)", lineHeight: 1.6 }}>
                {pickLocalised(card as Record<string, unknown>, "branch_note", locale)}
              </p>
            )}
            <Link
              href="/north-star"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-nml)",
                textDecoration: "none",
              }}
            >
              {rc("viewNorthStar")} →
            </Link>
          </div>
        </SectionCard>
      )}

      {/* Collaborations */}
      {collabs.length > 0 && (
        <SectionCard>
          <SectionHead>{rc("collaborations")}</SectionHead>
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--color-ink-200)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1.5fr",
                padding: "8px 14px",
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-ink-200)",
              }}
            >
              {([rc("counterpart"), rc("topic"), rc("exchange")] as const).map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-ink-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            {collabs.map((c, i) => {
              const counterpartProfile = c.counterpart_id ? profileMap.get(c.counterpart_id) : null;
              const counterpartCardId = c.counterpart_id ? profileToCard.get(c.counterpart_id) : null;
              const fallbackLabel = c.counterpart_label
                ? pickLocalised(c as Record<string, unknown>, "counterpart_label", locale)
                : "—";
              const counterpartName = counterpartProfile?.full_name ?? fallbackLabel;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 1.5fr",
                    padding: "10px 14px",
                    borderBottom: i < collabs.length - 1 ? "1px solid var(--color-ink-100)" : "none",
                    alignItems: "start",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--color-ink-700)", fontWeight: 500 }}>
                    {counterpartCardId ? (
                      <Link href={`/teams/${counterpartCardId}`} style={{ color: "var(--color-nml)", textDecoration: "none" }}>
                        {counterpartName}
                      </Link>
                    ) : (
                      counterpartName
                    )}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--color-ink-700)" }}>
                    {pickLocalised(c as Record<string, unknown>, "topic", locale)}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--color-ink-600)" }}>
                    {c.exchange ? pickLocalised(c as Record<string, unknown>, "exchange", locale) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
