"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X, ChevronDown, Calendar } from "lucide-react";
import PeoplePicker from "@/components/ui/PeoplePicker";
import AvailabilityGrid from "@/components/meetings/AvailabilityGrid";
import {
  createMeeting,
  type CreateMeetingState,
} from "@/app/(app)/meetings/actions";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string;
  title: string | null;
  role: string;
}

interface WorkItem {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface MeetingFormProps {
  profiles: Profile[];
  workItems: WorkItem[];
}

const TYPE_COLOR: Record<string, string> = {
  initiative: "var(--color-nml)",
  task: "#B79A99",
  subtask: "var(--color-ink-300)",
  objective: "var(--color-ink-900)",
};

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
  fontSize: 14,
  fontWeight: 600,
  color: "var(--color-ink-700)",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Build a local ISO string (no Z) from date + time. */
function buildLocalIso(date: string, time: string): string {
  return `${date}T${time}:00`;
}

/** Add minutes to a local ISO string, return another local ISO string. */
function addMinutes(localIso: string, minutes: number): string {
  const d = new Date(localIso);
  d.setMinutes(d.getMinutes() + minutes);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Format YYYY-MM-DD as "11 Aug 2026" (avoids timezone-related day shift). */
function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Item picker (work items for topics) ───────────────────────────────────────

function ItemPicker({
  workItems,
  selected,
  onChange,
}: {
  workItems: WorkItem[];
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

  const selectedItems = selected
    .map((id) => workItems.find((w) => w.id === id))
    .filter(Boolean) as WorkItem[];

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
          border: `1px solid ${open ? "var(--color-ink-900)" : "var(--color-ink-200)"}`,
          background: "var(--color-surface)",
          cursor: "pointer",
          textAlign: "start",
          fontFamily: "inherit",
          boxSizing: "border-box",
          transition: "border-color 150ms",
        }}
      >
        {selectedItems.length === 0 ? (
          <span style={{ flex: 1, fontSize: 15, color: "var(--color-ink-400)", lineHeight: "30px" }}>
            {t("linkWorkItems")}
          </span>
        ) : (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
            {selectedItems.map((w) => (
              <span
                key={w.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 28,
                  padding: "0 8px 0 6px",
                  borderRadius: "999px",
                  background: "var(--color-ink-100)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-ink-900)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    background: TYPE_COLOR[w.type] ?? "var(--color-ink-300)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.title}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); toggle(w.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); toggle(w.id); } }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 14,
                    height: 14,
                    borderRadius: "999px",
                    background: "var(--color-ink-300)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <X size={8} strokeWidth={2.5} />
                </span>
              </span>
            ))}
          </span>
        )}
        <ChevronDown
          size={16}
          style={{
            color: "var(--color-ink-400)",
            flexShrink: 0,
            marginInlineStart: "auto",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            zIndex: 50,
            background: "var(--color-surface)",
            borderRadius: "var(--radius-inner)",
            boxShadow: "var(--shadow-pop)",
            padding: 8,
            maxHeight: "min(280px, 40vh)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "0 4px 6px", borderBottom: "1px solid var(--color-ink-200)", marginBottom: 6, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-400)", pointerEvents: "none" }} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                placeholder={t("searchItems")}
                style={{ width: "100%", height: 36, padding: "0 12px 0 30px", borderRadius: "999px", border: "1px solid var(--color-ink-200)", background: "var(--color-surface-inner)", fontSize: 14, color: "var(--color-ink-900)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <li style={{ padding: "12px 10px", fontSize: 13, color: "var(--color-ink-400)", textAlign: "center" }}>
                {t("noItemsMatch")}
              </li>
            ) : (
              filtered.map((w) => {
                const isSel = selected.includes(w.id);
                return (
                  <li
                    key={w.id}
                    onClick={() => toggle(w.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "6px 10px", borderRadius: "var(--radius-row)", cursor: "pointer", userSelect: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-inner)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "999px", background: TYPE_COLOR[w.type] ?? "var(--color-ink-300)", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--color-ink-400)", textTransform: "capitalize" }}>{w.type} · {w.status.replace(/_/g, " ")}</span>
                    </span>
                    {isSel && (
                      <span style={{ width: 16, height: 16, borderRadius: "999px", background: "var(--color-nml)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
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

// ── MeetingForm ───────────────────────────────────────────────────────────────

export default function MeetingForm({ profiles, workItems }: MeetingFormProps) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<CreateMeetingState, FormData>(
    createMeeting,
    null
  );

  const [date, setDate] = useState("");
  const [timeStr, setTimeStr] = useState(""); // HH:MM or ""
  const [duration, setDuration] = useState(60);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Derived from date + timeStr + duration — no separate startsAt/endsAt state
  const startsAt = date && timeStr ? buildLocalIso(date, timeStr) : null;
  const endsAt = startsAt ? addMinutes(startsAt, duration) : null;

  const processedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || !("id" in state)) return;
    const id = state.id;
    if (processedIdRef.current === id) return;
    processedIdRef.current = id;
    router.push(`/meetings/${id}`);
  }, [state, router]);

  // When a grid slot is clicked, extract HH:MM from the ISO string
  function handleSlotClick(slotIso: string, _endIso: string) {
    const m = slotIso.match(/T(\d{2}:\d{2})/);
    if (m) setTimeStr(m[1]);
  }

  const inviteePeople = profiles.filter((p) => selectedInvitees.includes(p.id));

  const formError = state && "error" in state ? state.error : null;
  const calendarError = state && "id" in state && state.calendarError ? state.calendarError : null;

  const canSubmit = !isPending && !!date && !!timeStr;

  const durations = [
    { label: t("dur15"), value: 15 },
    { label: t("dur30"), value: 30 },
    { label: t("dur45"), value: 45 },
    { label: t("dur60"), value: 60 },
    { label: t("dur90"), value: 90 },
    { label: t("dur120"), value: 120 },
  ];

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hidden fields */}
      <input type="hidden" name="timezone" value={timezone} />
      {startsAt && <input type="hidden" name="starts_at" value={startsAt} />}
      {endsAt && <input type="hidden" name="ends_at" value={endsAt} />}

      {formError && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-row)", background: "var(--color-crit-soft)", color: "var(--color-crit)", fontSize: 14 }}>
          {formError}
        </div>
      )}
      {calendarError && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius-row)", background: "var(--color-warn-soft)", color: "var(--color-warn)", fontSize: 14 }}>
          {t("meetingSavedSyncFailed")}
        </div>
      )}

      {/* Title */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="title" style={labelStyle}>
          {t("form.title")} <span style={{ color: "var(--color-crit)" }}>*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder={t("form.titlePlaceholder")}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-900)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-200)")}
        />
      </div>

      {/* Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="description" style={labelStyle}>{tc("description")}</label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={3}
          placeholder={t("form.agendaPlaceholder")}
          style={{ ...inputStyle, height: "auto", padding: "12px 16px", lineHeight: "22px", resize: "vertical" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-900)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-200)")}
        />
      </div>

      {/* Date / Time / Duration — three columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="date" style={labelStyle}>
            {t("form.date")} <span style={{ color: "var(--color-crit)" }}>*</span>
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTimeStr(""); // clear time when date changes
            }}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-900)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-200)")}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="time" style={labelStyle}>
            {t("form.startTime")} <span style={{ color: "var(--color-crit)" }}>*</span>
          </label>
          <input
            id="time"
            type="time"
            value={timeStr}
            disabled={!date}
            onChange={(e) => setTimeStr(e.target.value)}
            style={{
              ...inputStyle,
              opacity: date ? 1 : 0.5,
              cursor: date ? "auto" : "not-allowed",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-900)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-ink-200)")}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="duration" style={labelStyle}>
            {t("form.endTime")} <span style={{ color: "var(--color-crit)" }}>*</span>
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={inputStyle}
          >
            {durations.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected time readout — always visible once date is chosen */}
      {date && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-input)",
            background: timeStr ? "var(--color-ok-soft)" : "var(--color-surface-inner)",
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {timeStr ? (
            <>
              <span style={{ color: "var(--color-ok)", display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} />
                {formatDateLabel(date)}, {timeStr} – {endsAt ? endsAt.slice(11, 16) : ""}
              </span>
              <button
                type="button"
                onClick={() => setTimeStr("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ok)", padding: 0, flexShrink: 0 }}
                title={tc("cancel")}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <span style={{ color: "var(--color-ink-400)" }}>
              {t("noTimeSelected")}
            </span>
          )}
        </div>
      )}

      {/* Invitees */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={labelStyle}>{t("form.attendees")}</label>
        <PeoplePicker
          people={profiles}
          name="attendees"
          defaultValue={[]}
          onChange={setSelectedInvitees}
        />
        <p style={{ fontSize: 12, color: "var(--color-ink-400)", margin: 0 }}>
          {t("youAreOrganizer")}
        </p>
      </div>

      {/* Availability grid — shows once date is picked, even without invitees */}
      {date && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={labelStyle}>
            {t("form.attendees")}
            {inviteePeople.length === 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-ink-400)", marginInlineStart: 8 }}>
                {t("addInviteesToSee")}
              </span>
            )}
          </div>
          {inviteePeople.length > 0 && (
            <AvailabilityGrid
              invitees={inviteePeople}
              date={date}
              onSlotClick={handleSlotClick}
              duration={duration}
              selectedStart={startsAt}
            />
          )}
        </div>
      )}

      {/* Topics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={labelStyle}>{t("form.agenda")}</label>
        <ItemPicker
          workItems={workItems}
          selected={selectedTopics}
          onChange={setSelectedTopics}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: "999px",
              border: "none",
              background: canSubmit ? "var(--color-nml)" : "var(--color-ink-300)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 150ms",
            }}
          >
            {isPending ? t("schedulingButton") : t("scheduleButton")}
          </button>
          <Link
            href="/meetings"
            style={{
              height: 44,
              padding: "0 20px",
              borderRadius: "999px",
              background: "var(--color-ink-100)",
              color: "var(--color-ink-900)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {tc("cancel")}
          </Link>
        </div>
        {!date && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-400)" }}>
            {t("pickDate")}
          </p>
        )}
        {date && !timeStr && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-400)" }}>
            {t("selectStartTime")}
          </p>
        )}
      </div>
    </form>
  );
}
