"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  getCalendarClient,
  ReconnectRequiredError,
} from "@/lib/google/client";

// ── types ─────────────────────────────────────────────────────────────────────

export type CreateMeetingState =
  | { id: string; calendarError?: string }
  | { error: string }
  | null;

export interface CalendarMeeting {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  meet_url: string | null;
  is_online: boolean;
  location: string | null;
  organizer_id: string;
  google_event_id: string | null;
  google_error: string | null;
  isGoogleEvent: false;
}

export interface CalendarGoogleEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  isAllDay: boolean;
  htmlLink: string | null;
  isGoogleEvent: true;
}

export type AnyCalendarEvent = CalendarMeeting | CalendarGoogleEvent;

export type CancelMeetingState = { error: string } | null;
export type AddMinuteState = { error: string } | null;

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface FreeBusyRow {
  userId: string;
  hasAccount: boolean;
  googleEmail: string | null;
  busy: FreeBusySlot[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function notifyMeeting(
  meetingId: string,
  actorId: string,
  type: "meeting_invite" | "meeting_cancelled",
  title: string,
  attendeeIds: string[]
): Promise<void> {
  const recipients = attendeeIds.filter((id) => id !== actorId);
  if (recipients.length === 0) return;
  const supabase = createServiceClient();
  await supabase.from("notifications").insert(
    recipients.map((userId) => ({
      user_id: userId,
      type,
      title,
      meeting_id: meetingId,
    }))
  );
}

// ── getMeetingsForRange ───────────────────────────────────────────────────────

export async function getMeetingsForRange(
  weekStart: string, // YYYY-MM-DD (Monday)
  weekEnd: string    // YYYY-MM-DD (Sunday)
): Promise<AnyCalendarEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const startIso = `${weekStart}T00:00:00`;
  const endIso = `${weekEnd}T23:59:59`;

  // Use v_my_meetings for "membership" check, then join with meetings for full fields
  const { data: vmRows } = await supabase
    .from("v_my_meetings")
    .select("id")
    .gte("starts_at", startIso)
    .lte("starts_at", endIso)
    .neq("status", "cancelled");

  const meetingIds = ((vmRows ?? []).map((r) => r.id).filter(Boolean)) as string[];

  let meetings: CalendarMeeting[] = [];
  if (meetingIds.length > 0) {
    const { data: rows } = await supabase
      .from("meetings")
      .select(
        "id, title, starts_at, ends_at, status, meet_url, is_online, location, organizer_id, google_event_id, google_error"
      )
      .in("id", meetingIds);

    meetings = (rows ?? []).map((r) => ({
      ...r,
      is_online: r.is_online ?? true,
      location: r.location ?? null,
      isGoogleEvent: false as const,
    }));
  }

  const ourGoogleIds = new Set(
    meetings.filter((m) => m.google_event_id).map((m) => m.google_event_id as string)
  );

  let googleEvents: CalendarGoogleEvent[] = [];
  try {
    const calendar = await getCalendarClient(user.id);
    const resp = await calendar.events.list({
      calendarId: "primary",
      timeMin: `${weekStart}T00:00:00Z`,
      timeMax: `${weekEnd}T23:59:59Z`,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 200,
    });

    googleEvents = (resp.data.items ?? [])
      .filter(
        (item) => item.status !== "cancelled" && !ourGoogleIds.has(item.id ?? "")
      )
      .map((item) => {
        const isAllDay = !item.start?.dateTime;
        return {
          id: item.id ?? `g-${Math.random()}`,
          title: item.summary ?? "(No title)",
          starts_at: item.start?.dateTime ?? `${item.start?.date}T00:00:00`,
          ends_at: item.end?.dateTime ?? `${item.end?.date}T00:00:00`,
          isAllDay,
          htmlLink: item.htmlLink ?? null,
          isGoogleEvent: true as const,
        };
      });
  } catch {
    // Not connected to Google or token error — skip
  }

  return [...meetings, ...googleEvents];
}

// ── getUpcomingMeetings ───────────────────────────────────────────────────────

export interface UpcomingMeeting {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  meet_url: string | null;
  is_online: boolean;
  location: string | null;
  attendee_count: number;
  status: string;
}

export async function getUpcomingMeetings(limit = 8): Promise<{
  meetings: UpcomingMeeting[];
  hasMore: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { meetings: [], hasMore: false };

  const now = new Date().toISOString();
  const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Use v_my_meetings (has attendee_count), then enrich from meetings for is_online/location
  const { data: vmRows } = await supabase
    .from("v_my_meetings")
    .select("id, title, starts_at, ends_at, meet_url, attendee_count, status")
    .gte("starts_at", now)
    .lte("starts_at", in14)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(limit + 1);

  const rows = vmRows ?? [];
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const ids = sliced.map((r) => r.id).filter(Boolean) as string[];

  let extraMap: Record<string, { is_online: boolean; location: string | null }> = {};
  if (ids.length > 0) {
    const { data: mRows } = await supabase
      .from("meetings")
      .select("id, is_online, location")
      .in("id", ids);
    for (const r of mRows ?? []) {
      extraMap[r.id] = { is_online: r.is_online ?? true, location: r.location ?? null };
    }
  }

  const meetings: UpcomingMeeting[] = sliced.map((r) => ({
    id: r.id ?? "",
    title: r.title ?? "(Untitled)",
    starts_at: r.starts_at ?? "",
    ends_at: r.ends_at ?? "",
    meet_url: r.meet_url ?? null,
    is_online: extraMap[r.id ?? ""]?.is_online ?? true,
    location: extraMap[r.id ?? ""]?.location ?? null,
    attendee_count: r.attendee_count ?? 0,
    status: r.status ?? "scheduled",
  }));

  return { meetings, hasMore };
}

// ── checkFreeBusy ─────────────────────────────────────────────────────────────

/**
 * Called from the new-meeting form to show an availability grid.
 * Uses the current user's Google account to query freebusy.
 * Anyone without a Google account is flagged hasAccount=false (never treated as free).
 */
export async function checkFreeBusy(
  userIds: string[],
  date: string // YYYY-MM-DD in the organizer's local timezone
): Promise<FreeBusyRow[]> {
  if (userIds.length === 0) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const serviceSupabase = createServiceClient();

  // Fetch google_emails for all invitees
  const { data: accounts } = await serviceSupabase
    .from("google_accounts")
    .select("user_id, google_email")
    .in("user_id", userIds);

  const accountMap = new Map(
    (accounts ?? []).map((a) => [a.user_id, a.google_email])
  );

  const connectedIds = userIds.filter((id) => accountMap.has(id));
  const emailToUserId = new Map<string, string>();
  for (const id of connectedIds) {
    const email = accountMap.get(id)!;
    emailToUserId.set(email, id);
  }

  // Build base result with hasAccount flags
  const results: FreeBusyRow[] = userIds.map((id) => ({
    userId: id,
    hasAccount: accountMap.has(id),
    googleEmail: accountMap.get(id) ?? null,
    busy: [],
  }));

  if (connectedIds.length === 0) return results;

  // Try to get the organizer's calendar client to call freebusy
  let calendar: Awaited<ReturnType<typeof getCalendarClient>> | null = null;
  try {
    calendar = await getCalendarClient(user.id);
  } catch {
    // Organizer not connected — can still proceed without freebusy
    return results;
  }

  try {
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const resp = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: connectedIds
          .map((id) => ({ id: accountMap.get(id)! }))
          .filter((item) => !!item.id),
      },
    });

    const calendars = resp.data.calendars ?? {};
    for (const [email, calData] of Object.entries(calendars)) {
      const uid = emailToUserId.get(email);
      if (!uid) continue;
      const row = results.find((r) => r.userId === uid);
      if (!row) continue;
      row.busy = (calData.busy ?? []).map((b) => ({
        start: b.start ?? "",
        end: b.end ?? "",
      }));
    }
  } catch (err) {
    console.error("[checkFreeBusy]", err);
    // Return what we have — partial is better than throwing
  }

  return results;
}

