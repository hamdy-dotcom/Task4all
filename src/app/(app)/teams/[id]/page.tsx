import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { RoleCardDetail } from "@/components/teams/RoleCardDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoleCardPage({ params }: Props) {
  const { id } = await params;

  const [t, locale] = await Promise.all([
    getTranslations("teams"),
    getLocale(),
  ]);

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: card },
    { data: tasks },
    { data: decisions },
    { data: collabs },
    { data: allCards },
  ] = await Promise.all([
    supabase
      .from("role_cards")
      .select("id, title_en, title_ar, team_id, is_line_lead, is_vacant, profile_id, reports_to, purpose, purpose_ar, scope, scope_ar, indicator, indicator_ar, gives_up, gives_up_ar, risk, risk_ar, branch, branch_ar, branch_note, branch_note_ar")
      .eq("id", id)
      .single(),
    supabase.from("role_tasks").select("id, body, body_ar, cadence, sort_order").eq("role_card_id", id).order("sort_order"),
    supabase.from("role_decisions").select("id, body, body_ar, kind, sort_order").eq("role_card_id", id).order("sort_order"),
    supabase.from("role_collaborations").select("id, counterpart_id, counterpart_label, counterpart_label_ar, topic, topic_ar, exchange, exchange_ar, sort_order").eq("role_card_id", id).order("sort_order"),
    supabase.from("role_cards").select("id, profile_id"),
  ]);

  if (!card) notFound();

  // Collect all profile IDs
  const profileIds = new Set<string>();
  if (card.profile_id) profileIds.add(card.profile_id);
  if (card.reports_to) profileIds.add(card.reports_to);
  for (const c of collabs ?? []) {
    if (c.counterpart_id) profileIds.add(c.counterpart_id);
  }

  const [{ data: profileRows }, { data: teamRow }] = await Promise.all([
    profileIds.size > 0
      ? supabase.from("profiles").select("id, full_name, title").in("id", [...profileIds])
      : Promise.resolve({ data: [] }),
    card.team_id
      ? supabase.from("teams").select("id, name, name_ar").eq("id", card.team_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));
  const profileToCard = new Map(
    (allCards ?? []).filter((c) => c.profile_id).map((c) => [c.profile_id!, c.id])
  );

  const cardDisplayTitle =
    locale === "ar" && card.title_ar ? card.title_ar : card.title_en;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        <Link
          href="/teams"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            fontSize: 13,
            color: "var(--color-ink-400)",
            textDecoration: "none",
          }}
        >
          <ChevronLeft size={15} />
          {t("title")}
        </Link>
        <span style={{ fontSize: 13, color: "var(--color-ink-200)" }}>/</span>
        <span style={{ fontSize: 13, color: "var(--color-ink-700)", fontWeight: 500 }}>
          {cardDisplayTitle}
        </span>
      </div>

      <RoleCardDetail
        card={card}
        tasks={tasks ?? []}
        decisions={decisions ?? []}
        collabs={collabs ?? []}
        profileMap={profileMap}
        profileToCard={profileToCard}
        team={teamRow ?? null}
      />
    </div>
  );
}
