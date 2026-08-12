import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Num } from "@/components/ui/Num";

// ── helpers ────────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ── person card ────────────────────────────────────────────────────────────────

function PersonCard({
  roleCardId,
  name,
  titleEn,
  isVacant,
  isLeader,
  vacantLabel,
  lineLeadLabel,
}: {
  roleCardId: string;
  name: string;
  titleEn: string;
  isVacant: boolean;
  isLeader: boolean;
  vacantLabel: string;
  lineLeadLabel: string;
}) {
  return (
    <Link
      href={`/teams/${roleCardId}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: isLeader ? "18px 16px" : "14px 12px",
        borderRadius: 20,
        background: isVacant
          ? "transparent"
          : isLeader
            ? "var(--color-surface)"
            : "var(--color-surface-inner)",
        border: isVacant
          ? "2px dashed var(--color-nml)"
          : isLeader
            ? "1px solid var(--color-ink-200)"
            : "1px solid var(--color-ink-100)",
        minWidth: isLeader ? 148 : 120,
        maxWidth: isLeader ? 180 : 150,
        cursor: "pointer",
        textDecoration: "none",
        textAlign: "center",
        transition: "box-shadow 120ms, opacity 120ms",
        flexShrink: 0,
      }}
      className="person-card-link"
    >
      {/* Avatar */}
      <div
        style={{
          width: isLeader ? 48 : 40,
          height: isLeader ? 48 : 40,
          borderRadius: "50%",
          background: isVacant
            ? "var(--color-ink-100)"
            : "var(--color-ink-900)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isVacant ? "var(--color-ink-300)" : "#fff",
          fontSize: isLeader ? 15 : 13,
          fontWeight: 700,
          flexShrink: 0,
          border: isVacant ? "2px dashed var(--color-ink-300)" : "none",
        }}
      >
        {isVacant ? "?" : initials(name)}
      </div>

      {/* Name + title */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: isLeader ? 13 : 12,
            fontWeight: 600,
            color: isVacant ? "var(--color-ink-400)" : "var(--color-ink-900)",
            lineHeight: 1.3,
          }}
        >
          {isVacant ? titleEn : name}
        </p>
        {!isVacant && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 11,
              color: "var(--color-ink-400)",
              lineHeight: 1.3,
            }}
          >
            {titleEn}
          </p>
        )}
      </div>

      {/* Badges */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {isVacant && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 999,
              background: "var(--color-nml-soft)",
              color: "var(--color-nml)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {vacantLabel}
          </span>
        )}
        {isLeader && !isVacant && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 999,
              background: "var(--color-ink-900)",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {lineLeadLabel}
          </span>
        )}
      </div>
    </Link>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

export default async function TeamsPage() {
  const [t, locale] = await Promise.all([
    getTranslations("teams"),
    getLocale(),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: currentProfileResult }, { data: teams }, { data: roleCards }, { data: profiles }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("teams")
        .select("id, name, name_ar, purpose, purpose_ar, leader_id, sort_order")
        .order("sort_order"),
      supabase
        .from("role_cards")
        .select(
          "id, title_en, title_ar, team_id, is_line_lead, is_vacant, sort_order, profile_id, reports_to"
        )
        .order("sort_order"),
      supabase
        .from("profiles")
        .select("id, full_name, title, team_id, role"),
    ]);

  const currentProfile = currentProfileResult;

  const teamsArr = teams ?? [];
  const cardsArr = roleCards ?? [];
  const profilesArr = profiles ?? [];

  const profileMap = new Map(profilesArr.map((p) => [p.id, p]));

  // CEO card: the one role card with team_id = null
  const ceoroleCard = cardsArr.find((c) => !c.team_id) ?? null;
  const ceoProfile = ceoroleCard?.profile_id
    ? profileMap.get(ceoroleCard.profile_id) ?? null
    : null;

  // Group non-CEO role cards by team_id
  const cardsByTeam = new Map<string, typeof cardsArr>();
  for (const card of cardsArr) {
    if (!card.team_id) continue;
    if (!cardsByTeam.has(card.team_id)) cardsByTeam.set(card.team_id, []);
    cardsByTeam.get(card.team_id)!.push(card);
  }

  const rulesObj = t.raw("reportingRulesList") as Record<string, string>;
  const reportingRules = Object.keys(rulesObj)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => rulesObj[k]);
  const vacantLabel = t("vacantChip");
  const lineLeadLabel = t("leadChip");

  return (
    <>
      <style>{`
        .person-card-link:hover {
          box-shadow: 0 0 0 2px var(--color-nml);
          opacity: 0.9;
        }
        @media (max-width: 767px) {
          .member-row { flex-direction: column !important; }
          .member-row .person-card-link { max-width: 100% !important; min-width: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-ink-900)",
              }}
            >
              {t("organisation")}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--color-ink-400)",
              }}
            >
              {t("peopleAcrossLines", {
                people: profilesArr.length,
                lines: teamsArr.length,
              })}
            </p>
          </div>
          {currentProfile?.role === "super_admin" && (
            <Link
              href="/teams/manage"
              style={{
                height: 36,
                padding: "0 18px",
                borderRadius: 999,
                border: "1px solid var(--color-ink-200)",
                background: "var(--color-surface)",
                color: "var(--color-ink-700)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t("manage")}
            </Link>
          )}
        </div>

        {/* CEO */}
        {ceoroleCard && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-ink-400)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {t("ceoLabel")}
            </p>
            <PersonCard
              roleCardId={ceoroleCard.id}
              name={ceoProfile?.full_name ?? ceoroleCard.title_en}
              titleEn={
                locale === "ar" && ceoroleCard.title_ar
                  ? ceoroleCard.title_ar
                  : ceoroleCard.title_en
              }
              isVacant={ceoroleCard.is_vacant || !ceoProfile}
              isLeader={false}
              vacantLabel={vacantLabel}
              lineLeadLabel={lineLeadLabel}
            />
            {/* Connector line */}
            <div
              style={{
                width: 1,
                height: 24,
                background: "var(--color-ink-200)",
              }}
            />
          </div>
        )}

        {/* Six lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {teamsArr.map((team) => {
            const teamCards = cardsByTeam.get(team.id) ?? [];
            const leaderCard = teamCards.find((c) => c.is_line_lead) ?? null;
            const memberCards = teamCards.filter((c) => !c.is_line_lead);
            const vacantCount = teamCards.filter((c) => c.is_vacant).length;
            const memberCount = teamCards.length;

            const leaderProfile = leaderCard?.profile_id
              ? profileMap.get(leaderCard.profile_id) ?? null
              : null;

            const displayName =
              locale === "ar" && team.name_ar ? team.name_ar : team.name;
            const displayPurpose =
              locale === "ar" && team.purpose_ar
                ? team.purpose_ar
                : team.purpose;

            return (
              <div
                key={team.id}
                style={{
                  background: "var(--color-surface-inner)",
                  borderRadius: "var(--radius-card, 24px)",
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {/* Line header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--color-ink-900)",
                      }}
                    >
                      {displayName}
                    </h2>
                    {displayPurpose && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 13,
                          color: "var(--color-ink-600)",
                          lineHeight: 1.6,
                          maxWidth: 640,
                        }}
                      >
                        {displayPurpose}
                      </p>
                    )}
                    {/* Leader label line */}
                    {leaderProfile && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: 12,
                          color: "var(--color-ink-500)",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{t("leadLabel")} </span>
                        {leaderProfile.full_name}
                        {leaderCard?.title_en && (
                          <span style={{ color: "var(--color-ink-300)" }}>
                            {" "}
                            ·{" "}
                            {locale === "ar" && leaderCard.title_ar
                              ? leaderCard.title_ar
                              : leaderCard.title_en}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Chips */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
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
                      {memberCount === 1
                        ? t("memberCount", { n: memberCount })
                        : t("memberCountPlural", { n: memberCount })}
                    </span>
                    {vacantCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "var(--color-nml-soft)",
                          color: "var(--color-nml)",
                        }}
                      >
                        {t("vacantCount", { n: vacantCount })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Leader card */}
                {leaderCard && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--color-ink-400)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {t("lineLeaderLabel")}
                    </span>
                    <PersonCard
                      roleCardId={leaderCard.id}
                      name={leaderProfile?.full_name ?? leaderCard.title_en}
                      titleEn={
                        locale === "ar" && leaderCard.title_ar
                          ? leaderCard.title_ar
                          : leaderCard.title_en
                      }
                      isVacant={leaderCard.is_vacant || !leaderProfile}
                      isLeader
                      vacantLabel={vacantLabel}
                      lineLeadLabel={lineLeadLabel}
                    />
                  </div>
                )}

                {/* Member row */}
                {memberCards.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                      className="member-row"
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {memberCards.map((card) => {
                        const profile =
                          !card.is_vacant && card.profile_id
                            ? profileMap.get(card.profile_id) ?? null
                            : null;
                        return (
                          <PersonCard
                            key={card.id}
                            roleCardId={card.id}
                            name={profile?.full_name ?? card.title_en}
                            titleEn={
                              locale === "ar" && card.title_ar
                                ? card.title_ar
                                : card.title_en
                            }
                            isVacant={card.is_vacant || !profile}
                            isLeader={false}
                            vacantLabel={vacantLabel}
                            lineLeadLabel={lineLeadLabel}
                          />
                        );
                      })}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "var(--color-ink-300)",
                        fontStyle: "italic",
                      }}
                    >
                      {t("sameLevelNote")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reporting rules */}
        <div
          style={{
            background: "var(--color-surface-inner)",
            borderRadius: "var(--radius-card, 24px)",
            padding: 24,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-ink-900)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {t("reportingRules")}
          </h3>
          <ol
            style={{
              margin: 0,
              padding: "0 0 0 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {reportingRules.map((rule, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-600)",
                  lineHeight: 1.6,
                }}
              >
                {rule}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