// ── createMeeting ─────────────────────────────────────────────────────────────

export async function createMeeting(
  _prev: CreateMeetingState,
  formData: FormData
): Promise<CreateMeetingState> {
  const t = await getTranslations("meetings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const CreateSchema = z.object({
    title: z.string().min(1, t("titleRequired")).max(200),
    description: z.string().max(2000).optional(),
    starts_at: z.string().min(1, t("startRequired")),
    ends_at: z.string().min(1, t("endRequired")),
    timezone: z.string().min(1),
    is_online: z.boolean().default(true),
    location: z.string().max(500).optional(),
  });

  const raw = {
    title: (formData.get("title") as string | null)?.trim() ?? "",
    description:
      (formData.get("description") as string | null)?.trim() || undefined,
    starts_at: (formData.get("starts_at") as string | null) ?? "",
    ends_at: (formData.get("ends_at") as string | null) ?? "",
    timezone: (formData.get("timezone") as string | null) ?? "UTC",
    is_online: (formData.get("is_online") as string) !== "false",
    location: (formData.get("location") as string | null)?.trim() || undefined,
  };

  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  const attendeeIds = (formData.getAll("attendees") as string[]).filter(Boolean);
  const topicIds = (formData.getAll("topic_id") as string[]).filter(Boolean);
  const externalEmails = (formData.getAll("external_email") as string[]).filter(Boolean);
  const externalNames = (formData.getAll("external_name") as string[]).filter(Boolean);

  // Insert meeting row
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      organizer_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      timezone: parsed.data.timezone,
      is_online: parsed.data.is_online,
      location: parsed.data.location ?? null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (meetingError || !meeting) {
    return { error: meetingError?.message ?? t("failedCreate") };
  }

  const meetingId = meeting.id;

  // Internal attendees (organizer always included)
  const allAttendeeIds = [...new Set([user.id, ...attendeeIds])];
  if (allAttendeeIds.length > 0) {
    await supabase.from("meeting_attendees").insert(
      allAttendeeIds.map((uid) => ({
        meeting_id: meetingId,
        user_id: uid,
        is_required: true,
      }))
    );
  }

  // External attendees
  if (externalEmails.length > 0) {
    await supabase.from("meeting_attendees").insert(
      externalEmails.map((email, i) => ({
        meeting_id: meetingId,
        user_id: null,
        external_email: email,
        external_name: externalNames[i] ?? email,
        is_required: true,
      }))
    );
  }

  // Topics
  if (topicIds.length > 0) {
    await supabase.from("meeting_topics").insert(
      topicIds.map((workItemId, idx) => ({
        meeting_id: meetingId,
        work_item_id: workItemId,
        added_by: user.id,
        sort_order: idx,
      }))
    );
  }

  // Push to Google Calendar
  let calendarError: string | undefined;
  try {
    const calendar = await getCalendarClient(user.id);

    // Build attendees from profiles.email — every user has one; google_accounts is only for free/busy
    const { data: profileRows } = await createServiceClient()
      .from("profiles")
      .select("email")
      .in("id", allAttendeeIds);

    const internalEmails = (profileRows ?? []).map((r) => ({ email: r.email }));
    const externalEmailObjs = externalEmails.map((e) => ({ email: e }));
    const attendeeEmails = [...internalEmails, ...externalEmailObjs];
    console.log("[createMeeting] google attendees:", attendeeEmails.map((a) => a.email));

    const isOnline = parsed.data.is_online;
    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: isOnline ? 1 : 0,
      sendUpdates: "all",
      requestBody: {
        summary: parsed.data.title,
        description: parsed.data.description ?? undefined,
        start: {
          dateTime: parsed.data.starts_at,
          timeZone: parsed.data.timezone,
        },
        end: {
          dateTime: parsed.data.ends_at,
          timeZone: parsed.data.timezone,
        },
        attendees: attendeeEmails,
        location: !isOnline && parsed.data.location ? parsed.data.location : undefined,
        ...(isOnline
          ? {
              conferenceData: {
                createRequest: {
                  requestId: meetingId,
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
            }
          : {}),
      },
    });

    const googleEventId = event.data.id ?? null;
    const meetUrl = isOnline
      ? (event.data.conferenceData?.entryPoints?.find(
          (e) => e.entryPointType === "video"
        )?.uri ?? null)
      : null;
    const googleCalendarId = event.data.organizer?.email ?? null;

    await supabase
      .from("meetings")
      .update({ google_event_id: googleEventId, meet_url: meetUrl, google_calendar_id: googleCalendarId })
      .eq("id", meetingId);
  } catch (err) {
    const msg =
      err instanceof ReconnectRequiredError
        ? "reconnect_required"
        : (err as Error).message;
    calendarError = msg;
    await supabase
      .from("meetings")
      .update({ google_error: msg })
      .eq("id", meetingId);
  }

  // In-app notifications (Google sends the email invites itself)
  try {
    await notifyMeeting(
      meetingId,
      user.id,
      "meeting_invite",
      `You've been invited: ${parsed.data.title}`,
      allAttendeeIds
    );
  } catch (err) {
    console.error("[createMeeting] notifyMeeting failed:", err);
  }

  revalidatePath("/meetings");
  return { id: meetingId, calendarError };
}

