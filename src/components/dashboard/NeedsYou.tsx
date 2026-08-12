import Link from "next/link";
import React from "react";
import { getTranslations, getLocale } from "next-intl/server";

export interface NeedsYouItem {
  id: string;
  title: string;
  type: string;
  status: string;
  approvalStatus?: string;
  dueDate?: string | null;
  daysWaiting?: number;
  href: string;
}

const TYPE_COLORS: Record<string, string> = {
  objective: "var(--color-ink-900)",
  initiative: "var(--color-nml)",
  task: "var(--color-chart-2)",
  subtask: "var(--color-ink-300)",
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "var(--color-warn-soft)",  text: "var(--color-warn)" },
  in_progress: { bg: "var(--color-ink-900)",    text: "#fff" },
  blocked:     { bg: "var(--color-alert-soft)", text: "var(--color-alert)" },
  not_started: { bg: "var(--color-ink-100)",    text: "var(--color-ink-600)" },
  done:        { bg: "var(--color-ok-soft)",    text: "var(--color-ok)" },
};

type DT = (key: string, values?: Record<string, string | number>) => string;

function formatDue(iso: string | null | undefined, dt: DT): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0)  return dt("daysOverdue", { n: Math.abs(diff) });
  if (diff === 0) return dt("dueToday");
  if (diff === 1) return dt("dueTomorrow");
  return dt("dueIn", { n: diff });
}

interface RowProps {
  item: NeedsYouItem;
  dt: DT;
  statusLabel: (s: string) => string;
}

function ItemRow({ item, dt, statusLabel }: RowProps) {
  const sty = STATUS_STYLE[item.status] ?? STATUS_STYLE.not_started;
  const isOverdue = item.dueDate && new Date(item.dueDate).getTime() < Date.now();
  const daysOver5 = (item.daysWaiting ?? 0) > 5;

  return (
    <Link
      href={item.href}
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
      {/* Type badge */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: TYPE_COLORS[item.type] ?? "var(--color-ink-300)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          {item.type === "initiative" ? (
            <path d="M8 2L2 14h12L8 2z" fill="#fff" fillOpacity={0.9} />
          ) : item.type === "task" ? (
            <path
              d="M3 8l3 3 7-7"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <circle cx={8} cy={8} r={3} fill="#fff" />
          )}
        </svg>
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-ink-900)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 3,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {item.daysWaiting !== undefined && (
            <span
              style={{
                fontSize: 12,
                color: daysOver5 ? "var(--color-crit)" : "var(--color-ink-400)",
                fontWeight: daysOver5 ? 600 : 400,
              }}
            >
              {/* <bdi> isolates the numeral so it stays LTR inside RTL context */}
              <bdi>{dt("daysWaiting", { n: item.daysWaiting })}</bdi>
            </span>
          )}
          {item.dueDate && (
            <span
              style={{
                fontSize: 12,
                color: isOverdue ? "var(--color-crit)" : "var(--color-ink-400)",
                fontWeight: isOverdue ? 600 : 400,
              }}
            >
              {formatDue(item.dueDate, dt)}
            </span>
          )}
        </div>
      </div>

      {/* Status pill */}
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 999,
          background: sty.bg,
          color: sty.text,
          fontSize: 12,
          fontWeight: 500,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {statusLabel(item.status)}
      </span>
    </Link>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 0",
        gap: 8,
      }}
    >
      <svg
        width={40}
        height={40}
        viewBox="0 0 40 40"
        fill="none"
        style={{ color: "var(--color-ink-300)" }}
      >
        <circle cx={20} cy={20} r={16} stroke="currentColor" strokeWidth={1.5} />
        <path
          d="M20 13v8M20 27h.01"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--color-ink-900)" }}>
        {title}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--color-ink-400)",
          textAlign: "center",
          maxWidth: 220,
        }}
      >
        {message}
      </p>
    </div>
  );
}

export async function NeedsYou({
  items,
  emptyMessage,
}: {
  title: string;
  items: NeedsYouItem[];
  emptyMessage: string;
}) {
  const [td, ts] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("status"),
  ]);

  const dt: DT = (key, values) =>
    td(key as Parameters<typeof td>[0], values as never);

  const statusLabel = (s: string): string => {
    try { return ts(s as Parameters<typeof ts>[0]); } catch { return s; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.length === 0 ? (
        <EmptyState title={td("allClear")} message={emptyMessage} />
      ) : (
        items.map((item) => (
          <ItemRow key={item.id} item={item} dt={dt} statusLabel={statusLabel} />
        ))
      )}
    </div>
  );
}
