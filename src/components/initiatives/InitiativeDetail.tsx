"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  CheckSquare,
  ClipboardList,
  Users,
} from "lucide-react";
import type { FileItemProp, HistoryEntryProp } from "@/components/work-item/types";
import FilesTab from "@/components/work-item/FilesTab";
import HistoryTab from "@/components/work-item/HistoryTab";
import StatusPill from "@/components/ui/StatusPill";
import ProgressBar from "@/components/ui/ProgressBar";
import ApprovalPill from "@/components/ui/ApprovalPill";
import { Num } from "@/components/ui/Num";
import {
  approveInitiative,
  rejectInitiative,
  type ApproveInitiativeState,
  type RejectInitiativeState,
} from "@/app/(app)/initiatives/actions";

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

interface Initiative {
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
  description: string | null;
  description_ar?: string | null;
  start_date: string | null;
  due_date: string | null;
  created_by_name: string | null;
  team_name: string | null;
  parent_title: string | null;
  parent_id: string | null;
  rejection_reason: string | null;
}

interface Task {
  id: string | null;
  title: string | null;
  status: WorkStatus | null;
  progress: number | null;
  created_by_name: string | null;
  due_date: string | null;
}

interface Assignee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
}

interface InitiativeDetailProps {
  initiative: Initiative;
  tasks: Task[];
  assignees: Assignee[];
  isSuperAdmin: boolean;
  files: FileItemProp[];
  historyEntries: HistoryEntryProp[];
  historyTotal: number;
  currentUserId: string;
  canUpload: boolean;
  approveAction: (
    prevState: ApproveInitiativeState,
    formData: FormData
  ) => Promise<ApproveInitiativeState>;
  rejectAction: (
    prevState: RejectInitiativeState,
    formData: FormData
  ) => Promise<RejectInitiativeState>;
}

type TabKey = "details" | "tasks" | "files" | "history";

