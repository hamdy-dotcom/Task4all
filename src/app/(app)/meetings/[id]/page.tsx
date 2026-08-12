import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import MeetingDetail from "@/components/meetings/MeetingDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MeetingPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const t = await getTranslations("meetings");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: meeting }, { data: attendeeRows }, { data: topicRows }, { data: minuteRows }] =
    await Promise.all([
      supabase
        .from("meetings")
        .select(
          "id, title, description, starts_at, ends_at, timezone, status, meet_url, google_event_id, google_error, organizer_id, cancelled_at"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("meeting_attendees")
        .select("user_id, external_email, external_name, response, is_required, profiles!user_id(full_name)")
        .eq("meeting_id", id),
      supabase
        .from("meeting_topics")
        .select("id, work_item_id, sort_order, work_items!work_item_id(title, type, status)")
        .eq("meeting_id", id)
        .order("sort_order"),
      supabase
        .from("meeting_minutes")
        .select("id, body, created_at, author_id, profiles!author_id(full_name)")
        .eq("meeting_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (!meeting) notFound();

  // Verify user is organizer or attendee
  const isOrganizer = meeting.organizer_id === user.id;
  const isAttendee = (attendeeRows ?? []).some((a) => a.user_id === user.id);
  if (!isOrganizer && !isAttendee) notFound();

  const attendees = (attendeeRows ?? []).map((a) => {
    const p = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    const isExternal = !a.user_id;
    return {
      id: a.user_id ?? a.external_email ?? "",
      user_id: a.user_id,
      external_email: a.external_email ?? null,
      full_name: isExternal
        ? (a.external_name ?? a.external_email ?? "External")
        : ((p as { full_name?: string } | null)?.full_name ?? "Unknown"),
      response: a.response as "pending" | "accepted" | "declined" | "tentative",
      is_organizer: a.user_id === meeting.organizer_id,
      is_external: isExternal,
    };
  });

  const topics = (topicRows ?? []).map((t) => {
    const w = Array.isArray(t.work_items) ? t.work_items[0] : t.work_items;
    return {
      id: t.id,
      work_item_id: t.work_item_id,
      title: (w as { title?: string } | null)?.title ?? "Unknown",
      type: (w as { type?: string } | null)?.type ?? "task",
      status: (w as { status?: string } | null)?.status ?? "active",
    };
  });

  const minutes = (minuteRows ?? []).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      author_id: m.author_id,
      author_name: (p as { full_name?: string } | null)?.full_name ?? null,
    };
  });

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="flex items-center" style={{ marginBottom: 24, gap: 8 }}>
        <Link
          href="/meetings"
          className="flex items-center"
          style={{
            fontSize: 14,
            color: "var(--color-ink-400)",
            textDecoration: "none",
            gap: 4,
          }}
        >
          <ChevronLeft size={16} />
          {t("title")}
        </Link>
        <span style={{ fontSize: 14, color: "var(--color-ink-300)" }}>/</span>
        <span
          className="truncate"
          style={{
            fontSize: 14,
            color: "var(--color-ink-900)",
            fontWeight: 500,
            maxWidth: 320,
          }}
        >
          {meeting.title}
        </span>
      </div>

      <MeetingDetail
        meeting={meeting}
        attendees={attendees}
        topics={topics}
        minutes={minutes}
        currentUserId={user.id}
      />
    </div>
  );
}