// ── retryGoogleSync ───────────────────────────────────────────────────────────

export async function retryGoogleSync(
  meetingId: string
): Promise<{ error?: string }> {
  const t = await getTranslations("meetings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, description, starts_at, ends_at, timezone, organizer_id")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: t("meetingNotFound") };
  if (meeting.organizer_id !== user.id) return { error: t("notOrganizer") };

  const { data: attendeeRows } = await supabase
    .from("meeting_attendees")
    .select("user_id, external_email")
    .eq("meeting_id", meetingId);

  const internalIds = (attendeeRows ?? []).map((r) => r.user_id).filter((id): id is string => !!id);
  const externalEmailsSync = (attendeeRows ?? []).map((r) => r.external_email).filter((e): e is string => !!e);

  try {
    const calendar = await getCalendarClient(user.id);

    const { data: profileRows2 } = await createServiceClient()
      .from("profiles")
      .select("email")
      .in("id", internalIds);

    const attendeeEmails = [
      ...(profileRows2 ?? []).map((r) => ({ email: r.email })),
      ...externalEmailsSync.map((e) => ({ email: e })),
    ];
    console.log("[retryGoogleSync] google attendees:", attendeeEmails.map((a) => a.email));

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: meeting.title,
        description: meeting.description ?? undefined,
        start: { dateTime: meeting.starts_at, timeZone: meeting.timezone },
        end: { dateTime: meeting.ends_at, timeZone: meeting.timezone },
        attendees: attendeeEmails,
        conferenceData: {
          createRequest: {
            requestId: meetingId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetUrl =
      event.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video"
      )?.uri ?? null;

    await supabase
      .from("meetings")
      .update({
        google_event_id: event.data.id ?? null,
        meet_url: meetUrl,
        google_calendar_id: event.data.organizer?.email ?? null,
        google_error: null,
      })
      .eq("id", meetingId);

    revalidatePath(`/meetings/${meetingId}`);
    return {};
  } catch (err) {
    const msg =
      err instanceof ReconnectRequiredError
        ? "reconnect_required"
        : (err as Error).message;
    await supabase
      .from("meetings")
      .update({ google_error: msg })
      .eq("id", meetingId);
    return { error: msg };
  }
}