export default function InitiativeDetail({
  initiative,
  tasks,
  assignees,
  isSuperAdmin,
  files,
  historyEntries,
  historyTotal,
  currentUserId,
  canUpload,
  approveAction,
  rejectAction,
}: InitiativeDetailProps) {
  const t = useTranslations("initiatives");
  const tCommon = useTranslations("common");
  const tApprovals = useTranslations("approvals");
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [approvalPanel, setApprovalPanel] = useState<
    "idle" | "approve" | "reject"
  >("idle");

  const [approveState, doApprove, isApproving] = useActionState<
    ApproveInitiativeState,
    FormData
  >(approveAction, null);

  const [rejectState, doReject, isRejecting] = useActionState<
    RejectInitiativeState,
    FormData
  >(rejectAction, null);

  const showApprovalActions =
    isSuperAdmin && initiative.approval_status === "pending";

  const TABS: { key: TabKey; label: string }[] = [
    { key: "details", label: t("detail.details") },
    { key: "tasks", label: t("detail.tasks") },
    { key: "files", label: t("detail.files") },
    { key: "history", label: t("detail.history") },
  ];

  const displayTitle =
    locale === "ar" && initiative.title_ar
      ? initiative.title_ar
      : initiative.title;

  const displayDescription =
    locale === "ar" && initiative.description_ar
      ? initiative.description_ar
      : initiative.description;

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(
          locale === "ar" ? "ar-u-nu-latn" : "en-GB",
          { day: "numeric", month: "short", year: "numeric" }
        )
      : "—";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          className="flex items-start flex-wrap"
          style={{ gap: 10, marginBottom: 10 }}
        >
          <h1
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 24,
              fontWeight: 600,
              lineHeight: "30px",
              color: "var(--color-ink-900)",
            }}
          >
            {displayTitle}
          </h1>
          <div className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
            {initiative.classification && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: "var(--color-ink-100)",
                  color: "var(--color-ink-600)",
                }}
              >
                {CLASSIFICATION_LABELS[initiative.classification]}
              </span>
            )}
            {initiative.status && <StatusPill status={initiative.status} />}
            {initiative.approval_status && (
              <ApprovalPill status={initiative.approval_status} />
            )}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <ProgressBar progress={initiative.progress ?? 0} />
        </div>

        {/* Meta */}
        <div
          className="flex flex-wrap"
          style={{
            gap: 20,
            fontSize: 13,
            lineHeight: "18px",
            color: "var(--color-ink-600)",
          }}
        >
          {initiative.parent_title && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>
                {t("detail.northStarOf")}{" "}
              </span>
              <Link
                href="/north-star"
                style={{
                  color: "var(--color-nml)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {initiative.parent_title}
              </Link>
            </span>
          )}
          {initiative.priority && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>
                {t("detail.priorityOf")}{" "}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: PRIORITY_COLORS[initiative.priority],
                  textTransform: "capitalize",
                }}
              >
                {initiative.priority}
              </span>
            </span>
          )}
          {initiative.created_by_name && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>
                {t("detail.ownerOf")}{" "}
              </span>
              {initiative.created_by_name}
            </span>
          )}
          <span>
            <span style={{ color: "var(--color-ink-400)" }}>
              {t("detail.dueOf")}{" "}
            </span>
            {fmt(initiative.due_date)}
          </span>
        </div>

        {/* Rejection reason banner */}
        {initiative.rejection_reason && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 16px",
              borderRadius: "var(--radius-row)",
              background: "var(--color-crit-soft)",
              color: "var(--color-crit)",
              fontSize: 14,
              lineHeight: "20px",
            }}
          >
            <strong>{t("detail.approvalRejected")}: </strong>
            {initiative.rejection_reason}
          </div>
        )}
      </div>

      {/* Approval actions (super_admin only, pending only) */}
      {showApprovalActions && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: "var(--radius-inner)",
            background: "var(--color-warn-soft)",
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-warn)",
              marginBottom: 12,
            }}
          >
            {tApprovals("initPendingApproval")}
          </p>

          {approvalPanel === "idle" && (
            <div className="flex items-center" style={{ gap: 10 }}>
              <button
                onClick={() => setApprovalPanel("approve")}
                style={{
                  height: 44,
                  padding: "0 20px",
                  borderRadius: "999px",
                  border: "none",
                  background: "var(--color-nml)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tApprovals("approve")}
              </button>
              <button
                onClick={() => setApprovalPanel("reject")}
                style={{
                  height: 44,
                  padding: "0 20px",
                  borderRadius: "999px",
                  border: "none",
                  background: "var(--color-crit-soft)",
                  color: "var(--color-crit)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tApprovals("reject")}
              </button>
            </div>
          )}

          {approvalPanel === "approve" && (
            <form
              action={doApprove}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {approveState?.error && (
                <p style={{ fontSize: 13, color: "var(--color-crit)" }}>
                  {approveState.error}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="priority"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-ink-700)",
                  }}
                >
                  {tApprovals("setPriority")}{" "}
                  <span style={{ color: "var(--color-crit)" }}>*</span>
                </label>
                <select
                  id="priority"
                  name="priority"
                  required
                  defaultValue=""
                  style={{
                    height: 44,
                    padding: "0 16px",
                    borderRadius: "var(--radius-input)",
                    border: "1px solid var(--color-ink-200)",
                    background: "var(--color-surface)",
                    fontSize: 14,
                    color: "var(--color-ink-900)",
                    outline: "none",
                    width: "100%",
                    maxWidth: 280,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="" disabled>
                    {tCommon("selectPriority")}
                  </option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button
                  type="submit"
                  disabled={isApproving}
                  style={{
                    height: 44,
                    padding: "0 20px",
                    borderRadius: "999px",
                    border: "none",
                    background: isApproving
                      ? "var(--color-ink-300)"
                      : "var(--color-nml)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isApproving ? "not-allowed" : "pointer",
                  }}
                >
                  {isApproving
                    ? tApprovals("approving")
                    : tApprovals("confirmApproval")}
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalPanel("idle")}
                  style={{
                    height: 44,
                    padding: "0 16px",
                    borderRadius: "999px",
                    border: "none",
                    background: "var(--color-ink-100)",
                    color: "var(--color-ink-700)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}

          {approvalPanel === "reject" && (
            <form
              action={doReject}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {rejectState?.error && (
                <p style={{ fontSize: 13, color: "var(--color-crit)" }}>
                  {rejectState.error}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="rejection_reason"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-ink-700)",
                  }}
                >
                  {tApprovals("rejectionReason")}{" "}
                  <span style={{ color: "var(--color-crit)" }}>*</span>
                </label>
                <textarea
                  id="rejection_reason"
                  name="rejection_reason"
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder={tApprovals("explanationInitiative")}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-input)",
                    border: "1px solid var(--color-ink-200)",
                    background: "var(--color-surface)",
                    fontSize: 14,
                    lineHeight: "20px",
                    color: "var(--color-ink-900)",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit",
                    maxWidth: 480,
                  }}
                />
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button
                  type="submit"
                  disabled={isRejecting}
                  style={{
                    height: 44,
                    padding: "0 20px",
                    borderRadius: "999px",
                    border: "none",
                    background: isRejecting
                      ? "var(--color-ink-300)"
                      : "var(--color-crit-soft)",
                    color: isRejecting ? "#fff" : "var(--color-crit)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isRejecting ? "not-allowed" : "pointer",
                  }}
                >
                  {isRejecting
                    ? tApprovals("rejecting")
                    : tApprovals("confirmRejection")}
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalPanel("idle")}
                  style={{
                    height: 44,
                    padding: "0 16px",
                    borderRadius: "999px",
                    border: "none",
                    background: "var(--color-ink-100)",
                    color: "var(--color-ink-700)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "inline-flex",
          background: "var(--color-ink-100)",
          borderRadius: "999px",
          padding: 4,
          gap: 2,
          marginBottom: 20,
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              background:
                activeTab === key ? "var(--color-ink-900)" : "transparent",
              color: activeTab === key ? "#fff" : "var(--color-ink-700)",
              transition: "background 150ms, color 150ms",
              whiteSpace: "nowrap",
            }}
          >
            {label}
            {key === "tasks" && tasks.length > 0 && (
              <span
                style={{
                  marginInlineStart: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    activeTab === key
                      ? "rgba(255,255,255,.2)"
                      : "var(--color-ink-200)",
                  color: activeTab === key ? "#fff" : "var(--color-ink-600)",
                  padding: "1px 6px",
                  borderRadius: "999px",
                }}
              >
                <Num>{tasks.length}</Num>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {activeTab === "details" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {displayDescription ? (
            <div
              style={{
                padding: 20,
                borderRadius: "var(--radius-inner)",
                background: "var(--color-surface-inner)",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--color-ink-600)",
                  marginBottom: 8,
                }}
              >
                {tCommon("description")}
              </p>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: "22px",
                  color: "var(--color-ink-900)",
                }}
              >
                {displayDescription}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
              {tCommon("noDescriptionProvided")}
            </p>
          )}

          {assignees.length > 0 && (
            <div
              style={{
                padding: 20,
                borderRadius: "var(--radius-inner)",
                background: "var(--color-surface-inner)",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--color-ink-600)",
                  marginBottom: 12,
                }}
              >
                {tCommon("assignees")}
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {assignees.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center"
                    style={{ gap: 10 }}
                  >
                    {a.avatar_url ? (
                      <img
                        src={a.avatar_url}
                        alt={a.full_name}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "999px",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "999px",
                          background: "var(--color-ink-200)",
                          flexShrink: 0,
                        }}
                      >
                        <Users size={14} color="var(--color-ink-600)" />
                      </div>
                    )}
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          lineHeight: "18px",
                          color: "var(--color-ink-900)",
                        }}
                      >
                        {a.full_name}
                      </p>
                      {a.title && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--color-ink-400)",
                          }}
                        >
                          {a.title}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { label: tCommon("owner"), value: initiative.created_by_name ?? "—" },
              { label: tCommon("team"), value: initiative.team_name ?? "—" },
              {
                label: tCommon("priority"),
                value: initiative.priority
                  ? initiative.priority.charAt(0).toUpperCase() +
                    initiative.priority.slice(1)
                  : tCommon("notSet"),
              },
              {
                label: t("form.classification"),
                value: initiative.classification
                  ? (CLASSIFICATION_LABELS[initiative.classification] ?? "—")
                  : "—",
              },
              { label: tCommon("startDate"), value: fmt(initiative.start_date) },
              { label: tCommon("dueDate"), value: fmt(initiative.due_date) },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-inner)",
                  background: "var(--color-surface-inner)",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-400)",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-ink-900)",
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === "tasks" && (
        <div>
          {tasks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ minHeight: 200, gap: 12 }}
            >
              <ClipboardList
                size={40}
                strokeWidth={1.25}
                color="var(--color-ink-300)"
              />
              <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
                {t("detail.noTasks")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "files" && (
        <FilesTab
          files={files}
          workItemId={initiative.id ?? ""}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
          canUpload={canUpload}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          entries={historyEntries}
          total={historyTotal}
          workItemId={initiative.id ?? ""}
        />
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString(
        locale === "ar" ? "ar-u-nu-latn" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : null;

  return (
    <Link
      href={`/tasks/${task.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        className="flex items-center row-hover"
        style={{
          borderRadius: "var(--radius-row)",
          padding: "12px 16px",
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
            background: "var(--color-chart-2)",
          }}
        >
          <CheckSquare size={18} color="#fff" strokeWidth={1.75} />
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
            {task.title}
          </p>
          {(task.created_by_name || dueLabel) && (
            <p
              style={{
                marginTop: 2,
                fontSize: 13,
                color: "var(--color-ink-400)",
              }}
            >
              {[
                task.created_by_name,
                dueLabel ? tCommon("due", { date: dueLabel }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div
          className="shrink-0 flex flex-col items-end"
          style={{ gap: 6, minWidth: 130 }}
        >
          {task.status && <StatusPill status={task.status} />}
          <div style={{ width: 130 }}>
            <ProgressBar progress={task.progress ?? 0} />
          </div>
        </div>
      </div>
    </Link>
  );
}
