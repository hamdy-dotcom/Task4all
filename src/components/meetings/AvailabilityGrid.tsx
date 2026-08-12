"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { checkFreeBusy, type FreeBusyRow } from "@/app/(app)/meetings/actions";

interface Person {
  id: string;
  full_name: string;
}

interface Props {
  invitees: Person[];
  date: string; // YYYY-MM-DD
  onSlotClick: (startsAt: string, endsAt: string) => void;
  duration: number; // minutes
  selectedStart: string | null;
}

// 07:00 – 20:00 in 30-min steps
const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 20;
const STEP = 30;

const LABEL_W = 160;
const SLOT_W = 52;
const ROW_H = 44;

function buildSlots(date: string): Array<{ label: string; iso: string }> {
  const slots = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (const m of [0, 30]) {
      if (h === SLOT_END_HOUR - 1 && m === 30) break; // stop at 20:00, not 20:30
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push({ label: `${hh}:${mm}`, iso: `${date}T${hh}:${mm}:00` });
    }
  }
  return slots;
}

function isBusy(
  slotIso: string,
  durationMin: number,
  busy: FreeBusyRow["busy"]
): boolean {
  const slotStart = new Date(slotIso).getTime();
  const slotEnd = slotStart + durationMin * 60_000;
  for (const block of busy) {
    const blockStart = new Date(block.start).getTime();
    const blockEnd = new Date(block.end).getTime();
    if (slotStart < blockEnd && slotEnd > blockStart) return true;
  }
  return false;
}

export default function AvailabilityGrid({
  invitees,
  date,
  onSlotClick,
  duration,
  selectedStart,
}: Props) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<FreeBusyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const prevKey = useRef("");

  useEffect(() => {
    if (!date || invitees.length === 0) {
      setRows([]);
      return;
    }
    const key = `${date}:${invitees.map((p) => p.id).join(",")}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    setLoading(true);
    startTransition(async () => {
      const result = await checkFreeBusy(invitees.map((p) => p.id), date);
      setRows(result);
      setLoading(false);
    });
  }, [date, invitees]);

  if (!date || invitees.length === 0) return null;

  const slots = buildSlots(date);
  const totalW = LABEL_W + slots.length * SLOT_W;

  // Map userId → FreeBusyRow
  const rowMap = new Map(rows.map((r) => [r.userId, r]));

  return (
    // dir="ltr" keeps the availability grid always left-to-right (time flows left→right)
    <div
      dir="ltr"
      style={{
        border: "1px solid var(--color-ink-200)",
        borderRadius: "var(--radius-input)",
        background: "var(--color-surface)",
        overflow: "hidden",
      }}
    >
      {/* Single horizontally-scrollable container — all rows scroll together */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: totalW }}>

          {/* ── Header: time labels ─────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--color-ink-200)",
              background: "var(--color-surface-inner)",
            }}
          >
            <div
              style={{
                width: LABEL_W,
                flexShrink: 0,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-ink-400)",
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              {loading ? tc("loading") : t("availabilityTitle", { date })}
            </div>
            {slots.map((s, i) => (
              <div
                key={i}
                style={{
                  width: SLOT_W,
                  flexShrink: 0,
                  padding: "6px 0",
                  fontSize: 10,
                  fontWeight: 500,
                  color: "var(--color-ink-400)",
                  textAlign: "center",
                  borderLeft: s.label.endsWith(":00")
                    ? "1px solid var(--color-ink-200)"
                    : "none",
                }}
              >
                {s.label.endsWith(":00") ? s.label : ""}
              </div>
            ))}
          </div>

          {/* ── Person rows ─────────────────────────────────────────────── */}
          {invitees.map((person, personIdx) => {
            const fbRow = rowMap.get(person.id);
            const unknown = !fbRow?.hasAccount;

            return (
              <div
                key={person.id}
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--color-ink-100)",
                  minHeight: ROW_H,
                }}
              >
                {/* Name + connection status */}
                <div
                  style={{
                    width: LABEL_W,
                    flexShrink: 0,
                    padding: "0 12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 1,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: unknown ? "var(--color-ink-500)" : "var(--color-ink-900)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {person.full_name}
                  </span>
                  {unknown && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--color-ink-400)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("notConnected")}
                    </span>
                  )}
                </div>

                {/* Slot cells */}
                {slots.map((s, i) => {
                  if (unknown) {
                    return (
                      <div
                        key={i}
                        style={{
                          width: SLOT_W,
                          flexShrink: 0,
                          height: ROW_H,
                          background:
                            "repeating-linear-gradient(135deg, transparent, transparent 4px, var(--color-ink-100) 4px, var(--color-ink-100) 8px)",
                          borderLeft: s.label.endsWith(":00")
                            ? "1px solid var(--color-ink-200)"
                            : "none",
                        }}
                      />
                    );
                  }

                  const busy = fbRow ? isBusy(s.iso, duration, fbRow.busy) : false;
                  return (
                    <div
                      key={i}
                      style={{
                        width: SLOT_W,
                        flexShrink: 0,
                        height: ROW_H,
                        background: busy ? "var(--color-crit-soft)" : "transparent",
                        borderLeft: s.label.endsWith(":00")
                          ? "1px solid var(--color-ink-200)"
                          : "none",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* ── Clickable slot row ───────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              borderTop: "1px solid var(--color-ink-200)",
              background: "var(--color-surface-inner)",
            }}
          >
            <div
              style={{
                width: LABEL_W,
                flexShrink: 0,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-ink-400)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
                height: 36,
              }}
            >
              {t("clickToSetTime")}
            </div>
            {slots.map((s, i) => {
              const startMs = new Date(s.iso).getTime();
              const endIso = new Date(startMs + duration * 60_000).toISOString();
              const isSelected = selectedStart === s.iso;
              const anyBusy = rows.some(
                (r) => r.hasAccount && isBusy(s.iso, duration, r.busy)
              );

              return (
                <button
                  key={i}
                  type="button"
                  title={t("setStartTimeTo", { time: s.label })}
                  onClick={() => onSlotClick(s.iso, endIso)}
                  style={{
                    width: SLOT_W,
                    flexShrink: 0,
                    height: 36,
                    border: "none",
                    borderLeft: s.label.endsWith(":00")
                      ? "1px solid var(--color-ink-200)"
                      : "none",
                    background: isSelected
                      ? "var(--color-nml)"
                      : anyBusy
                      ? "var(--color-warn-soft)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background 100ms",
                  }}
                  aria-label={t("setStartTimeTo", { time: s.label })}
                />
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Legend (outside scroll, always full width) ─────────────────── */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "var(--color-ink-400)",
          borderTop: "1px solid var(--color-ink-100)",
        }}
      >
        {[
          { color: "var(--color-crit-soft)", label: t("busy") },
          {
            color: "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--color-ink-200) 3px, var(--color-ink-200) 6px)",
            label: t("unknown"),
          },
          { color: "var(--color-nml)", label: t("selected") },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 2,
                background: color,
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
