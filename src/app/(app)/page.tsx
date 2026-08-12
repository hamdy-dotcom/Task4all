import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { getUpcomingMeetings } from "@/app/(app)/meetings/actions";
import UpcomingMeetings from "@/components/meetings/UpcomingMeetings";
import { StatTiles, type TileData } from "@/components/dashboard/StatTiles";
import { CapsuleChart, type ChartRow } from "@/components/dashboard/CapsuleChart";
import { HealthSignals, type HealthSignalData } from "@/components/dashboard/HealthSignals";
import { ApprovalLatency, type LatencyData } from "@/components/dashboard/ApprovalLatency";
import { NeedsYou, type NeedsYouItem } from "@/components/dashboard/NeedsYou";
import { DashCard } from "@/components/dashboard/DashCard";

// ── helpers ────────────────────────────────────────────────────────────────────

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ── page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [supabase, t, tc, locale] = await Promise.all([
    createClient(),
    getTranslations("dashboard"),
    getTranslations("common"),
    getLocale(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, team_id, title")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role as "super_admin" | "admin" | "team_leader" | "team_member";
  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 86400000).toISOString();

  // ── fetch scoped stats ─────────────────────────────────────────────────────

  let tiles: TileData[] = [];
  let chartRows: ChartRow[] = [];
  let chartEmptyHint: { message: string; href: string } | undefined;
  let healthData: HealthSignalData | null = null;
  let latencyData: LatencyData | null = null;
  let needsYouItems: NeedsYouItem[] = [];
  let needsYouTitle = t("needsYou");
  let needsYouEmpty = "";

  // ── SUPER_ADMIN / ADMIN ────────────────────────────────────────────────────
  if (role === "super_admin" || role === "admin") {
    const [
      { count: pendingNow },
      { count: pendingPrev },
      { data: activeRows },
      { count: overdueNow },
      { count: overduePrev },
      { data: progressRows },
      { data: healthRow },
      { data: latencyRow },
      { data: queueRows },
    ] = await Promise.all([
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("approval_status", "pending").lt("created_at", thirtyDaysAgo),
      supabase.from("work_items").select("id, progress").eq("type", "initiative").eq("approval_status", "approved").not("status", "in", '("done","cancelled")'),
      supabase.from("work_items").select("*", { count: "exact", head: true }).not("status", "in", '("done","cancelled")').lt("due_date", now),
      supabase.from("work_items").select("*", { count: "exact", head: true }).not("status", "in", '("done","cancelled")').lt("due_date", thirtyDaysAgo).gt("due_date", sixtyDaysAgo),
      supabase.from("v_team_progress").select("team_name, total, done_count, pct"),
      supabase.from("v_health_signals").select("*").single(),
      supabase.from("v_approval_latency").select("*").single(),
      role === "super_admin"
        ? supabase.from("v_pending_approvals").select("id, title, type, status, approval_status, due_date, created_at").order("created_at", { ascending: true }).limit(10)
        : supabase.from("v_pending_approvals").select("id, title, type, status, approval_status, due_date, created_at").eq("approval_status", "pending").order("created_at", { ascending: true }).limit(10),
    ]);

    const activeCount = activeRows?.length ?? 0;
    const avgCompletion = activeRows?.length
      ? Math.round(activeRows.reduce((s, r) => s + (r.progress ?? 0), 0) / activeRows.length)
      : 0;

    tiles = [
      {
        label: role === "super_admin" ? t("awaitingApproval") : t("waitingOnApproval"),
        value: pendingNow ?? 0,
        highlighted: true,
        delta: pendingPrev !== null && pendingNow !== null
          ? { value: Math.abs((pendingNow ?? 0) - pendingPrev), direction: (pendingNow ?? 0) >= pendingPrev ? "up" : "down", sentiment: (pendingNow ?? 0) > pendingPrev ? "alert" : "ok" }
          : undefined,
      },
      {
        label: t("activeInitiatives"),
        value: activeCount,
        highlighted: false,
      },
      {
        label: t("overdue"),
        value: overdueNow ?? 0,
        highlighted: false,
        delta: overduePrev !== null && overdueNow !== null
          ? { value: Math.abs((overdueNow ?? 0) - (overduePrev ?? 0)), direction: (overdueNow ?? 0) >= (overduePrev ?? 0) ? "up" : "down", sentiment: (overdueNow ?? 0) > (overduePrev ?? 0) ? "alert" : "ok" }
          : undefined,
      },
      {
        label: t("avgCompletion"),
        value: avgCompletion,
        unit: "%",
        highlighted: false,
      },
    ];

    chartRows = (progressRows ?? [])
      .filter((r) => Number(r.total ?? 0) > 0)
      .map((r) => ({
        label: r.team_name ?? tc("unknown"),
        total: Number(r.total ?? 0),
        done: Number(r.done_count ?? 0),
        pct: Number(r.pct ?? 0),
      }));

    if (chartRows.length === 0 && activeCount > 0) {
      chartEmptyHint = {
        message: t("progressChartEmpty"),
        href: "/initiatives",
      };
    }

    if (healthRow) {
      healthData = {
        overloadedPeople:     Number(healthRow.overloaded_people ?? 0),
        staleExperiments:     Number(healthRow.stale_experiments ?? 0),
        unassignedInitiatives: Number(healthRow.unassigned_initiatives ?? 0),
        recentlyCancelled:    Number(healthRow.recently_cancelled ?? 0),
      };
    }

    if (latencyRow) {
      latencyData = {
        medianDays:    Number(latencyRow.median_days ?? 0),
        pendingCount:  Number(latencyRow.pending_count ?? 0),
        approvedCount: Number(latencyRow.approved_count ?? 0),
        targetDays: 2,
      };
    }

    needsYouTitle = role === "super_admin" ? t("approvalQueue") : t("waitingApproval");
    needsYouEmpty = role === "super_admin"
      ? t("noApprovalQueue")
      : t("noApprovalPending");

    needsYouItems = (queueRows ?? []).map((r) => ({
      id: r.id ?? "",
      title: r.title ?? tc("untitled"),
      type: r.type ?? "initiative",
      status: r.status ?? "not_started",
      approvalStatus: r.approval_status ?? "pending",
      dueDate: r.due_date,
      daysWaiting: daysSince(r.created_at ?? now),
      href: `/initiatives/${r.id}`,
    }));
  }

  // ── TEAM_LEADER ────────────────────────────────────────────────────────────
  else if (role === "team_leader") {
    const teamId = profile.team_id;

    const [
      { count: pendingNow },
      { data: lineItems },
      { count: overdueNow },
      { data: memberRows },
      { data: blockedRows },
    ] = await Promise.all([
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("approval_status", "pending").eq("team_id", teamId ?? ""),
      supabase.from("work_items").select("id, progress, status").eq("team_id", teamId ?? "").eq("approval_status", "approved").not("status", "in", '("cancelled")'),
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("team_id", teamId ?? "").not("status", "in", '("done","cancelled")').lt("due_date", now),
      supabase.from("v_member_progress").select("full_name, total, done_count, pct"),
      supabase.from("work_items").select("id, title, type, status, due_date").eq("team_id", teamId ?? "").in("status", ["blocked", "not_started", "in_progress", "pending"]).lt("due_date", now).order("due_date", { ascending: true }).limit(10),
    ]);

    const activeCount = lineItems?.filter((i) => !["done", "cancelled"].includes(i.status)).length ?? 0;
    const avgCompletion = lineItems?.length
      ? Math.round(lineItems.reduce((s, r) => s + (r.progress ?? 0), 0) / lineItems.length)
      : 0;

    tiles = [
      { label: t("myLineAwaiting"), value: pendingNow ?? 0, highlighted: true },
      { label: t("lineInitiatives"), value: activeCount, highlighted: false },
      { label: t("lineOverdue"), value: overdueNow ?? 0, highlighted: false },
      { label: t("lineCompletion"), value: avgCompletion, unit: "%", highlighted: false },
    ];

    chartRows = (memberRows ?? [])
      .filter((r) => Number(r.total ?? 0) > 0)
      .map((r) => ({
        label: r.full_name ?? tc("unknown"),
        total: Number(r.total ?? 0),
        done: Number(r.done_count ?? 0),
        pct: Number(r.pct ?? 0),
      }));

    if (chartRows.length === 0 && activeCount > 0) {
      chartEmptyHint = {
        message: t("progressChartEmptyPerson"),
        href: "/initiatives",
      };
    }

    // Health signals for team_leader — scoped counts
    if (teamId) {
      const [{ data: overloadedRows }, { count: staleCt }, { count: unassignedCt }] = await Promise.all([
        supabase
          .from("work_item_assignees")
          .select("user_id, work_items!inner(type, approval_status, status, team_id)")
          .eq("work_items.team_id", teamId)
          .eq("work_items.type", "initiative")
          .eq("work_items.approval_status", "approved")
          .not("work_items.status", "in", '("done","cancelled")'),
        supabase.from("work_items").select("*", { count: "exact", head: true }).eq("team_id", teamId).eq("classification", "experiment").not("status", "in", '("done","cancelled")').lt("start_date", new Date(Date.now() - 90 * 86400000).toISOString()),
        supabase.from("work_items").select("*", { count: "exact", head: true }).eq("team_id", teamId).eq("type", "initiative").eq("approval_status", "approved").not("status", "in", '("done","cancelled")'),
      ]);

      // Count profiles with more than 2 assignments
      const assigneeMap = new Map<string, number>();
      for (const row of (overloadedRows ?? [])) {
        const uid = row.user_id;
        assigneeMap.set(uid, (assigneeMap.get(uid) ?? 0) + 1);
      }
      const overloaded = [...assigneeMap.values()].filter((n) => n > 2).length;

      healthData = {
        overloadedPeople:      overloaded,
        staleExperiments:      Number(staleCt ?? 0),
        unassignedInitiatives: Number(unassignedCt ?? 0),
        recentlyCancelled:     0, // skip for team_leader scope
      };
    }

    // Approval latency for team_leader's line
    if (teamId) {
      const { data: lRows } = await supabase
        .from("work_items")
        .select("created_at, approved_at, approval_status")
        .eq("team_id", teamId)
        .eq("approval_status", "approved")
        .not("approved_at", "is", null);

      const { count: pendingLine } = await supabase
        .from("work_items")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("approval_status", "pending");

      const days = (lRows ?? []).map((r) =>
        (new Date(r.approved_at!).getTime() - new Date(r.created_at).getTime()) / 86400000
      ).sort((a, b) => a - b);

      const median = days.length ? days[Math.floor(days.length / 2)] : 0;
      latencyData = {
        medianDays:    Math.round(median * 10) / 10,
        pendingCount:  Number(pendingLine ?? 0),
        approvedCount: days.length,
        targetDays: 2,
      };
    }

    needsYouTitle = t("blockedOverdue");
    needsYouEmpty = t("noBlockedOverdue");
    needsYouItems = (blockedRows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      dueDate: r.due_date,
      href: `/initiatives/${r.id}`,
    }));
  }

  // ── TEAM_MEMBER ────────────────────────────────────────────────────────────
  else {
    const [
      { data: assignedRows },
      { data: overdueRows },
      { data: myItemsRows },
    ] = await Promise.all([
      supabase
        .from("work_item_assignees")
        .select("work_item_id, work_items!inner(id, title, type, status, approval_status, progress, due_date, parent_id)")
        .eq("user_id", user.id),
      supabase
        .from("work_item_assignees")
        .select("work_item_id, work_items!inner(id, title, type, status, due_date)")
        .eq("user_id", user.id)
        .not("work_items.status", "in", '("done","cancelled")')
        .lt("work_items.due_date", now),
      supabase
        .from("work_item_assignees")
        .select("work_item_id, work_items!inner(id, title, type, status, due_date, progress)")
        .eq("user_id", user.id)
        .not("work_items.status", "in", '("done","cancelled")')
        .order("work_items(due_date)", { ascending: true })
        .limit(10),
    ]);

    type AssignedItem = {
      id: string; title: string; type: string; status: string;
      approval_status: string; progress: number; due_date: string | null; parent_id: string | null;
    };
    type MyItem = { id: string; title: string; type: string; status: string; due_date: string | null; progress: number; };

    const assigned: AssignedItem[] = (assignedRows ?? []).map((r) => r.work_items as unknown as AssignedItem);
    const openItems = assigned.filter((i) => !["done", "cancelled"].includes(i.status));
    const overdueCount = (overdueRows ?? []).length;
    const avgCompletion = assigned.length
      ? Math.round(assigned.reduce((s, r) => s + (r.progress ?? 0), 0) / assigned.length)
      : 0;

    tiles = [
      { label: t("assignedToMe"), value: assigned.length, highlighted: true },
      { label: t("myOpenItems"), value: openItems.length, highlighted: false },
      { label: t("myOverdue"), value: overdueCount, highlighted: false },
      { label: t("myCompletion"), value: avgCompletion, unit: "%", highlighted: false },
    ];

    // Progress chart: parent initiatives of assigned work
    const parentIds = [...new Set(assigned.map((i) => i.parent_id).filter(Boolean))] as string[];
    if (parentIds.length > 0) {
      const { data: parentRows } = await supabase
        .from("work_items")
        .select("id, title, progress, status")
        .in("id", parentIds)
        .order("progress", { ascending: false });

      chartRows = (parentRows ?? []).map((r) => {
        const childrenUnderParent = assigned.filter((a) => a.parent_id === r.id);
        const done = childrenUnderParent.filter((a) => a.status === "done").length;
        return {
          label: r.title,
          total: childrenUnderParent.length,
          done,
          pct: childrenUnderParent.length ? Math.round((done / childrenUnderParent.length) * 100) : 0,
        };
      });
    }

    needsYouTitle = t("myWork");
    needsYouEmpty = t("noMyWork");
    needsYouItems = (myItemsRows ?? []).map((r) => {
      const item = r.work_items as unknown as MyItem;
      return {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        dueDate: item.due_date,
        href: `/tasks/${item.id}`,
      };
    });
  }

  // ── meetings ───────────────────────────────────────────────────────────────
  const { meetings: myMeetings, hasMore: myHasMore } = await getUpcomingMeetings(6);

  let allMeetings: typeof myMeetings = [];
  let allHasMore = false;
  if (role === "super_admin" || role === "admin") {
    // Fetch org-wide upcoming meetings from the meetings table directly
    const { data: orgRows } = await supabase
      .from("meetings")
      .select("id, title, starts_at, ends_at, meet_url, is_online, location, status, meeting_attendees(id)")
      .gte("starts_at", new Date().toISOString())
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(7);

    allMeetings = (orgRows ?? []).slice(0, 6).map((r) => ({
      id: r.id,
      title: r.title ?? tc("untitled"),
      starts_at: r.starts_at ?? "",
      ends_at: r.ends_at ?? "",
      meet_url: r.meet_url ?? null,
      is_online: r.is_online ?? true,
      location: r.location ?? null,
      attendee_count: (r.meeting_attendees as unknown as { id: string }[] | null)?.length ?? 0,
      status: r.status ?? "scheduled",
    }));
    allHasMore = (orgRows?.length ?? 0) > 6;
  }

  const isAdminPlus = role === "super_admin" || role === "admin";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: "30px", color: "var(--color-ink-900)" }}>
          {t("title")}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--color-ink-400)" }}>
          {role === "super_admin" || role === "admin"
            ? t("scopeOrgWide")
            : role === "team_leader"
              ? t("scopeMyLine")
              : t("scopeMyWork")}
          {" · "}
          {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stat tiles */}
      <DashCard title={t("stats")}>
        <StatTiles tiles={tiles} />
      </DashCard>

      {/* Two-column layout for chart + health/latency */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

        {/* Progress chart */}
        <div
          style={{
            flex: "2 1 340px",
            background: "var(--color-surface-sunken)",
            borderRadius: "var(--radius-card)",
            padding: 24,
          }}
        >
          <CapsuleChart
            title={
              role === "team_member"
                ? t("myWorkByParent")
                : role === "team_leader"
                  ? t("progressByPerson")
                  : t("progressByLine")
            }
            rows={chartRows}
            emptyHint={chartEmptyHint}
          />
        </div>

        {/* Health + Latency (admin+ and team_leader) */}
        {(isAdminPlus || role === "team_leader") && (
          <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 16 }}>
            {healthData && (
              <DashCard title={t("orgHealth")}>
                <HealthSignals data={healthData} />
              </DashCard>
            )}
            {latencyData && (
              <DashCard title={t("approvalLatency")}>
                <ApprovalLatency data={latencyData} />
              </DashCard>
            )}
          </div>
        )}
      </div>

      {/* Needs You */}
      <DashCard title={needsYouTitle} count={needsYouItems.length}>
        <NeedsYou
          title={needsYouTitle}
          items={needsYouItems}
          emptyMessage={needsYouEmpty}
        />
      </DashCard>

      {/* Meetings */}
      {isAdminPlus ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <DashCard title={t("allMeetings")} count={allMeetings.length}>
              <UpcomingMeetings meetings={allMeetings} hasMore={allHasMore} />
            </DashCard>
          </div>
          <div style={{ flex: "1 1 300px" }}>
            <DashCard title={t("myMeetings")} count={myMeetings.length}>
              <UpcomingMeetings meetings={myMeetings} hasMore={myHasMore} />
            </DashCard>
          </div>
        </div>
      ) : (
        <DashCard title={t("myMeetings")} count={myMeetings.length}>
          <UpcomingMeetings meetings={myMeetings} hasMore={myHasMore} />
        </DashCard>
      )}
    </div>
  );
}
