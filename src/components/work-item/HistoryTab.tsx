"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HistoryEntryProp } from "./types";
import { loadMoreHistory } from "@/app/(app)/work-items/history-actions";
import { Num } from "@/components/ui/Num";

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  pending: "Pending",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

function formatStatus(s: string | null): string | null {
  if (!s) return null;
  return STATUS_LABELS[s] ?? s.replace(/_/g, " ");
}

function fmt(d: string | null): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function describeEntry(entry: HistoryEntryProp): string {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;

  switch (entry.action) {
    case "created":
      return "created this";

    case "status_changed": {
      const from = formatStatus(entry.old_value);
      const to = formatStatus(entry.new_value);
      if (from && to) return `changed status from ${from} to ${to}`;
      if (to) return `changed status to ${to}`;
      return "changed the status";
    }

    case "approved": {
      const priority = meta.priority as string | undefined;
      return priority
        ? `approved this with ${priority} priority`
        : "approved this";
    }

    case "rejected": {
      const reason = meta.reason as string | undefined;
      return reason ? `rejected this — "${reason}"` : "rejected this";
    }

    case "pending":
      return "sent this for review";

    case "assigned": {
      const name = (entry.new_value ?? (meta.assignee_name as string)) || null;
      return name ? `assigned ${name}` : "added an assignee";
    }

    case "unassigned": {
      const name = (entry.old_value ?? (meta.assignee_name as string)) || null;
      return name ? `removed ${name}` : "removed an assignee";
    }

    case "attachment_added": {
      const name = entry.new_value ?? (meta.file_name as string) ?? "a file";
      return `uploaded ${name}`;
    }

    case "attachment_removed": {
      const name = entry.old_value ?? (meta.file_name as string) ?? "a file";
      return `removed ${name}`;
    }

    case "updated": {
      switch (entry.field) {
        case "title":
          return "updated the title";
        case "description":
          return "edited the description";
        case "due_date": {
          const d = fmt(entry.new_value);
          return d ? `changed due date to ${d}` : "removed the due date";
        }
        case "start_date": {
          const d = fmt(entry.new_value);
          return d ? `changed start date to ${d}` : "removed the start date";
        }
        case "classification":
          return entry.new_value
            ? `changed classification to ${entry.new_value.replace(/_/g, " ")}`
            : "changed classification";
        case "status": {
          const from = formatStatus(entry.old_value);
          const to = formatStatus(entry.new_value);
          if (from && to) return `changed status from ${from} to ${to}`;
          return to ? `changed status to ${to}` : "changed status";
        }
        case "priority":
          return entry.new_value ? `set priority to ${entry.new_value}` : "changed priority";
        default: {
          const label = entry.field?.replace(/_/g, " ") ?? "a field";
          return `updated ${label}`;
        }
      }
    }

    default:
      return entry.action.replace(/_/g, " ");
  }
}

type TFn = (key: string, values?: Record<string, string | number>) => string;

function formatRelative(dateStr: string, t: TFn): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (secs < 60) return t("justNow");
  if (mins < 60) return t("minutesAgo", { n: mins });
  if (hours < 24) return t("hoursAgo", { n: hours });
  if (days < 7) return t("daysAgo", { n: days });
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatExact(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        width: 32, height: 32, borderRadius: "999px",
        background: "var(--color-ink-200)",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-600)" }}>
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── HistoryTab ───────────────────────────────────────────────────────────────

interface HistoryTabProps {
  entries: HistoryEntryProp[];
  total: number;
  workItemId: string;
}

export default function HistoryTab({ entries: initial, total, workItemId }: HistoryTabProps) {
  const t = useTranslations("common");
  const tFn: TFn = (key, values) => t(key as Parameters<typeof t>[0], values as Parameters<typeof t>[1]);

  const [entries, setEntries] = useState<HistoryEntryProp[]>(initial);
  const [loading, setLoading] = useState(false);

  const hasMore = entries.length < total;

  async function loadMore() {
    if (entries.length === 0) return;
    const cursor = entries[entries.length - 1].created_at;
    setLoading(true);
    try {
      const more = await loadMoreHistory(workItemId, cursor);
      setEntries((prev) => [...prev, ...more]);
    } finally {
      setLoading(false);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 180, gap: 12 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-300)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink-900)" }}>{t("noHistory")}</p>
        <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
          {t("historyLogged")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        const sentence = describeEntry(entry);
        const actorName = entry.actor_name ?? t("system");

        return (
          <div key={entry.id} className="flex" style={{ gap: 12 }}>
            {/* Inline-start: avatar + connecting line */}
            <div className="flex flex-col items-center" style={{ flexShrink: 0, paddingTop: 2 }}>
              <Avatar name={entry.actor_name} avatarUrl={entry.actor_avatar} />
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: "var(--color-ink-200)",
                    marginBlock: 4,
                    minHeight: 20,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20, paddingTop: 4 }}>
              <p style={{ fontSize: 14, color: "var(--color-ink-900)", lineHeight: "20px" }}>
                <span style={{ fontWeight: 500 }}>{actorName}</span>{" "}
                <span style={{ color: "var(--color-ink-600)" }}>{sentence}</span>
              </p>

              <p
                title={formatExact(entry.created_at)}
                style={{ fontSize: 12, color: "var(--color-ink-400)", marginTop: 3, cursor: "default" }}
              >
                {formatRelative(entry.created_at, tFn)}
              </p>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div style={{ paddingTop: 16, display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            style={{
              fontSize: 13, fontWeight: 500,
              color: "var(--color-ink-600)",
              background: "var(--color-ink-100)",
              border: "none",
              borderRadius: "999px",
              padding: "6px 20px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? t("loading")
              : t("loadMore", { n: total - entries.length })}
          </button>
        </div>
      )}
    </div>
  );
}
