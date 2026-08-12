import React from "react";
import { getTranslations } from "next-intl/server";
import { Num } from "@/components/ui/Num";

export interface ChartRow {
  label: string;
  total: number;
  done: number;
  pct: number;
}

const CHART_H = 160;
const BAR_W = 48;
const BAR_GAP = 12;

function EmptyChart({
  hint,
  noDataLabel,
}: {
  hint?: { message: string; href: string };
  noDataLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: CHART_H,
        gap: 8,
        textAlign: "center",
      }}
    >
      <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
        <rect x={4} y={20} width={8} height={16} rx={4} fill="var(--color-ink-200)" />
        <rect x={16} y={12} width={8} height={24} rx={4} fill="var(--color-ink-200)" />
        <rect x={28} y={28} width={8} height={8} rx={4} fill="var(--color-ink-200)" />
      </svg>
      {hint ? (
        <>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-600)", maxWidth: 240 }}>
            {hint.message}
          </p>
          <a
            href={hint.href}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-nml)",
              textDecoration: "none",
              borderBottom: "1px solid currentColor",
              lineHeight: 1.4,
            }}
          >
            {noDataLabel}
          </a>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)" }}>{noDataLabel}</p>
      )}
    </div>
  );
}

export async function CapsuleChart({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: ChartRow[];
  emptyHint?: { message: string; href: string };
}) {
  const t = await getTranslations("initiatives");
  const tc = await getTranslations("common");

  const sorted = [...rows].sort((a, b) => b.pct - a.pct);
  const noDataLabel = emptyHint ? t("title") : tc("noData");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          lineHeight: "26px",
          color: "var(--color-ink-900)",
        }}
      >
        {title}
      </h2>

      {sorted.length === 0 ? (
        <EmptyChart hint={emptyHint} noDataLabel={noDataLabel} />
      ) : (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* dir=ltr: chart bar order must not reverse in RTL per spec */}
          <div
            dir="ltr"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: BAR_GAP,
              overflowX: "auto",
              paddingBottom: 8,
              flexShrink: 0,
            }}
          >
            {sorted.map((row, i) => {
              const barH = Math.max(8, Math.round((row.pct / 100) * CHART_H));
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    width: BAR_W,
                    height: CHART_H,
                    background: "var(--color-chart-track)",
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "flex-end",
                    flexShrink: 0,
                  }}
                >
                  {/* Percentage label — bidi-isolated so "42%" never becomes "% 42" */}
                  <span
                    className="tnum"
                    style={{
                      position: "absolute",
                      top: 10,
                      insetInlineStart: 0,
                      insetInlineEnd: 0,
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-ink-600)",
                      lineHeight: 1,
                    }}
                  >
                    <Num value={row.pct} unit="%" />
                  </span>
                  <div
                    style={{
                      width: "100%",
                      height: barH,
                      background: "var(--color-chart-2)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Key: label on start side, fraction on end side */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingTop: 4,
              minWidth: 0,
            }}
          >
            {sorted.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--color-ink-900)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {row.label}
                </span>
                <span className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-900)", flexShrink: 0 }}>
                  {/* dir=ltr: fraction separator must not flip */}
                  <Num>{row.done}/{row.total}</Num>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
