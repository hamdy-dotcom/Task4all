import Link from "next/link";
import { redirect } from "next/navigation";
import { Flag, Plus, ClipboardList } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Num } from "@/components/ui/Num";
import StatusPill from "@/components/ui/StatusPill";
import ApprovalPill from "@/components/ui/ApprovalPill";
import ProgressBar from "@/components/ui/ProgressBar";
import InitiativeFilters from "@/components/initiatives/InitiativeFilters";

interface Props {
  searchParams: Promise<{
    approval_status?: string;
  }>;
}

type WorkStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";
type ApprovalStatus = "pending" | "approved" | "rejected";
type PriorityLevel = "low" | "medium" | "high" | "critical";
type ClassificationType =
  | "product"
  | "service"
  | "project"
  | "experiment"
  | "stopgap"
  | "internal_capability"
  | "process";

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: "var(--color-ink-300)",
  medium: "var(--color-warn)",
  high: "var(--color-alert)",
  critical: "var(--color-crit)",
};

const CLASSIFICATION_LABELS: Record<ClassificationType, string> = {
  product: "Product",
  service: "Service",
  project: "Project",
  experiment: "Experiment",
  stopgap: "Stopgap",
  internal_capability: "Internal Capability",
  process: "Process",
};

export default async function InitiativesPage({ searchParams }: Props) {
  const { approval_status } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  const t = await getTranslations("initiatives");

  const validApproval = ["pending", "approved", "rejected"] as const;
  type ValidApproval = (typeof validApproval)[number];

  let query = supabase
    .from("v_work_item_tree")
    .select(
      "id, title, title_ar, status, approval_status, priority, progress, classification, is_continuous, child_count, done_child_count, parent_title, created_by_name, due_date, team_name"
    )
    .eq("type", "initiative")
    .order("created_at", { ascending: false });

  if (
    approval_status &&
    (validApproval as readonly string[]).includes(approval_status)
  ) {
    query = query.eq("approval_status", approval_status as ValidApproval);
  }

  const { data: initiatives } = await query;
  const list = initiatives ?? [];

  return (
    <div>
      <div
        className="flex items-center flex-wrap"
        style={{ marginBottom: 20, gap: 12 }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            lineHeight: "26px",
            color: "var(--color-ink-900)",
          }}
        >
          {t("title")}
        </h2>

        {list.length > 0 && (
          <span
            className="flex items-center justify-center tnum"
            style={{
              width: 24,
              height: 24,
              borderRadius: "999px",
              background: "var(--color-ink-100)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-ink-600)",
            }}
          >
            <Num>{list.length}</Num>
          </span>
        )}

        <InitiativeFilters currentApproval={approval_status ?? ""} />

        {isAdmin && (
          <Link
            href="/initiatives/new"
            className="flex items-center btn-nml"
            style={{
              marginInlineStart: "auto",
              height: 44,
              padding: "0 20px",
              borderRadius: "999px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              gap: 8,
            }}
          >
            <Plus size={18} />
            {t("newInitiative")}
          </Link>
        )}
      </div>

      {list.length === 0 && (
        <div
          className="flex flex-col items-center justify-center"
          style={{ minHeight: 320, gap: 16 }}
        >
          <ClipboardList
            size={48}
            strokeWidth={1.25}
            color="var(--color-ink-300)"
          />
          <div style={{ textAlign: "center" }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--color-ink-900)",
              }}
            >
              {t("noInitiatives")}
            </h3>
            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "var(--color-ink-400)",
                maxWidth: 280,
              }}
            >
              {approval_status ? t("filteredEmpty") : t("intro")}
            </p>
          </div>
          {isAdmin && !approval_status && (
            <Link
              href="/initiatives/new"
              className="flex items-center"
              style={{
                marginTop: 4,
                height: 44,
                padding: "0 24px",
                borderRadius: "999px",
                background: "var(--color-nml)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                gap: 8,
              }}
            >
              <Plus size={18} />
              {t("newInitiative")}
            </Link>
          )}
        </div>
      )}

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((item) => (
            <InitiativeRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

type InitiativeItem = {
  id: string | null;
  title: string | null;
  title_ar?: string | null;
  status: WorkStatus | null;
  approval_status: ApprovalStatus | null;
  priority: PriorityLevel | null;
  progress: number | null;
  classification: ClassificationType | null;
  is_continuous: boolean | null;
  child_count: number | null;
  done_child_count: number | null;
  parent_title: string | null;
  created_by_name: string | null;
  due_date: string | null;
};

async function InitiativeRow({ item }: { item: InitiativeItem }) {
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const displayTitle =
    locale === "ar" && item.title_ar ? item.title_ar : item.title;

  const dueLabel = item.due_date
    ? new Date(item.due_date).toLocaleDateString(
        locale === "ar" ? "ar-u-nu-latn" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : null;

  const meta = [
    item.parent_title,
    item.created_by_name,
    dueLabel ? tCommon("due", { date: dueLabel }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/initiatives/${item.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{ position: "relative" }}>
        {item.priority && (
          <div
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: "999px",
              background: PRIORITY_COLORS[item.priority],
              zIndex: 1,
            }}
          />
        )}

        <div
          className="flex items-center row-hover"
          style={{
            borderRadius: "var(--radius-row)",
            padding: item.priority ? "12px 16px 12px 20px" : "12px 16px",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: "999px",
              background: "var(--color-nml)",
            }}
          >
            <Flag size={18} color="#fff" strokeWidth={1.75} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              className="truncate"
              style={{
                fontSize: 16,
                fontWeight: 600,
                lineHeight: "22px",
                color: "var(--color-ink-900)",
              }}
            >
              {displayTitle}
            </p>
            {meta && (
              <p
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  color: "var(--color-ink-400)",
                }}
              >
                {meta}
              </p>
            )}
          </div>

          {item.classification && (
            <span
              className="shrink-0"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "var(--color-ink-100)",
                color: "var(--color-ink-600)",
              }}
            >
              {CLASSIFICATION_LABELS[item.classification]}
            </span>
          )}

          <div
            className="shrink-0 flex flex-col items-end"
            style={{ gap: 6, minWidth: 160 }}
          >
            <div className="flex items-center" style={{ gap: 6 }}>
              {item.status && <StatusPill status={item.status} />}
              {item.approval_status && (
                <ApprovalPill status={item.approval_status} />
              )}
            </div>
            <div style={{ width: 140 }}>
              <ProgressBar progress={item.progress ?? 0} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
