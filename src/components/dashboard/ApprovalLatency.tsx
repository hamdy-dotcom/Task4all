import React from "react";
import { getTranslations } from "next-intl/server";
import { Num } from "@/components/ui/Num";

export interface LatencyData {
  medianDays: number;
  pendingCount: number;
  approvedCount: number;
  targetDays?: number;
}

export async function ApprovalLatency({ data }: { data: LatencyData }) {
  const t = await getTranslations("dashboard");

  const target = data.targetDays ?? 2;
  const pct = Math.min(100, Math.round((data.medianDays / target) * 100));
  const overTarget = data.medianDays > target;
  const barColor = overTarget ? "var(--color-crit)" : "var(--color-ok)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Median + pending — dir=ltr keeps value+unit from flipping in RTL */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink-400)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {t("medianDays")}
          </p>
          <div dir="ltr" style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
            <span
              className="tnum"
              style={{
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.1,
                color: overTarget ? "var(--color-crit)" : "var(--color-ink-900)",
              }}
            >
              {data.approvedCount === 0 ? "—" : <Num>{data.medianDays}</Num>}
            </span>
            {data.approvedCount > 0 && (
              <span style={{ fontSize: 14, color: "var(--color-ink-600)" }}>
                {t("daysUnit")}
              </span>
            )}
          </div>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink-400)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {t("stillWaiting")}
          </p>
          <div dir="ltr" style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
            <span
              className="tnum"
              style={{
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.1,
                color:
                  data.pendingCount > 5
                    ? "var(--color-crit)"
                    : data.pendingCount > 0
                      ? "var(--color-warn)"
                      : "var(--color-ink-900)",
              }}
            >
              <Num>{data.pendingCount}</Num>
            </span>
            <span style={{ fontSize: 14, color: "var(--color-ink-600)" }}>
              {t("itemsUnit")}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar vs target */}
      {data.approvedCount > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--color-ink-600)" }}>
              {t("vsTarget", { n: target })}
            </span>
            <span
              className="tnum"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: overTarget ? "var(--color-crit)" : "var(--color-ok)",
              }}
            >
              {overTarget
                ? t("aboveTarget", { n: Math.round(data.medianDays - target) })
                : t("onTarget")}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--color-ink-100)",
              overflow: "hidden",
            }}
          >
            {/* dir=ltr: progress bar fill always grows from start regardless of doc direction */}
            <div
              dir="ltr"
              style={{
                height: "100%",
                width: `${Math.min(100, pct)}%`,
                background: barColor,
                borderRadius: 999,
              }}
            />
          </div>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--color-ink-400)",
            }}
          >
            {t("computedFrom", { n: data.approvedCount })}
          </p>
        </div>
      )}

      {data.approvedCount === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-400)" }}>
          {t("noApprovedYet")}
        </p>
      )}
    </div>
  );
}
