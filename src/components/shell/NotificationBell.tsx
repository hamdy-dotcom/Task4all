"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, X, CheckCheck } from "lucide-react";
import { markNotificationRead, markAllRead } from "@/app/(app)/notifications/actions";

type ItemType = "initiative" | "task" | "subtask" | null;

export interface BellNotification {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  work_item_id: string | null;
  meeting_id: string | null;
  item_type: ItemType;
}

interface Props {
  unreadCount: number;
  notifications: BellNotification[];
  isMobile?: boolean;
}

const ITEM_PATHS: Record<string, string> = {
  initiative: "initiatives",
  task: "tasks",
  subtask: "subtasks",
};


export default function NotificationBell({
  unreadCount,
  notifications,
  isMobile = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");

  function formatTimeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return tCommon("justNow");
    if (mins < 60) return tCommon("minutesAgo", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return tCommon("hoursAgo", { n: hrs });
    return tCommon("daysAgo", { n: Math.floor(hrs / 24) });
  }

  const buttonSize = isMobile ? 44 : 52;

  function handleClickItem(notif: BellNotification) {
    setOpen(false);
    startTransition(async () => {
      if (!notif.is_read) await markNotificationRead(notif.id);
      if (notif.meeting_id) {
        router.push(`/meetings/${notif.meeting_id}`);
      } else if (notif.work_item_id && notif.item_type) {
        router.push(`/${ITEM_PATHS[notif.item_type]}/${notif.work_item_id}`);
      } else {
        router.push("/notifications");
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllRead();
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: "999px",
          border: "none",
          background: "var(--color-surface-inner)",
          cursor: "pointer",
        }}
        aria-label={unreadCount > 0 ? `${unreadCount} ${t("unreadNotifications")}` : t("title")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell
          size={isMobile ? 18 : 20}
          color="var(--color-ink-900)"
          strokeWidth={1.75}
        />
      </button>

      {unreadCount > 0 && (
        <span
          className="absolute pointer-events-none"
          style={{
            width: 8,
            height: 8,
            borderRadius: "999px",
            background: "var(--color-nml)",
            top: isMobile ? 8 : 10,
            insetInlineEnd: isMobile ? 8 : 12,
            border: "1.5px solid var(--color-canvas)",
          }}
          aria-hidden="true"
        />
      )}

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown panel — anchored to inline-end so it aligns correctly in both directions */}
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("title")}
            className="absolute z-50"
            style={{
              top: buttonSize + 8,
              insetInlineEnd: 0,
              width: 360,
              maxHeight: 480,
              borderRadius: 12,
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-overlay)",
              border: "1px solid var(--color-surface-inner)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center"
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid var(--color-surface-inner)",
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-ink-900)",
                }}
              >
                {t("title")}
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginInlineStart: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      background: "var(--color-nml)",
                      borderRadius: 999,
                      padding: "2px 7px",
                      verticalAlign: "middle",
                    }}
                  >
                    <bdi>{unreadCount}</bdi>
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  title={t("markAllRead")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--color-ink-400)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: 6,
                  }}
                >
                  <CheckCheck size={14} />
                  {t("markAllRead")}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--color-ink-400)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Notification list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--color-ink-400)",
                    fontSize: 14,
                  }}
                >
                  {t("empty")}
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    disabled={isPending}
                    style={{
                      display: "flex",
                      width: "100%",
                      textAlign: "start",
                      padding: "12px 16px",
                      gap: 10,
                      background: n.is_read
                        ? "transparent"
                        : "var(--color-surface-sunken)",
                      border: "none",
                      borderBottom: "1px solid var(--color-surface-inner)",
                      cursor: "pointer",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Unread dot */}
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: n.is_read
                          ? "transparent"
                          : "var(--color-nml)",
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: n.is_read ? 400 : 600,
                          color: "var(--color-ink-900)",
                          lineHeight: 1.4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                            color: "var(--color-ink-400)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {n.body}
                        </p>
                      )}
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          color: "var(--color-ink-300)",
                        }}
                      >
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid var(--color-surface-inner)",
                textAlign: "center",
              }}
            >
              <a
                href="/notifications"
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 13,
                  color: "var(--color-nml)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {t("seeAll")}
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
