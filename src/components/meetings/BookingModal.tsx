"use client";

import React, { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Mail, MapPin, Video, Search, Plus } from "lucide-react";
import PeoplePicker, { type PickerPerson } from "@/components/ui/PeoplePicker";
import {
  createMeeting,
  checkFreeBusy,
  type CreateMeetingState,
  type FreeBusyRow,
} from "@/app/(app)/meetings/actions";
import type { CalendarProfile, CalendarWorkItem } from "./CalendarWeek";

// ── constants ──────────────────────────────────────────────────────────────────

const GRID_START_H = 7;
const GRID_END_H = 20;
const GRID_HOURS = GRID_END_H - GRID_START_H; // 13
const HOUR_PX = 16;
const GRID_H = GRID_HOURS * HOUR_PX; // 208px
const TIME_W = 40;
const COL_W = 68;
const HEADER_H = 32;

const TYPE_COLOR: Record<string, string> = {
  initiative: "var(--color-nml)",
  task: "#B79A99",
  subtask: "var(--color-ink-300)",
  objective: "var(--color-ink-900)",
};

// ── types ──────────────────────────────────────────────────────────────────────

interface ExternalInvitee {
  email: string;
  name: string;
}

interface Props {
  defaultDate: string;
  defaultTime: string;
  profiles: CalendarProfile[];
  workItems: CalendarWorkItem[];
  onCreated: () => void;
  onClose: () => void;
  isMobile: boolean;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildLocalIso(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function addMinutes(localIso: string, minutes: number): string {
  const d = new Date(localIso);
  d.setMinutes(d.getMinutes() + minutes);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isBusyDuring(
  busySlots: FreeBusyRow["busy"],
  startsAt: string,
  endsAt: string
): boolean {
  const slotStart = new Date(startsAt).getTime();
  const slotEnd = new Date(endsAt).getTime();
  return busySlots.some((b) => {
    const bStart = new Date(b.start).getTime();
    const bEnd = new Date(b.end).getTime();
    return bStart < slotEnd && bEnd > slotStart;
  });
}

function timeToFrac(isoOrHHMM: string): number {
  let h: number, m: number;
  if (isoOrHHMM.includes("T")) {
    const d = new Date(isoOrHHMM);
    h = d.getHours();
    m = d.getMinutes();
  } else {
    [h, m] = isoOrHHMM.split(":").map(Number);
  }
  return ((h * 60 + m) - GRID_START_H * 60) / (GRID_HOURS * 60);
}

// ── availability day grid ──────────────────────────────────────────────────────

function AvailabilityDayGrid({
  internalInvitees,
  externalInvitees,
  fbMap,
  startsAt,
  endsAt,
  date,
}: {
  internalInvitees: CalendarProfile[];
  externalInvitees: ExternalInvitee[];
  fbMap: Map<string, FreeBusyRow>;
  startsAt: string | null;
  endsAt: string | null;
  date: string;
}) {
  const t = useTranslations("meetings");
  const totalPeople = internalInvitees.length + externalInvitees.length;
  if (totalPeople === 0 || !date) return null;

  // ── summary ────────────────────────────────────────────────────────────────
  let summaryLine: React.ReactNode = null;
  if (startsAt && endsAt) {
    const withAccount = internalInvitees.filter((p) => fbMap.get(p.id)?.hasAccount);
    const busyPeople = withAccount.filter((p) => {
      const fb = fbMap.get(p.id);
      return fb && isBusyDuring(fb.busy, startsAt, endsAt);
    });
    const availableCount = withAccount.length - busyPeople.length;

    if (withAccount.length === 0) {
      summaryLine = (
        <span style={{ color: "var(--color-ink-400)" }}>
          {t("notConnectedCalendar")}
        </span>
      );
    } else if (busyPeople.length === 0) {
      summaryLine = (
        <span style={{ color: "var(--color-ok, #16a34a)" }}>
          {t("allAvailable", { n: withAccount.length })}
        </span>
      );
    } else {
      const busyNames = busyPeople.map((p) => p.full_name.split(" ")[0]);
      const nameStr =
        busyNames.length === 1
          ? busyNames[0]
          : busyNames.slice(0, -1).join(", ") + " and " + busyNames.at(-1);
      summaryLine = (
        <>
          <span style={{ color: "var(--color-ink-700)" }}>
            {busyPeople.length === 1
              ? t("someAvailable", { avail: availableCount, total: withAccount.length, busy: nameStr })
              : t("someBusy", { avail: availableCount, total: withAccount.length, busy: nameStr })}
          </span>
        </>
      );
    }
  } else {
    summaryLine = (
      <span style={{ color: "var(--color-ink-400)" }}>
        {t("selectTimeAvail")}
      </span>
    );
  }

  // ── slot bar position ──────────────────────────────────────────────────────
  let slotTop: number | null = null;
  let slotHeight: number | null = null;
  if (startsAt && endsAt) {
    const sf = Math.max(0, Math.min(1, timeToFrac(startsAt)));
    const ef = Math.max(0, Math.min(1, timeToFrac(endsAt)));
    if (ef > sf) {
      slotTop = sf * GRID_H;
      slotHeight = (ef - sf) * GRID_H;
    }
  }

  // ── hour gridline positions ────────────────────────────────────────────────
  const hourLines: { y: number; label: string }[] = [];
  for (let h = GRID_START_H; h <= GRID_END_H; h++) {
    const y = ((h - GRID_START_H) / GRID_HOURS) * GRID_H;
    const ampm = h < 12 ? "am" : "pm";
    const h12 = h % 12 || 12;
    hourLines.push({ y, label: `${h12}${ampm}` });
  }

  const innerW = TIME_W + totalPeople * COL_W;

  return (
    // dir="ltr" keeps the availability mini-grid always left-to-right
    <div dir="ltr" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Summary */}
      <div style={{ fontSize: 11, fontWeight: 500 }}>{summaryLine}</div>

      {/* Grid */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          borderRadius: 8,
          border: "1px solid var(--color-ink-200)",
          background: "var(--color-surface)",
        }}
      >
        <div style={{ minWidth: innerW, display: "flex", flexDirection: "column" }}>
          {/* Header row: name labels */}
          <div
            style={{
              display: "flex",
              height: HEADER_H,
              borderBottom: "1px solid var(--color-ink-200)",
              background: "var(--color-surface-inner)",
            }}
          >
            <div style={{ width: TIME_W, flexShrink: 0 }} />
            {internalInvitees.map((p) => (
              <div
                key={p.id}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  borderLeft: "1px solid var(--color-ink-100)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--color-ink-700)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {p.full_name.split(" ")[0]}
                </span>
              </div>
            ))}
            {externalInvitees.map((e) => (
              <div
                key={e.email}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  borderLeft: "1px solid var(--color-ink-100)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "var(--color-ink-400)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {e.name.split("@")[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div style={{ position: "relative", height: GRID_H }}>
            {/* Gridlines */}
            {hourLines.map(({ y, label }) => (
              <div
                key={y}
                style={{
                  position: "absolute",
                  top: y,
                  left: 0,
                  right: 0,
                  borderTop: "1px solid var(--color-ink-100)",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    left: 2,
                    fontSize: 9,
                    color: "var(--color-ink-300)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}

            {/* Meeting slot band */}
            {slotTop !== null && slotHeight !== null && (
              <div
                style={{
                  position: "absolute",
                  top: slotTop,
                  left: TIME_W,
                  right: 0,
                  height: slotHeight,
                  background: "var(--color-nml)",
                  opacity: 0.18,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            )}

            {/* Column separators + busy blocks */}
            {internalInvitees.map((p, i) => {
              const fb = fbMap.get(p.id);
              const x = TIME_W + i * COL_W;
              const isHatched = fb && !fb.hasAccount;

              return (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: x,
                    width: COL_W,
                    height: GRID_H,
                    borderLeft: "1px solid var(--color-ink-100)",
                  }}
                >
                  {/* Not-connected hatch */}
                  {isHatched && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "repeating-linear-gradient(135deg, transparent, transparent 4px, var(--color-ink-100) 4px, var(--color-ink-100) 8px)",
                        opacity: 0.7,
                      }}
                    />
                  )}
                  {isHatched && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: 0,
                        right: 0,
                        fontSize: 8,
                        color: "var(--color-ink-300)",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      {t("notConnectedPerson")}
                    </div>
                  )}

                  {/* Busy blocks */}
                  {fb?.hasAccount &&
                    fb.busy.map((block, bi) => {
                      const bStartFrac = Math.max(0, timeToFrac(block.start));
                      const bEndFrac = Math.min(1, timeToFrac(block.end));
                      if (bEndFrac <= bStartFrac) return null;
                      return (
                        <div
                          key={bi}
                          style={{
                            position: "absolute",
                            top: bStartFrac * GRID_H,
                            height: (bEndFrac - bStartFrac) * GRID_H,
                            left: 2,
                            right: 2,
                            background: "var(--color-ink-200)",
                            borderRadius: 2,
                            zIndex: 1,
                          }}
                        />
                      );
                    })}
                </div>
              );
            })}

            {/* External invitee columns — always "unavailable" */}
            {externalInvitees.map((e, i) => {
              const x = TIME_W + (internalInvitees.length + i) * COL_W;
              return (
                <div
                  key={e.email}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: x,
                    width: COL_W,
                    height: GRID_H,
                    borderLeft: "1px solid var(--color-ink-100)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "repeating-linear-gradient(135deg, transparent, transparent 4px, var(--color-ink-100) 4px, var(--color-ink-100) 8px)",
                      opacity: 0.5,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: 0,
                      right: 0,
                      fontSize: 8,
                      color: "var(--color-ink-300)",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {t("unavailable")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── item picker ────────────────────────────────────────────────────────────────

function ItemPicker({
  workItems,
  selected,
  onChange,
}: {
  workItems: CalendarWorkItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("meetings");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? workItems.filter((w) =>
        w.title.toLowerCase().includes(query.toLowerCase())
      )
    : workItems;

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => searchRef.current?.focus());
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  const selectedItems = workItems.filter((w) => selected.includes(w.id));

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {selected.map((id) => (
        <input key={id} type="hidden" name="topic_id" value={id} />
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          minHeight: 44,
          width: "100%",
          padding: "6px 12px 6px 10px",
          borderRadius: "var(--radius-input)",
          border: "1px solid var(--color-ink-200)",
          background: "var(--color-surface)",
          cursor: "pointer",
          textAlign: "start",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      >
        {selectedItems.length === 0 ? (
          <span style={{ flex: 1, fontSize: 15, color: "var(--color-ink-400)" }}>
            {t("linkWorkItems")}
          </span>
        ) : (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
            {selectedItems.map((item) => (
              <span
                key={item.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  height: 26,
                  padding: "0 8px",
                  borderRadius: 999,
                  background: "var(--color-surface-inner)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-ink-800)",
                  borderInlineStart: `3px solid ${TYPE_COLOR[item.type] ?? "var(--color-ink-300)"}`,
                }}
              >
                {item.title}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(item.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: "var(--color-ink-300)",
                    color: "var(--color-ink-700)",
                    cursor: "pointer",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  ×
                </span>
              </span>
            ))}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            zIndex: 60,
            background: "var(--color-surface)",
            borderRadius: "var(--radius-inner)",
            boxShadow: "var(--shadow-pop)",
            padding: 8,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ position: "relative", marginBottom: 6, flexShrink: 0 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                insetInlineStart: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-ink-400)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchWorkItems")}
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px 0 30px",
                borderRadius: 999,
                border: "1px solid var(--color-ink-200)",
                background: "var(--color-surface-inner)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {filtered.length === 0 ? (
              <li
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "var(--color-ink-400)",
                  textAlign: "center",
                }}
              >
                {t("noWorkItems")}
              </li>
            ) : (
              filtered.map((item) => {
                const isSel = selected.includes(item.id);
                return (
                  <li
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minHeight: 40,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-row)",
                      background: isSel ? "var(--color-nml-softer)" : "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: TYPE_COLOR[item.type] ?? "var(--color-ink-300)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        color: "var(--color-ink-900)",
                        fontWeight: isSel ? 500 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--color-ink-400)",
                        flexShrink: 0,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.type}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── main modal ─────────────────────────────────────────────────────────────────

export default function BookingModal({
  defaultDate,
  defaultTime,
  profiles,
  workItems,
  onCreated,
  onClose,
  isMobile,
}: Props) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const [state, formAction, isPending] = useActionState<CreateMeetingState, FormData>(
    createMeeting,
    null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [date, setDate] = useState(defaultDate);
  const [timeStr, setTimeStr] = useState(defaultTime);
  const [duration, setDuration] = useState(60);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [externalInvitees, setExternalInvitees] = useState<ExternalInvitee[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [fbRows, setFbRows] = useState<FreeBusyRow[]>([]);
  const [, startTransition] = useTransition();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const startsAt = date && timeStr ? buildLocalIso(date, timeStr) : null;
  const endsAt = startsAt ? addMinutes(startsAt, duration) : null;
  const timezone = getUserTimezone();

  const durations = [
    { label: t("dur15"), value: 15 },
    { label: t("dur30"), value: 30 },
    { label: t("dur45"), value: 45 },
    { label: t("dur60"), value: 60 },
    { label: t("dur90"), value: 90 },
    { label: t("dur120"), value: 120 },
  ];

  useEffect(() => {
    if (state && "id" in state) {
      onCreated();
    }
  }, [state, onCreated]);

  useEffect(() => {
    if (!date || selectedInvitees.length === 0) {
      setFbRows([]);
      return;
    }
    startTransition(async () => {
      const rows = await checkFreeBusy(selectedInvitees, date);
      setFbRows(rows);
    });
  }, [date, selectedInvitees]);

  function addExternalInvitee() {
    const email = emailInput.trim().toLowerCase();
    setEmailError(null);

    if (!email) return;

    if (!isValidEmail(email)) {
      setEmailError(t("invalidEmail"));
      return;
    }
    if (externalInvitees.some((e) => e.email === email)) {
      setEmailError(t("alreadyInvited"));
      return;
    }

    setExternalInvitees((prev) => [...prev, { email, name: email }]);
    setEmailInput("");
    setIsDirty(true);
  }

  function removeExternal(email: string) {
    setExternalInvitees((prev) => prev.filter((e) => e.email !== email));
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return;
    if (isDirty) {
      if (!window.confirm(t("discardPrompt"))) return;
    }
    onClose();
  }

  function handleEscape(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (isDirty) {
        if (!window.confirm(t("discardPrompt"))) return;
      }
      onClose();
    }
  }

  const fbMap = new Map(fbRows.map((r) => [r.userId, r]));
  const internalInviteeProfiles = selectedInvitees
    .map((id) => profiles.find((p) => p.id === id))
    .filter(Boolean) as CalendarProfile[];

  const pickerPeople: PickerPerson[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    title: p.title,
    role: p.role,
  }));

  const showGrid = (internalInviteeProfiles.length > 0 || externalInvitees.length > 0) && !!date;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
      }
    : {
        position: "relative",
        width: "min(600px, calc(100vw - 32px))",
        maxHeight: "min(92dvh, 860px)",
        borderRadius: "var(--radius-inner)",
        boxShadow: "var(--shadow-pop)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
      };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(32,31,30,.45)",
        zIndex: 100,
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: isMobile ? "stretch" : "center",
        padding: isMobile ? 0 : 16,
      }}
      onClick={handleBackdrop}
      onKeyDown={handleEscape}
    >
      <div className="glass-card" style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-ink-200)",
            flexShrink: 0,
          }}
        >
          <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "var(--color-ink-900)" }}>
            {t("scheduleButton")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "none",
              background: "var(--color-surface-inner)",
              color: "var(--color-ink-400)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form
          action={formAction}
          onChange={() => setIsDirty(true)}
          style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}
        >
          <input type="hidden" name="timezone" value={timezone} />
          {startsAt && <input type="hidden" name="starts_at" value={startsAt} />}
          {endsAt && <input type="hidden" name="ends_at" value={endsAt} />}
          <input type="hidden" name="is_online" value={isOnline ? "true" : "false"} />
          {/* External invitee hidden inputs */}
          {externalInvitees.map((e) => (
            <React.Fragment key={e.email}>
              <input type="hidden" name="external_email" value={e.email} />
              <input type="hidden" name="external_name" value={e.name} />
            </React.Fragment>
          ))}

          <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>

            {/* Title */}
            <div>
              <label style={labelStyle} htmlFor="modal-title">{t("form.title")}</label>
              <input
                id="modal-title"
                name="title"
                type="text"
                required
                autoFocus
                placeholder={t("form.titlePlaceholder")}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>

            {/* Date / Time / Duration */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle} htmlFor="modal-date">{t("form.date")}</label>
                <input
                  id="modal-date"
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setIsDirty(true); }}
                  style={{ ...inputStyle, marginTop: 6, padding: "0 10px" }}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="modal-time">{t("form.startTime")}</label>
                <input
                  id="modal-time"
                  type="time"
                  value={timeStr}
                  onChange={(e) => { setTimeStr(e.target.value); setIsDirty(true); }}
                  disabled={!date}
                  style={{ ...inputStyle, marginTop: 6, padding: "0 10px", opacity: date ? 1 : 0.5 }}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="modal-duration">{t("form.endTime")}</label>
                <select
                  id="modal-duration"
                  value={duration}
                  onChange={(e) => { setDuration(Number(e.target.value)); setIsDirty(true); }}
                  style={{ ...inputStyle, marginTop: 6, padding: "0 10px", appearance: "none", cursor: "pointer" }}
                >
                  {durations.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Format toggle */}
            <div>
              <label style={labelStyle}>{t("format")}</label>
              <div
                style={{
                  display: "flex",
                  background: "var(--color-ink-100)",
                  borderRadius: 999,
                  padding: 3,
                  gap: 2,
                  marginTop: 8,
                }}
              >
                {[
                  { value: true, label: t("online"), icon: <Video size={13} /> },
                  { value: false, label: t("inPerson"), icon: <MapPin size={13} /> },
                ].map(({ value, label, icon }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => { setIsOnline(value); setIsDirty(true); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      height: 34,
                      borderRadius: 999,
                      border: "none",
                      background: isOnline === value ? "var(--color-ink-900)" : "transparent",
                      color: isOnline === value ? "#fff" : "var(--color-ink-600)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "background 150ms, color 150ms",
                    }}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                {isOnline ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12,
                      color: "var(--color-ink-400)",
                      padding: "8px 10px",
                      background: "var(--color-surface-inner)",
                      borderRadius: 8,
                    }}
                  >
                    <Video size={13} style={{ flexShrink: 0 }} />
                    {t("googleMeetHint")}
                  </div>
                ) : (
                  <input
                    name="location"
                    type="text"
                    placeholder={t("locationPlaceholder")}
                    style={inputStyle}
                  />
                )}
              </div>
            </div>

            {/* Invitees */}
            <div>
              <label style={labelStyle}>{t("form.attendees")}</label>
              <div style={{ marginTop: 6 }}>
                <PeoplePicker
                  people={pickerPeople}
                  name="attendees"
                  onChange={setSelectedInvitees}
                />
              </div>

              {/* External invitee chips */}
              {externalInvitees.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {externalInvitees.map((e) => (
                    <span
                      key={e.email}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        height: 28,
                        padding: "0 10px 0 8px",
                        borderRadius: 999,
                        background: "var(--color-surface-inner)",
                        border: "1px dashed var(--color-ink-300)",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-ink-600)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--color-ink-400)",
                          background: "var(--color-ink-100)",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        {t("external")}
                      </span>
                      {e.email}
                      <button
                        type="button"
                        onClick={() => removeExternal(e.email)}
                        aria-label={`Remove ${e.email}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: "none",
                          background: "var(--color-ink-200)",
                          color: "var(--color-ink-600)",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 9,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Invite by email input */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Mail
                      size={13}
                      style={{
                        position: "absolute",
                        insetInlineStart: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--color-ink-400)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addExternalInvitee();
                        }
                      }}
                      placeholder={t("inviteByEmail")}
                      style={{
                        ...inputStyle,
                        height: 38,
                        paddingInlineStart: 32,
                        fontSize: 13,
                        borderColor: emailError ? "var(--color-crit, #dc2626)" : "var(--color-ink-200)",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addExternalInvitee}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      height: 38,
                      padding: "0 14px",
                      borderRadius: "var(--radius-input)",
                      border: "1px solid var(--color-ink-200)",
                      background: "var(--color-surface-inner)",
                      color: "var(--color-ink-700)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={13} />
                    {t("addInvitee")}
                  </button>
                </div>
                {emailError && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-crit, #dc2626)" }}>
                    {emailError}
                  </p>
                )}
              </div>

              {/* Availability day grid */}
              {showGrid && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 10px 10px",
                    background: "var(--color-surface-inner)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-ink-400)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                    }}
                  >
                    {t("availabilityTitle", { date })}
                  </div>
                  <AvailabilityDayGrid
                    internalInvitees={internalInviteeProfiles}
                    externalInvitees={externalInvitees}
                    fbMap={fbMap}
                    startsAt={startsAt}
                    endsAt={endsAt}
                    date={date}
                  />
                </div>
              )}
            </div>

            {/* Topics */}
            <div>
              <label style={labelStyle}>{t("form.agenda")}</label>
              <div style={{ marginTop: 6 }}>
                <ItemPicker
                  workItems={workItems}
                  selected={selectedTopics}
                  onChange={setSelectedTopics}
                />
              </div>
            </div>

            {/* Error */}
            {state && "error" in state && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--color-crit-soft)",
                  color: "var(--color-crit)",
                  fontSize: 13,
                }}
              >
                {state.error}
              </div>
            )}

            <div style={{ flex: 1 }} />
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: "1px solid var(--color-ink-200)",
              flexShrink: 0,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--color-ink-400)",
                flex: 1,
                minWidth: 0,
              }}
            >
              <Mail size={13} style={{ flexShrink: 0 }} />
              {t("googleCalInvite")}
            </span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 38,
                  padding: "0 18px",
                  borderRadius: 999,
                  border: "1px solid var(--color-ink-200)",
                  background: "var(--color-surface)",
                  color: "var(--color-ink-700)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {tc("cancel")}
              </button>
              <button
                type="submit"
                disabled={isPending || !startsAt || !endsAt}
                style={{
                  height: 38,
                  padding: "0 22px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    isPending || !startsAt || !endsAt
                      ? "var(--color-ink-200)"
                      : "var(--color-nml)",
                  color:
                    isPending || !startsAt || !endsAt
                      ? "var(--color-ink-400)"
                      : "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isPending || !startsAt || !endsAt ? "not-allowed" : "pointer",
                  transition: "background 150ms",
                }}
              >
                {isPending ? t("schedulingButton") : t("scheduleButton")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── shared styles ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface)",
  fontSize: 15,
  color: "var(--color-ink-900)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-ink-700)",
  display: "block",
};
