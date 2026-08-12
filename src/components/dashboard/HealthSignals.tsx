import Link from "next/link";
import React from "react";
import { getTranslations } from "next-intl/server";
import { Num } from "@/components/ui/Num";

export interface HealthSignalData {
  overloadedPeople: number;
  staleExperiments: number;
  unassignedInitiatives: number;
  recentlyCancelled: number;
}

function severity(n: number, thresholds: { warn: number; crit: number }): "ok" | "warn" | "crit" {
  if (n === 0) return "ok";
  if (n >= thresholds.crit) return "crit";
  return "warn";
}

const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  ok:      { bg: "var(--color-ok-soft)",   text: "var(--color-ok)" },
  warn:    { bg: "var(--color-warn-soft)", text: "var(--color-warn)" },
  crit:    { bg: "var(--color-crit-soft)", text: "var(--color-crit)" },
  neutral: { bg: "var(--color-ink-100)",   text: "var(--color-ink-600)" },
};

interface Signal {
  label: string;
  desc: string;
  count: number;
  href: string;
  sev: "ok" | "warn" | "crit" | "neutral";
}

function SignalRow({ signal }: { signal: Signal }) {
  const { bg, text } = SEV_COLORS[signal.sev];
  const showCheck = signal.sev === "ok" || signal.sev === "neutral";

  return (
    <Link
      href={signal.href}
      className="row-hover"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: "var(--radius-row)",
        textDecoration: "none",
      }}
    >
      {/* Count badge — always LTR so the number never flips */}
      <span
        className="tnum"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: bg,
          color: text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {showCheck ? "✓" : <Num>{signal.count}</Num>}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-ink-900)" }}>
          {signal.label}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-ink-400)" }}>
          {signal.desc}
        </p>
      </div>

      {/* Chevron flips in RTL so it always points toward the link destination */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        className="flip-rtl"
        style={{ flexShrink: 0, color: "var(--color-ink-300)" }}
      >
        <path
          d="M6 3l5 5-5 5"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

export async function HealthSignals({ data }: { data: HealthSignalData }) {
  const t = await getTranslations("dashboard");

  const signals: Signal[] = [
    {
      label: t("overloadedPeople"),
      desc: t("overloadedPeopleDesc"),
      count: data.overloadedPeople,
      href: "/initiatives?filter=overloaded",
      sev: severity(data.overloadedPeople, { warn: 1, crit: 3 }),
    },
    {
      label: t("staleExperiments"),
      desc: t("staleExperimentsDesc"),
      count: data.staleExperiments,
      href: "/initiatives?filter=stale_experiments",
      sev: severity(data.staleExperiments, { warn: 1, crit: 3 }),
    },
    {
      label: t("unassignedInitiatives"),
      desc: t("unassignedInitiativesDesc"),
      count: data.unassignedInitiatives,
      href: "/initiatives?filter=unassigned",
      sev: severity(data.unassignedInitiatives, { warn: 1, crit: 3 }),
    },
    {
      label: t("recentlyCancelled"),
      desc: t("recentlyCancelledDesc"),
      count: data.recentlyCancelled,
      href: "/initiatives?filter=recently_cancelled",
      sev: "neutral",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {signals.map((s, i) => (
        <SignalRow key={i} signal={s} />
      ))}
    </div>
  );
}
