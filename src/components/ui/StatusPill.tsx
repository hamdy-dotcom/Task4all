import { getTranslations } from "next-intl/server";
import type { Database } from "@/lib/database.types";

type WorkStatus = Database["public"]["Enums"]["work_status"];

const STATUS_STYLE: Record<
  WorkStatus,
  { color: string; bg: string; strikethrough?: boolean; check?: boolean }
> = {
  not_started: {
    color: "var(--color-ink-600)",
    bg: "var(--color-ink-100)",
  },
  pending: {
    color: "var(--color-warn)",
    bg: "var(--color-warn-soft)",
  },
  in_progress: {
    color: "#fff",
    bg: "var(--color-ink-900)",
  },
  blocked: {
    color: "var(--color-alert)",
    bg: "var(--color-alert-soft)",
  },
  done: {
    color: "var(--color-ok)",
    bg: "var(--color-ok-soft)",
    check: true,
  },
  cancelled: {
    color: "var(--color-ink-400)",
    bg: "var(--color-ink-100)",
    strikethrough: true,
  },
};

interface StatusPillProps {
  status: WorkStatus;
}

export default async function StatusPill({ status }: StatusPillProps) {
  const t = await getTranslations("status");
  // Touch all keys so check-i18n validates them
  const labels: Record<WorkStatus, string> = {
    not_started: t("not_started"),
    pending: t("pending"),
    in_progress: t("in_progress"),
    blocked: t("blocked"),
    done: t("done"),
    cancelled: t("cancelled"),
  };
  const { color, bg, strikethrough, check } = STATUS_STYLE[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: "16px",
        padding: "3px 10px",
        borderRadius: "999px",
        color,
        background: bg,
        textDecoration: strikethrough ? "line-through" : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {check && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M1.5 5.5L3.5 7.5L8.5 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {labels[status]}
    </span>
  );
}