// ── cancelMeeting ─────────────────────────────────────────────────────────────

export async function cancelMeeting(
  meetingId: string,
  _prev: CancelMeetingState,
  _formData: FormData
): Promise<CancelMeetingState> {
  const t = await getTranslations("meetings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("organizer_id, google_event_id, status, title")
    .eq("id", meetingId)
    .single();

  if (!meeting) return { error: t("meetingNotFound") };
  if (meeting.organizer_id !== user.id)
    return { error: t("onlyOrganizerCancel") };
  if (meeting.status === "cancelled") return null;

  const { error } = await supabase
    .from("meetings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", meetingId);

  if (error) return { error: error.message };

  // Delete from Google Calendar
  if (meeting.google_event_id) {
    try {
      const calendar = await getCalendarClient(user.id);
      await calendar.events.delete({
        calendarId: "primary",
        eventId: meeting.google_event_id,
        sendUpdates: "all",
      });
    } catch (err) {
      console.error("[cancelMeeting] Google delete failed:", err);
      // Non-fatal — meeting is cancelled in the DB either way
    }
  }

  // In-app notifications for attendees
  const { data: attendeeRows } = await supabase
    .from("meeting_attendees")
    .select("user_id")
    .eq("meeting_id", meetingId);

  const attendeeIds = (attendeeRows ?? []).map((r) => r.user_id).filter((id): id is string => !!id);
  try {
    await notifyMeeting(
      meetingId,
      user.id,
      "meeting_cancelled",
      `Meeting cancelled: ${meeting.title}`,
      attendeeIds
    );
  } catch (err) {
    console.error("[cancelMeeting] notifyMeeting failed:", err);
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/meetings");
  return null;
}

// ── addMinute ─────────────────────────────────────────────────────────────────

export async function addMinute(
  meetingId: string,
  _prev: AddMinuteState,
  formData: FormData
): Promise<AddMinuteState> {
  const t = await getTranslations("meetings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") };

  const MinuteSchema = z.object({
    body: z.string().min(1, t("notesEmpty")).max(10000),
  });

  const parsed = MinuteSchema.safeParse({
    body: (formData.get("body") as string | null)?.trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validationFailed") };
  }

  // Any attendee (or organizer) can add minutes
  const { data: isMember } = await supabase
    .from("meeting_attendees")
    .select("user_id")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("organizer_id")
    .eq("id", meetingId)
    .single();

  if (!isMember && meeting?.organizer_id !== user.id) {
    return { error: t("onlyAttendeesMinutes") };
  }

  const { error } = await supabase.from("meeting_minutes").insert({
    meeting_id: meetingId,
    author_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { error: error.message };

  revalidatePath(`/meetings/${meetingId}`);
  return null;
}
