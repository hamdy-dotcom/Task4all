"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Num } from "@/components/ui/Num";
import type { UpcomingMeeting } from "@/app/(app)/meetings/actions";

interface Props {
  meetings: UpcomingMeeting[];
  hasMore: boolean;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isJoinable(meeting: UpcomingMeeting): boolean {
  if (!meeting.meet_url) return false;
  const now = Date.now();
  const start = new Date(meeting.starts_at).getTime();
  const end = new Date(meeting.ends_at).getTime();
  const FIFTEEN_MIN = 15 * 60 * 1000;
  return now >= start - FIFTEEN_MIN && now <= end;
}

export default function UpcomingMeetings({ meetings, hasMore }: Props) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const today = new Date();

  function formatDateTime(iso: string): { dateLine: string; timeLine: string } {
    if (!iso) return { dateLine: "—", timeLine: "" };
    const d = new Date(iso);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const isTomorrow =
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate();

    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTHS = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    let dateLine: string;
    if (isToday) dateLine = tc("today");
    else if (isTomorrow) dateLine = tc("tomorrow");
    else dateLine = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const timeLine = `${h12}:${pad2(m)} ${ampm}`;

    return { dateLine, timeLine };
  }

  return (
    <div
      style={{
        background: "var(--color-surface-sunken)",
        borderRadius: "var(--radius-card)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-ink-900)",
            letterSpacing: "0.01em",
          }}
        >
          {t("upcomingHeader")}
        </span>
        {meetings.length > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--color-ink-100)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink-600)",
            }}
          >
            <Num>{meetings.length}</Num>
          </span>
        )}
      </div>

      {/* Empty state */}
      {meetings.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: "32px 0",
          }}
        >
          <svg
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-ink-300)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={3} y={4} width={18} height={18} rx={2} />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-600)",
              margin: 0,
            }}
          >
            {t("noUpcoming")}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-400)",
              margin: 0,
              textAlign: "center",
            }}
          >
            {t("nothingScheduled")}
          </p>
        </div>
      )}

      {/* Meeting rows */}
      {meetings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {meetings.map((m) => {
            const { dateLine, timeLine } = formatDateTime(m.starts_at);
            const mDate = new Date(m.starts_at);
            const isToday =
              mDate.getFullYear() === today.getFullYear() &&
              mDate.getMonth() === today.getMonth() &&
              mDate.getDate() === today.getDate();
            const joinable = isJoinable(m);

            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                style={{
                  display: "flex",
                  gap: 0,
                  textDecoration: "none",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  background: "var(--color-surface-inner)",
                  transition: "opacity 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {/* Today bar */}
                <div
                  style={{
                    width: 3,
                    background: isToday
                      ? "var(--color-nml)"
                      : "transparent",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {/* Meta line */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink-400)",
                      }}
                    >
                      {dateLine} · {timeLine}
                    </span>
                  </div>

                  {/* Title */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-ink-900)",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {m.title}
                  </p>

                  {/* Footer row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Attendee count */}
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink-500)",
                      }}
                    >
                      {m.attendee_count === 1
                        ? tc("attendee", { n: m.attendee_count })
                        : tc("attendees", { n: m.attendee_count })}
                    </span>

                    {/* Format badge */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 99,
                        background: m.is_online
                          ? "color-mix(in srgb, var(--color-nml) 10%, transparent)"
                          : "var(--color-ink-100)",
                        color: m.is_online
                          ? "var(--color-nml)"
                          : "var(--color-ink-600)",
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                      }}
                    >
                      {m.is_online ? t("online") : t("inPerson")}
                    </span>

                    {/* Join button */}
                    {joinable && (
                      <a
                        href={m.meet_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          marginInlineStart: "auto",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: "var(--color-nml)",
                          color: "#fff",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("join")}
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* View all link */}
      {hasMore && (
        <Link
          href="/meetings"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-ink-500)",
            textAlign: "center",
            textDecoration: "none",
            paddingTop: 4,
          }}
        >
          {t("viewAll")}
        </Link>
      )}
    </div>
  );
}
