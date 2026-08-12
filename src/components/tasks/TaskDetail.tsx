"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  CornerDownRight,
  ClipboardList,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { FileItemProp, HistoryEntryProp } from "@/components/work-item/types";
import FilesTab from "@/components/work-item/FilesTab";
import HistoryTab from "@/components/work-item/HistoryTab";
import StatusPill from "@/components/ui/StatusPill";
import ApprovalPill from "@/components/ui/ApprovalPill";
import ProgressBar from "@/components/ui/ProgressBar";
import { Num } from "@/components/ui/Num";
import {
  approveTask,
  rejectTask,
  updateTaskStatus,
  type ApproveTaskState,
  type RejectTaskState,
  type UpdateTaskStatusState,
} from "@/app/(app)/tasks/actions";

type WorkStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";
type ApprovalStatus = "pending" | "approved" | "rejected";
type PriorityLevel = "low" | "medium" | "high" | "critical";

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: "var(--color-ink-300)",
  medium: "var(--color-warn)",
  high: "var(--color-alert)",
  critical: "var(--color-crit)",
};

const VALID_STATUSES: WorkStatus[] = [
  "not_started",
  "pending",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
];

interface Task {
  id: string | null;
  title: string | null;
  title_ar: string | null;
  status: WorkStatus | null;
  approval_status: ApprovalStatus | null;
  priority: PriorityLevel | null;
  progress: number | null;
  child_count: number | null;
  done_child_count: number | null;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  created_by_name: string | null;
  team_name: string | null;
  parent_title: string | null;
  parent_title_ar: string | null;
  parent_id: string | null;
  rejection_reason: string | null;
}

interface Subtask {
  id: string | null;
  title: string | null;
  title_ar: string | null;
  status: WorkStatus | null;
  progress: number | null;
  milestone_count: number | null;
  milestone_done_count: number | null;
  created_by_name: string | null;
  due_date: string | null;
}

interface Assignee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
}

interface Blocker {
  child_id: string;
  child_title: string;
  detail: string;
}

interface TaskDetailProps {
  task: Task;
  subtasks: Subtask[];
  assignees: Assignee[];
  blockers: Blocker[];
  canChangeStatus: boolean;
  isApprover: boolean;
  isSuperAdmin: boolean;
  files: FileItemProp[];
  historyEntries: HistoryEntryProp[];
  historyTotal: number;
  currentUserId: string;
  canUpload: boolean;
  locale: string;
  approveAction: (
    prevState: ApproveTaskState,
    formData: FormData
  ) => Promise<ApproveTaskState>;
  rejectAction: (
    prevState: RejectTaskState,
    formData: FormData
  ) => Promise<RejectTaskState>;
  statusAction: (
    prevState: UpdateTaskStatusState,
    formData: FormData
  ) => Promise<UpdateTaskStatusState>;
}

type TabKey = "details" | "subtasks" | "files" | "history";

