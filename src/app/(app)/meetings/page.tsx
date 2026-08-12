import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeetingsForRange, getUpcomingMeetings } from "./actions";
import CalendarWeek from "@/components/meetings/CalendarWeek";
import UpcomingMeetings from "@/components/meetings/UpcomingMeetings";

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default async function MeetingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Compute this week's Monday → Sunday
  const monday = getMondayOf(new Date());
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = isoDate(monday);
  const weekEnd = isoDate(sunday);

  // Fetch in parallel
  const [{ events: initialEvents, googleStatus: initialGoogleStatus }, { meetings: upcomingMeetings, hasMore }, profileRows_, workItemRows_] =
    await Promise.all([
      getMeetingsForRange(weekStart, weekEnd),
      getUpcomingMeetings(8),
      supabase
        .from("profiles")
        .select("id, full_name, title, role")
        .neq("id", user.id)
        .order("full_name"),
      supabase
        .from("work_items")
        .select("id, title, type, status")
        .neq("type", "objective")
        .order("title")
        .limit(200),
    ]);

  const profiles = (profileRows_.data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? "",
    title: p.title ?? null,
    role: p.role ?? "team_member",
  }));

  const workItems = (workItemRows_.data ?? []).map((w) => ({
    id: w.id,
    title: w.title,
    type: w.type,
    status: w.status,
  }));

  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
      }}
    >
      {/* Calendar — grows to fill available space */}
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <CalendarWeek
          initialEvents={initialEvents}
          initialWeekStart={weekStart}
          profiles={profiles}
          workItems={workItems}
          currentUserId={user.id}
          initialGoogleStatus={initialGoogleStatus}
        />
      </div>

      {/* Right rail — full width below 1440px, fixed 300px at 1440px+ */}
      <div
        className="basis-full min-[1440px]:basis-[300px]"
        style={{
          flexShrink: 0,
          flexGrow: 0,
          position: "sticky",
          top: 24,
        }}
      >
        <UpcomingMeetings meetings={upcomingMeetings} hasMore={hasMore} />
      </div>
    </div>
  );
}
