"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Video, RotateCcw, X } from "lucide-react";
import { Num } from "@/components/ui/Num";
import {
  cancelMeeting,
  addMinute,
  retryGoogleSync,
  type CancelMeetingState,
  type AddMinuteState,
} from "@/app/(app)/meetings/actions";

interface Attendee {
  id: string;
  user_id: string | null;
  external_email: string | null;
  full_name: string;
  response: "pending" | "accepted" | "declined" | "tentative";
  is_organizer: boolean;
  is_external: boolean;
}

interface Topic {
  id: string;
  work_item_id: string;
  title: string;
  type: string;
  status: string;
}

interface Minute {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string | null;
}

interface MeetingDetailProps {
  meeting: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    timezone: string;
    status: "scheduled" | "cancelled" | "completed";
    meet_url: string | null;
    google_event_id: string | null;
    google_error: string | null;
    organizer_id: string;
    cancelled_at: string | null;
  };
  attendees: Attendee[];
  topics: Topic[];
  minutes: Minute[];
  currentUserId: string;
}

const RESPONSE_COLOR: Record<string, string> = {
  pending: "var(--color-ink-400)",
  accepted: "var(--color-ok)",
  declined: "var(--color-crit)",
  tentative: "var(--color-warn)",
};

const TYPE_COLOR: Record<string, string> = {
  initiative: "var(--color-nml)",
  task: "#B79A99",
  subtask: "var(--color-ink-300)",
  objective: "var(--color-ink-900)",
};

const TYPE_PATH: Record<string, string> = {
  initiative: "initiatives",
  task: "tasks",
  subtask: "subtasks",
};

function formatDateTime(iso: string, timezone: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string, timezone: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

const sectionHead: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--color-ink-400)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 12,
};

