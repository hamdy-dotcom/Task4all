"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import {
  getMeetingsForRange,
  type AnyCalendarEvent,
} from "@/app/(app)/meetings/actions";
import BookingModal from "./BookingModal";

// ── constants ──────────────────────────────────────────────────────────────────

const GUTTER_W = 64;
const START_H = 7;
const END_H = 20;
const HOUR_PX = 64;
const MIN_PX = HOUR_PX / 60;
const GRID_H = (END_H - START_H) * HOUR_PX;
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── types ──────────────────────────────────────────────────────────────────────

export interface CalendarProfile {
  id: string;
  full_name: string;
  title: string | null;
  role: string;
}

export interface CalendarWorkItem {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface Props {
  initialEvents: AnyCalendarEvent[];
  initialWeekStart: string; // YYYY-MM-DD (Monday)
  profiles: CalendarProfile[];
  workItems: CalendarWorkItem[];
  currentUserId: string;
}

interface LayoutEvent {
  event: AnyCalendarEvent;
  lane: number;
  laneCount: number;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function getMondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} ${MONTH_ABBR[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()} ${MONTH_ABBR[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_ABBR[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

function minuteOffsetOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - START_H * 60;
}

function durationMins(startsAt: string, endsAt: string): number {
  return (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000;
}

function nextRoundedTime(): string {
  const d = new Date();
  const snapped = Math.ceil((d.getMinutes() + 1) / 30) * 30;
  const h = d.getHours() + Math.floor(snapped / 60);
  const m = snapped % 60;
  const clampedH = Math.min(h, 23);
  return `${pad2(clampedH)}:${pad2(m)}`;
}

function layoutDayEvents(events: AnyCalendarEvent[]): LayoutEvent[] {
  if (!events.length) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const laneEnds: number[] = [];
  const assigned: Array<{ event: AnyCalendarEvent; lane: number }> = [];

  for (const event of sorted) {
    const startMs = new Date(event.starts_at).getTime();
    const endMs = new Date(event.ends_at).getTime();
    let lane = laneEnds.findIndex((endTime) => endTime <= startMs);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endMs;
    assigned.push({ event, lane });
  }

  return assigned.map(({ event, lane }) => {
    const startMs = new Date(event.starts_at).getTime();
    const endMs = new Date(event.ends_at).getTime();
    const overlapping = sorted.filter((other) => {
      const oStart = new Date(other.starts_at).getTime();
      const oEnd = new Date(other.ends_at).getTime();
      return oStart < endMs && oEnd > startMs;
    });
    const maxLane = overlapping.reduce((max, other) => {
      const a = assigned.find((x) => x.event === other);
      return a ? Math.max(max, a.lane) : max;
    }, 0);
    return { event, lane, laneCount: maxLane + 1 };
  });
}

function eventsForDay(events: AnyCalendarEvent[], dayStr: string): AnyCalendarEvent[] {
  return events.filter((e) => {
    if (e.isGoogleEvent && e.isAllDay) return false;
    return localDateStr(e.starts_at) === dayStr;
  });
}

function allDayEventsForDay(events: AnyCalendarEvent[], dayStr: string): AnyCalendarEvent[] {
  return events.filter((e) => e.isGoogleEvent && e.isAllDay && e.starts_at.startsWith(dayStr));
}

// ── sub-components ─────────────────────────────────────────────────────────────

function EventBlock({
  layoutEvent,
  onClick,
}: {
  layoutEvent: LayoutEvent;
  onClick: () => void;
}) {
  const { event, lane, laneCount } = layoutEvent;
  const isNml = !event.isGoogleEvent;

  const minsOffset = minuteOffsetOf(event.starts_at);
  if (minsOffset >= (END_H - START_H) * 60) return null;
  const clampedOffset = Math.max(0, minsOffset);
  const rawDuration = durationMins(event.starts_at, event.ends_at);
  const maxDuration = (END_H - START_H) * 60 - clampedOffset;
  const height = Math.max(Math.min(rawDuration, maxDuration) * MIN_PX, 20);

  const widthPct = (1 / laneCount) * 100;
  const leftPct = (lane / laneCount) * 100;

  return (
    <div
      data-event
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onClick(); } }}
      style={{
        position: "absolute",
        top: clampedOffset * MIN_PX,
        height,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 3px)`,
        background: isNml ? "var(--color-nml)" : "var(--color-surface-inner)",
        borderLeft: isNml ? "none" : "2.5px solid var(--color-ink-300)",
        borderRadius: 6,
        padding: "3px 7px",
        overflow: "hidden",
        cursor: "pointer",
        zIndex: 10,
        boxSizing: "border-box",
        boxShadow: isNml ? "0 1px 4px rgba(237,28,36,.25)" : "0 1px 2px rgba(32,31,30,.06)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isNml ? "#fff" : "var(--color-ink-700)",
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {event.title}
      </div>
      {height >= 38 && (
        <div
          style={{
            fontSize: 10,
            color: isNml ? "rgba(255,255,255,0.78)" : "var(--color-ink-400)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
        </div>
      )}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function CalendarWeek({
  initialEvents,
  initialWeekStart,
  profiles,
  workItems,
  currentUserId,
}: Props) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [events, setEvents] = useState<AnyCalendarEvent[]>(initialEvents);
  const [isPending, startTransition] = useTransition();
  const [narrow, setNarrow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeDay, setActiveDay] = useState(0); // index 0–6 into the week
  const [now, setNow] = useState<Date | null>(null);
  const [modal, setModal] = useState<{ date: string; time: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Responsive detection
  useEffect(() => {
    const check = () => {
      setNarrow(window.innerWidth < 1100);
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Current time indicator
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to current time on first render
  useEffect(() => {
    if (!scrollRef.current || !now || hasScrolled.current) return;
    hasScrolled.current = true;
    const minsFromStart = now.getHours() * 60 + now.getMinutes() - START_H * 60;
    if (minsFromStart > 0) {
      scrollRef.current.scrollTop = Math.max(0, minsFromStart * MIN_PX - 120);
    }
  }, [now]);

  // Navigation helpers
  const weekStartDate = new Date(weekStart + "T00:00:00");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const todayStr = isoDate(new Date());

  const navigate = useCallback(
    (dir: -1 | 1) => {
      const next = addDays(weekStartDate, dir * 7);
      const nextStr = isoDate(next);
      const nextEnd = isoDate(addDays(next, 6));
      setWeekStart(nextStr);
      startTransition(async () => {
        const data = await getMeetingsForRange(nextStr, nextEnd);
        setEvents(data);
      });
    },
    [weekStartDate]
  );

  const goToday = useCallback(() => {
    const monday = getMondayOf(new Date());
    const mondayStr = isoDate(monday);
    if (mondayStr === weekStart) return;
    const sundayStr = isoDate(addDays(monday, 6));
    setWeekStart(mondayStr);
    // Also snap active day to today if narrow
    const todayDow = new Date().getDay();
    const todayIndex = todayDow === 0 ? 6 : todayDow - 1; // Mon=0 .. Sun=6
    setActiveDay(todayIndex);
    startTransition(async () => {
      const data = await getMeetingsForRange(mondayStr, sundayStr);
      setEvents(data);
    });
  }, [weekStart]);

  const refresh = useCallback(() => {
    const endStr = isoDate(addDays(weekStartDate, 6));
    startTransition(async () => {
      const data = await getMeetingsForRange(weekStart, endStr);
      setEvents(data);
    });
  }, [weekStart, weekStartDate]);

  function handleSlotClick(dayStr: string, y: number) {
    const rawMins = y / MIN_PX;
    const snapped = Math.round(rawMins / 30) * 30;
    const totalMins = START_H * 60 + Math.max(0, Math.min(snapped, (END_H - START_H - 1) * 60));
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    setModal({ date: dayStr, time: `${pad2(h)}:${pad2(m)}` });
  }

  function openScheduleNow() {
    setModal({ date: todayStr, time: nextRoundedTime() });
  }

  const visibleDays = narrow ? [days[activeDay]] : days;

  return (
    // dir="ltr" keeps the calendar grid always left-to-right regardless of locale
    <div
      dir="ltr"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 72px)",
        overflow: "hidden",
        background: "var(--color-surface)",
      }}
    >
      {/* ── Controls bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          flexShrink: 0,
          borderBottom: "1px solid var(--color-ink-200)",
          flexWrap: "wrap",
        }}
      >
        {/* Prev / Next */}
        <div style={{ display: "flex", gap: 2 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("previousWeek")}
            style={navBtnStyle}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label={t("nextWeek")}
            style={navBtnStyle}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        <button type="button" onClick={goToday} style={todayBtnStyle}>
          {t("calendar.today")}
        </button>

        {/* Range label */}
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 600,
            color: isPending ? "var(--color-ink-400)" : "var(--color-ink-900)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {formatWeekRange(weekStartDate)}
        </span>

        {/* Schedule button */}
        <button type="button" onClick={openScheduleNow} style={scheduleBtnStyle}>
          <CalendarPlus size={14} strokeWidth={2} />
          {t("schedule")}
        </button>
      </div>

      {/* ── Day chips (narrow mode) ── */}
      {narrow && (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "8px 16px",
            overflowX: "auto",
            flexShrink: 0,
            borderBottom: "1px solid var(--color-ink-100)",
          }}
        >
          {days.map((day, i) => {
            const isActive = i === activeDay;
            const isToday = isoDate(day) === todayStr;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDay(i)}
                style={{
                  flexShrink: 0,
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: isActive
                    ? "var(--color-nml)"
                    : isToday
                    ? "var(--color-nml-soft)"
                    : "var(--color-surface-inner)",
                  color: isActive
                    ? "#fff"
                    : isToday
                    ? "var(--color-nml)"
                    : "var(--color-ink-600)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {DAY_ABBR[day.getDay()]} {day.getDate()}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Calendar grid container ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Column headers */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            borderBottom: "1px solid var(--color-ink-200)",
            background: "var(--color-surface)",
            zIndex: 10,
          }}
        >
          <div style={{ width: GUTTER_W, flexShrink: 0 }} />
          {visibleDays.map((day, i) => {
            const dayStr = isoDate(day);
            const isToday = dayStr === todayStr;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 4px 8px",
                  borderLeft: i > 0 ? "1px solid var(--color-ink-100)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isToday ? "var(--color-nml)" : "var(--color-ink-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {DAY_ABBR[day.getDay()]}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: isToday ? "var(--color-nml)" : "transparent",
                    color: isToday ? "#fff" : "var(--color-ink-900)",
                    fontSize: 15,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day strip */}
        {(() => {
          const hasAnyAllDay = visibleDays.some(
            (d) => allDayEventsForDay(events, isoDate(d)).length > 0
          );
          if (!hasAnyAllDay) return null;
          return (
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                borderBottom: "1px solid var(--color-ink-200)",
                minHeight: 28,
              }}
            >
              <div
                style={{
                  width: GUTTER_W,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "var(--color-ink-400)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("allDay")}
              </div>
              {visibleDays.map((day, i) => {
                const dayAllDay = allDayEventsForDay(events, isoDate(day));
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      padding: "3px 4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      borderLeft: i > 0 ? "1px solid var(--color-ink-100)" : "none",
                    }}
                  >
                    {dayAllDay.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: "var(--color-ink-700)",
                          background: "var(--color-surface-inner)",
                          borderLeft: "2px solid var(--color-ink-300)",
                          borderRadius: 3,
                          padding: "1px 5px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Scrollable time grid */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
        >
          <div style={{ display: "flex", height: GRID_H, position: "relative" }}>

            {/* Time gutter */}
            <div
              style={{
                width: GUTTER_W,
                flexShrink: 0,
                position: "relative",
                borderRight: "1px solid var(--color-ink-200)",
                background: "var(--color-surface)",
              }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    top: (h - START_H) * HOUR_PX - 7,
                    left: 0,
                    right: 8,
                    textAlign: "right",
                    fontSize: 10,
                    fontWeight: 500,
                    color: "var(--color-ink-400)",
                    lineHeight: 1,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {h === START_H ? "" : `${pad2(h)}:00`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div style={{ flex: 1, display: "flex" }}>
              {visibleDays.map((day, colIdx) => {
                const dayStr = isoDate(day);
                const isToday = dayStr === todayStr;
                const dayEvents = eventsForDay(events, dayStr);
                const layoutted = layoutDayEvents(dayEvents);

                return (
                  <div
                    key={colIdx}
                    style={{
                      flex: 1,
                      position: "relative",
                      borderLeft: "1px solid var(--color-ink-200)",
                      cursor: "crosshair",
                      minWidth: 0,
                    }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-event]")) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleSlotClick(dayStr, e.clientY - rect.top);
                    }}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <React.Fragment key={h}>
                        <div
                          style={{
                            position: "absolute",
                            top: (h - START_H) * HOUR_PX,
                            left: 0,
                            right: 0,
                            height: 1,
                            background: "var(--color-ink-200)",
                            pointerEvents: "none",
                          }}
                        />
                        {h < END_H - 1 && (
                          <div
                            style={{
                              position: "absolute",
                              top: (h - START_H) * HOUR_PX + HOUR_PX / 2,
                              left: 0,
                              right: 0,
                              height: 1,
                              background: "var(--color-ink-100)",
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </React.Fragment>
                    ))}

                    {/* Current time line */}
                    {isToday && now && (() => {
                      const minsOffset = now.getHours() * 60 + now.getMinutes() - START_H * 60;
                      if (minsOffset < 0 || minsOffset > (END_H - START_H) * 60) return null;
                      const top = minsOffset * MIN_PX;
                      return (
                        <div
                          style={{
                            position: "absolute",
                            top,
                            left: -1,
                            right: 0,
                            height: 2,
                            background: "var(--color-nml)",
                            zIndex: 20,
                            pointerEvents: "none",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: -4,
                              top: -4,
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: "var(--color-nml)",
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Events */}
                    {layoutted.map((le, i) => (
                      <EventBlock
                        key={i}
                        layoutEvent={le}
                        onClick={() => {
                          if (le.event.isGoogleEvent) {
                            if (le.event.htmlLink) window.open(le.event.htmlLink, "_blank");
                          } else {
                            router.push(`/meetings/${le.event.id}`);
                          }
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "7px 16px",
          fontSize: 11,
          color: "var(--color-ink-400)",
          borderTop: "1px solid var(--color-ink-100)",
          background: "var(--color-surface)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 12,
              height: 12,
              background: "var(--color-nml)",
              borderRadius: 3,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {t("nmlMeeting")}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 12,
              height: 12,
              background: "var(--color-surface-inner)",
              border: "2px solid var(--color-ink-300)",
              borderRadius: 3,
              display: "inline-block",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          />
          {t("googleCalendar")}
        </span>
        <span style={{ marginInlineStart: "auto", color: "var(--color-ink-300)" }}>
          {t("clickToBook")}
        </span>
      </div>

      {/* ── Booking modal ── */}
      {modal && (
        <BookingModal
          defaultDate={modal.date}
          defaultTime={modal.time}
          profiles={profiles}
          workItems={workItems}
          onCreated={() => {
            setModal(null);
            refresh();
          }}
          onClose={() => setModal(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

// ── button styles ──────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface)",
  color: "var(--color-ink-700)",
  cursor: "pointer",
};

const todayBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface)",
  color: "var(--color-ink-700)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const scheduleBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 16px",
  borderRadius: 999,
  border: "none",
  background: "var(--color-nml)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};
