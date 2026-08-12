import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllRead } from "./actions";

const PAGE_SIZE = 25;

const ITEM_PATHS: Record<string, string> = {
  initiative: "initiatives",
  task: "tasks",
  subtask: "subtasks",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;

  const t = await getTranslations("notifications");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications, count } = await supabase
    .from("notifications")
    .select(
      "id, title, body, is_read, created_at, work_item_id, type, work_items(type)",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasUnread = (notifications ?? []).some((n) => !n.is_read);

  function buildUrl(n: {
    work_item_id: string | null;
    work_items: { type?: string } | null;
  }): string | null {
    if (!n.work_item_id || !n.work_items?.type) return null;
    const seg = ITEM_PATHS[n.work_items.type];
    return seg ? `/${seg}/${n.work_item_id}` : null;
  }

  const markRead = markNotificationRead;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="flex items-center" style={{ marginBottom: 24, gap: 12 }}>
        <h1
          style={{
            flex: 1,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            margin: 0,
          }}
        >
          {t("title")}
        </h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button
              type="submit"
              style={{
                fontSize: 13,
                color: "var(--color-nml)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {t("markAllRead")}
            </button>
          </form>
        )}
      </div>

      {!notifications || notifications.length === 0 ? (
        <p style={{ color: "var(--color-ink-400)", fontSize: 14 }}>
          {t("empty")}
        </p>
      ) : (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid var(--color-surface-inner)",
            overflow: "hidden",
          }}
        >
          {notifications.map((n) => {
            const url = buildUrl(n as Parameters<typeof buildUrl>[0]);
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--color-surface-inner)",
                  background: n.is_read
                    ? "var(--color-surface)"
                    : "var(--color-surface-sunken)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: n.is_read ? "transparent" : "var(--color-nml)",
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: n.is_read ? 400 : 600,
                      color: "var(--color-ink-900)",
                      lineHeight: 1.4,
                    }}
                  >
                    {url ? (
                      <a
                        href={url}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                  </p>
                  {n.body && (
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: 13,
                        color: "var(--color-ink-400)",
                      }}
                    >
                      {n.body}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 12,
                      color: "var(--color-ink-300)",
                    }}
                  >
                    {new Date(n.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!n.is_read && (
                  <form action={markRead.bind(null, n.id)}>
                    <button
                      type="submit"
                      title={t("markAsRead")}
                      style={{
                        fontSize: 12,
                        color: "var(--color-ink-300)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: "2px 6px",
                      }}
                    >
                      {t("done")}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div
          className="flex items-center justify-center"
          style={{ marginTop: 24, gap: 12 }}
        >
          {page > 1 && (
            <a
              href={`/notifications?page=${page - 1}`}
              style={{ fontSize: 13, color: "var(--color-nml)", textDecoration: "none" }}
            >
              {t("previous")}
            </a>
          )}
          <span style={{ fontSize: 13, color: "var(--color-ink-400)" }}>
            {t("pageOf", { page, total: totalPages })}
          </span>
          {page < totalPages && (
            <a
              href={`/notifications?page=${page + 1}`}
              style={{ fontSize: 13, color: "var(--color-nml)", textDecoration: "none" }}
            >
              {t("next")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