export default function MeetingDetail({
  meeting,
  attendees,
  topics,
  minutes,
  currentUserId,
}: MeetingDetailProps) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const router = useRouter();
  const isOrganizer = meeting.organizer_id === currentUserId;
  const isCancelled = meeting.status === "cancelled";

  const cancelAction = cancelMeeting.bind(null, meeting.id);
  const minuteAction = addMinute.bind(null, meeting.id);

  const [cancelState, cancelFormAction, isCancelPending] = useActionState<
    CancelMeetingState,
    FormData
  >(cancelAction, null);

  const [minuteState, minuteFormAction, isMinutePending] = useActionState<
    AddMinuteState,
    FormData
  >(minuteAction, null);

  const [isRetrying, startRetry] = useTransition();

  function handleRetry() {
    startRetry(async () => {
      await retryGoogleSync(meeting.id);
      router.refresh();
    });
  }

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return tc("justNow");
    if (mins < 60) return tc("minutesAgo", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return tc("hoursAgo", { n: hrs });
    return tc("daysAgo", { n: Math.floor(hrs / 24) });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "var(--radius-input)",
    border: "1px solid var(--color-ink-200)",
    background: "var(--color-surface)",
    fontSize: 14,
    color: "var(--color-ink-900)",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "22px",
    resize: "vertical",
    boxSizing: "border-box",
  };

  const responseLabels: Record<string, string> = {
    pending: t("rsvp.pending"),
    accepted: t("rsvp.accepted"),
    declined: t("rsvp.declined"),
    tentative: t("rsvp.tentative"),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Header */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: isCancelled ? "var(--color-ink-400)" : "var(--color-ink-900)",
                  margin: 0,
                  lineHeight: 1.2,
                  textDecoration: isCancelled ? "line-through" : "none",
                }}
              >
                {meeting.title}
              </h1>
              {isCancelled && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".05em",
                    textTransform: "uppercase",
                    color: "var(--color-crit)",
                    background: "var(--color-crit-soft)",
                    borderRadius: 999,
                    padding: "3px 10px",
                  }}
                >
                  {t("status.cancelled")}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: "var(--color-ink-500)", margin: 0 }}>
              {formatDateTime(meeting.starts_at, meeting.timezone)} –{" "}
              {formatTime(meeting.ends_at, meeting.timezone)}{" "}
              <span style={{ color: "var(--color-ink-300)" }}>({meeting.timezone})</span>
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
            {meeting.meet_url && !isCancelled && (
              <a
                href={meeting.meet_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 40,
                  padding: "0 18px",
                  borderRadius: 999,
                  background: "var(--color-nml)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Video size={15} />
                {t("joinMeet")}
              </a>
            )}
            {isOrganizer && !isCancelled && (
              <form action={cancelFormAction}>
                <button
                  type="submit"
                  disabled={isCancelPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 40,
                    padding: "0 16px",
                    borderRadius: 999,
                    border: "1px solid var(--color-ink-200)",
                    background: "var(--color-surface)",
                    color: "var(--color-crit)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: isCancelPending ? "not-allowed" : "pointer",
                  }}
                >
                  <X size={14} />
                  {isCancelPending ? t("cancelling") : t("cancel")}
                </button>
              </form>
            )}
          </div>
        </div>

        {cancelState && "error" in cancelState && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--color-crit)" }}>
            {cancelState.error}
          </p>
        )}

        {/* Google error banner */}
        {meeting.google_error && !isCancelled && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: "var(--radius-row)",
              background: "var(--color-warn-soft)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ flex: 1, fontSize: 13, color: "var(--color-warn)" }}>
              {meeting.google_error === "reconnect_required"
                ? t("reconnectRequired")
                : t("syncFailed")}
            </span>
            {isOrganizer && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-warn)",
                  background: "none",
                  border: "1px solid currentColor",
                  borderRadius: 999,
                  padding: "4px 12px",
                  cursor: isRetrying ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={12} />
                {isRetrying ? t("retrying") : t("retrySync")}
              </button>
            )}
          </div>
        )}

        {meeting.description && (
          <p
            style={{
              marginTop: 16,
              fontSize: 14,
              color: "var(--color-ink-700)",
              lineHeight: "22px",
            }}
          >
            {meeting.description}
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Attendees */}
        <div>
          <p style={sectionHead}>
            {t("form.attendees")} (<Num>{attendees.length}</Num>)
          </p>
          <div
            style={{
              border: "1px solid var(--color-ink-200)",
              borderRadius: "var(--radius-input)",
              overflow: "hidden",
            }}
          >
            {attendees.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom:
                    i < attendees.length - 1
                      ? "1px solid var(--color-ink-100)"
                      : "none",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: a.is_organizer ? 600 : 400,
                    color: "var(--color-ink-900)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.full_name}
                  </span>
                  {a.is_organizer && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--color-ink-400)",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        flexShrink: 0,
                      }}
                    >
                      {t("organizer")}
                    </span>
                  )}
                  {a.is_external && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--color-ink-500)",
                        background: "var(--color-ink-100)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        flexShrink: 0,
                      }}
                    >
                      {t("external")}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: a.is_external
                      ? "var(--color-ink-300)"
                      : (RESPONSE_COLOR[a.response] ?? "var(--color-ink-400)"),
                    flexShrink: 0,
                  }}
                >
                  {a.is_external ? t("invited") : (responseLabels[a.response] ?? a.response)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div>
          <p style={sectionHead}>
            {t("topicsCount", { n: topics.length })}
          </p>
          {topics.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-ink-400)" }}>
              {t("noTopics")}
            </p>
          ) : (
            <div
              style={{
                border: "1px solid var(--color-ink-200)",
                borderRadius: "var(--radius-input)",
                overflow: "hidden",
              }}
            >
              {topics.map((topic, i) => {
                const path = TYPE_PATH[topic.type];
                const inner = (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: i < topics.length - 1 ? "1px solid var(--color-ink-100)" : "none" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "999px",
                        background: TYPE_COLOR[topic.type] ?? "var(--color-ink-300)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: path ? "var(--color-nml)" : "var(--color-ink-900)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textDecoration: path ? "underline" : "none",
                        }}
                      >
                        {topic.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-ink-400)",
                          textTransform: "capitalize",
                        }}
                      >
                        {topic.type} · {topic.status.replace(/_/g, " ")}
                      </span>
                    </span>
                  </div>
                );
                return path ? (
                  <a
                    key={topic.id}
                    href={`/${path}/${topic.work_item_id}`}
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={topic.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Minutes */}
      <div>
        <p style={sectionHead}>{t("minutes")}</p>

        {minutes.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-ink-400)", marginBottom: 16 }}>
            {t("noMinutes")}
          </p>
        )}

        {minutes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {minutes.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-row)",
                  border: "1px solid var(--color-ink-200)",
                  background: "var(--color-surface)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-ink-900)",
                    }}
                  >
                    {m.author_name ?? tc("unknown")}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink-400)",
                    }}
                  >
                    {timeAgo(m.created_at)}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "var(--color-ink-700)",
                    lineHeight: "22px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add minute form */}
        {!isCancelled && (
          <form action={minuteFormAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              name="body"
              required
              rows={4}
              placeholder={t("addNotes")}
              style={inputStyle}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-ink-900)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-ink-200)")
              }
            />
            {minuteState && "error" in minuteState && (
              <p style={{ fontSize: 13, color: "var(--color-crit)", margin: 0 }}>
                {minuteState.error}
              </p>
            )}
            <div>
              <button
                type="submit"
                disabled={isMinutePending}
                style={{
                  height: 40,
                  padding: "0 20px",
                  borderRadius: 999,
                  border: "none",
                  background: isMinutePending
                    ? "var(--color-ink-300)"
                    : "var(--color-ink-900)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isMinutePending ? "not-allowed" : "pointer",
                }}
              >
                {isMinutePending ? t("saving") : t("addNotesButton")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