export default function TaskDetail({
  task,
  subtasks,
  assignees,
  blockers,
  canChangeStatus,
  isApprover,
  isSuperAdmin,
  files,
  historyEntries,
  historyTotal,
  currentUserId,
  canUpload,
  approveAction,
  rejectAction,
  statusAction,
  locale,
}: TaskDetailProps) {
  const t = useTranslations("tasks");
  const ta = useTranslations("approvals");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tp = useTranslations("priority");

  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [approvalPanel, setApprovalPanel] = useState<
    "idle" | "approve" | "reject"
  >("idle");

  const [approveState, doApprove, isApproving] = useActionState<
    ApproveTaskState,
    FormData
  >(approveAction, null);

  const [rejectState, doReject, isRejecting] = useActionState<
    RejectTaskState,
    FormData
  >(rejectAction, null);

  const [statusState, doStatus, isStatusPending] = useActionState<
    UpdateTaskStatusState,
    FormData
  >(statusAction, null);

  const hasDoneBlocker = blockers.length > 0;
  const showApprovalActions =
    isApprover && task.approval_status === "pending";

  const displayTitle =
    locale === "ar" && task.title_ar ? task.title_ar : (task.title ?? "");
  const displayParentTitle =
    locale === "ar" && task.parent_title_ar
      ? task.parent_title_ar
      : task.parent_title;

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const TABS: { key: TabKey; label: string }[] = [
    { key: "details", label: t("detail.details") },
    { key: "subtasks", label: t("detail.subtasks") },
    { key: "files", label: t("detail.files") },
    { key: "history", label: t("detail.history") },
  ];

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
            {task.status && <StatusPill status={task.status} />}
            {task.approval_status && (
              <ApprovalPill status={task.approval_status} />
            )}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <ProgressBar progress={task.progress ?? 0} />
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
          {displayParentTitle && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>
                {t("initiativeLabel")}{" "}
              </span>
              <Link
                href={`/initiatives/${task.parent_id}`}
                style={{
                  color: "var(--color-nml)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {displayParentTitle}
              </Link>
            </span>
          )}
          {task.priority && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>
                {t("priorityLabel")}{" "}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: PRIORITY_COLORS[task.priority],
                }}
              >
                {tp(task.priority)}
              </span>
            </span>
          )}
          {task.created_by_name && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>
                {t("ownerLabel")}{" "}
              </span>
              {task.created_by_name}
            </span>
          )}
          <span>
            <span style={{ color: "var(--color-ink-400)" }}>
              {t("dueLabel")}{" "}
            </span>
            {fmt(task.due_date)}
          </span>
        </div>

        {/* Rejection reason */}
        {task.rejection_reason && (
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
            <strong>{tc("rejectedLabel")} </strong>
            {task.rejection_reason}
          </div>
        )}
      </div>

      {/* Status control */}
      {canChangeStatus && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: "var(--radius-inner)",
            background: "var(--color-surface-inner)",
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-ink-700)",
              marginBottom: 12,
            }}
          >
            {t("updateStatus")}
          </p>

          <form action={doStatus}>
            <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <select
                name="status"
                defaultValue={task.status ?? "not_started"}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: "var(--radius-input)",
                  border: "1px solid var(--color-ink-200)",
                  background: "var(--color-surface)",
                  fontSize: 14,
                  color: "var(--color-ink-900)",
                  outline: "none",
                  minWidth: 180,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {VALID_STATUSES.map((s) => (
                  <option
                    key={s}
                    value={s}
                    disabled={s === "done" && hasDoneBlocker}
                  >
                    {ts(s)}
                    {s === "done" && hasDoneBlocker ? t("hasDoneBlocker") : ""}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isStatusPending}
                style={{
                  height: 44,
                  padding: "0 20px",
                  borderRadius: "999px",
                  border: "none",
                  background: isStatusPending
                    ? "var(--color-ink-300)"
                    : "var(--color-ink-900)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isStatusPending ? "not-allowed" : "pointer",
                  transition: "background 150ms",
                }}
              >
                {isStatusPending ? t("updating") : t("update")}
              </button>
            </div>

            {statusState?.error && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--color-crit)",
                }}
              >
                {statusState.error}
              </p>
            )}
          </form>

          {hasDoneBlocker && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                borderRadius: "var(--radius-row)",
                background: "var(--color-warn-soft)",
              }}
            >
              <div
                className="flex items-center"
                style={{ gap: 8, marginBottom: 8 }}
              >
                <AlertTriangle
                  size={16}
                  color="var(--color-warn)"
                  strokeWidth={1.75}
                />
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-warn)",
                  }}
                >
                  {t("cannotMarkDoneUntil")}
                </p>
              </div>
              <ul
                style={{
                  paddingInlineStart: 20,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {blockers.map((b) => (
                  <li
                    key={b.child_id}
                    style={{ fontSize: 13, color: "var(--color-ink-700)" }}
                  >
                    {b.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Approval actions */}
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
            {ta("taskPendingApproval")}
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
                {ta("approve")}
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
                {ta("reject")}
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
                  {ta("setPriority")}{" "}
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
                    {tc("selectPriority")}
                  </option>
                  <option value="low">{tp("low")}</option>
                  <option value="medium">{tp("medium")}</option>
                  <option value="high">{tp("high")}</option>
                  <option value="critical">{tp("critical")}</option>
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
                  {isApproving ? ta("approving") : ta("confirmApproval")}
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
                  {tc("cancel")}
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
                  {ta("rejectionReason")}{" "}
                  <span style={{ color: "var(--color-crit)" }}>*</span>
                </label>
                <textarea
                  id="rejection_reason"
                  name="rejection_reason"
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder={ta("explanationTask")}
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
                  {isRejecting ? ta("rejecting") : ta("confirmRejection")}
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
                  {tc("cancel")}
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
            {key === "subtasks" && subtasks.length > 0 && (
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
                <Num>{subtasks.length}</Num>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {activeTab === "details" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {task.description ? (
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
                {tc("description")}
              </p>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: "22px",
                  color: "var(--color-ink-900)",
                }}
              >
                {task.description}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
              {tc("noDescriptionProvided")}
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
                {tc("assignees")}
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
              { label: tc("owner"), value: task.created_by_name ?? "—" },
              { label: tc("team"), value: task.team_name ?? "—" },
              {
                label: tc("priority"),
                value: task.priority ? tp(task.priority) : tc("notSet"),
              },
              { label: tc("startDate"), value: fmt(task.start_date) },
              { label: tc("dueDate"), value: fmt(task.due_date) },
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

      {/* Sub-tasks tab */}
      {activeTab === "subtasks" && (
        <div>
          {subtasks.length === 0 ? (
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
                {t("noSubtasksYet")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subtasks.map((sub) => (
                <SubtaskRow key={sub.id} subtask={sub} locale={locale} tc={tc} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "files" && (
        <FilesTab
          files={files}
          workItemId={task.id ?? ""}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
          canUpload={canUpload}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          entries={historyEntries}
          total={historyTotal}
          workItemId={task.id ?? ""}
        />
      )}
    </div>
  );
}

type TranslatorFn = (key: string, values?: Record<string, string | number>) => string;

function SubtaskRow({
  subtask: sub,
  locale,
  tc,
  t,
}: {
  subtask: Subtask;
  locale: string;
  tc: TranslatorFn;
  t: TranslatorFn;
}) {
  const displayTitle =
    locale === "ar" && sub.title_ar ? sub.title_ar : (sub.title ?? "");

  const dueLabel = sub.due_date
    ? new Date(sub.due_date).toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      )
    : null;

  const milestoneLabel =
    sub.milestone_count != null && sub.milestone_count > 0
      ? t("milestonesCount", {
          done: sub.milestone_done_count ?? 0,
          total: sub.milestone_count,
        })
      : null;

  return (
    <Link
      href={`/subtasks/${sub.id}`}
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
            background: "var(--color-ink-300)",
          }}
        >
          <CornerDownRight size={18} color="#fff" strokeWidth={1.75} />
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
          {(sub.created_by_name || dueLabel || milestoneLabel) && (
            <p
              style={{
                marginTop: 2,
                fontSize: 13,
                color: "var(--color-ink-400)",
              }}
            >
              {[
                sub.created_by_name,
                milestoneLabel,
                dueLabel ? tc("due", { date: dueLabel }) : null,
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
          {sub.status && <StatusPill status={sub.status} />}
          <div style={{ width: 130 }}>
            <ProgressBar progress={sub.progress ?? 0} />
          </div>
        </div>
      </div>
    </Link>
  );
}
