"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  CheckCircle2,
  Circle,
  XCircle,
  Users,
  CheckCheck,
} from "lucide-react";
import { Num } from "@/components/ui/Num";
import type { FileItemProp, HistoryEntryProp } from "@/components/work-item/types";
import FilesTab from "@/components/work-item/FilesTab";
import HistoryTab from "@/components/work-item/HistoryTab";
import StatusPill from "@/components/ui/StatusPill";
import ApprovalPill from "@/components/ui/ApprovalPill";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  approveSubtask,
  rejectSubtask,
  updateSubtaskStatus,
  toggleMilestone,
  approveMilestone,
  rejectMilestone,
  approveAllMilestones,
  type ApproveSubtaskState,
  type RejectSubtaskState,
  type UpdateSubtaskStatusState,
  type ToggleMilestoneState,
  type ApproveMilestoneState,
  type RejectMilestoneState,
  type ApproveAllMilestonesState,
} from "@/app/(app)/subtasks/actions";

type WorkStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";
type ApprovalStatus = "pending" | "approved" | "rejected";
type PriorityLevel = "low" | "medium" | "high" | "critical";
type MilestoneApprovalStatus = "pending" | "approved" | "rejected";

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

interface Milestone {
  id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  approval_status: MilestoneApprovalStatus;
  rejection_reason: string | null;
}

interface Subtask {
  id: string | null;
  title: string | null;
  status: WorkStatus | null;
  approval_status: ApprovalStatus | null;
  priority: PriorityLevel | null;
  progress: number | null;
  milestone_count: number | null;
  milestone_done_count: number | null;
  milestone_pending_count: number | null;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  created_by_name: string | null;
  team_name: string | null;
  parent_title: string | null;
  parent_id: string | null;
  rejection_reason: string | null;
}

interface Assignee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
}

type ToggleFn = (prevState: ToggleMilestoneState, formData: FormData) => Promise<ToggleMilestoneState>;
type ApproveMilestoneFn = (prevState: ApproveMilestoneState, formData: FormData) => Promise<ApproveMilestoneState>;
type RejectMilestoneFn = (prevState: RejectMilestoneState, formData: FormData) => Promise<RejectMilestoneState>;
type ApproveAllFn = (prevState: ApproveAllMilestonesState, formData: FormData) => Promise<ApproveAllMilestonesState>;

interface SubtaskDetailProps {
  subtask: Subtask;
  milestones: Milestone[];
  assignees: Assignee[];
  canChangeStatus: boolean;
  isApprover: boolean;
  isSuperAdmin: boolean;
  files: FileItemProp[];
  historyEntries: HistoryEntryProp[];
  historyTotal: number;
  currentUserId: string;
  canUpload: boolean;
  approveAction: (prevState: ApproveSubtaskState, formData: FormData) => Promise<ApproveSubtaskState>;
  rejectAction: (prevState: RejectSubtaskState, formData: FormData) => Promise<RejectSubtaskState>;
  statusAction: (prevState: UpdateSubtaskStatusState, formData: FormData) => Promise<UpdateSubtaskStatusState>;
  toggleActions: Record<string, ToggleFn>;
  approveMilestoneActions: Record<string, ApproveMilestoneFn>;
  rejectMilestoneActions: Record<string, RejectMilestoneFn>;
  approveAllMilestonesAction: ApproveAllFn;
}

type TabKey = "details" | "milestones" | "files" | "history";

export default function SubtaskDetail({
  subtask,
  milestones,
  assignees,
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
  toggleActions,
  approveMilestoneActions,
  rejectMilestoneActions,
  approveAllMilestonesAction,
}: SubtaskDetailProps) {
  const t = useTranslations("subtasks");
  const tCommon = useTranslations("common");
  const tApprovals = useTranslations("approvals");
  const tStatus = useTranslations("status");
  const tPriority = useTranslations("priority");
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<TabKey>("milestones");
  const [approvalPanel, setApprovalPanel] = useState<"idle" | "approve" | "reject">("idle");

  const [approveState, doApprove, isApproving] = useActionState<ApproveSubtaskState, FormData>(approveAction, null);
  const [rejectState, doReject, isRejecting] = useActionState<RejectSubtaskState, FormData>(rejectAction, null);
  const [statusState, doStatus, isStatusPending] = useActionState<UpdateSubtaskStatusState, FormData>(statusAction, null);
  const [approveAllState, doApproveAll, isApprovingAll] = useActionState<ApproveAllMilestonesState, FormData>(approveAllMilestonesAction, null);

  const STATUS_LABELS: Record<WorkStatus, string> = {
    not_started: tStatus("not_started"),
    pending: tStatus("pending"),
    in_progress: tStatus("in_progress"),
    blocked: tStatus("blocked"),
    done: tStatus("done"),
    cancelled: tStatus("cancelled"),
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "details", label: t("detail.details") },
    { key: "milestones", label: t("detail.milestones") },
    { key: "files", label: tCommon("files") },
    { key: "history", label: tCommon("history") },
  ];

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(
          locale === "ar" ? "ar-u-nu-latn" : "en-GB",
          { day: "numeric", month: "short", year: "numeric" }
        )
      : "—";

  const showApprovalActions = isApprover && subtask.approval_status === "pending";

  // approved milestones only (milestone_count / milestone_done_count in view already count only approved)
  const approvedTotal = subtask.milestone_count ?? 0;
  const approvedDone = subtask.milestone_done_count ?? 0;
  const pendingApprovalCount = subtask.milestone_pending_count ?? 0;
  const progressPct = subtask.progress ?? 0;

  const pendingMilestones = milestones.filter((m) => m.approval_status === "pending");
  const showApproveAll = isSuperAdmin && pendingMilestones.length > 1;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex items-start flex-wrap" style={{ gap: 10, marginBottom: 10 }}>
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
            {subtask.title}
          </h1>
          <div className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
            {subtask.status && <StatusPill status={subtask.status} />}
            {subtask.approval_status && <ApprovalPill status={subtask.approval_status} />}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 4 }}>
          <ProgressBar progress={progressPct} />
        </div>
        <p style={{ fontSize: 13, color: "var(--color-ink-600)", marginBottom: 2 }}>
          {approvedTotal > 0 ? (
            <>
              {t(
                approvedTotal === 1 ? "approvedMilestones" : "approvedMilestonesPlural",
                { approved: approvedDone, total: approvedTotal }
              )}
              {" · "}<Num>{progressPct}%</Num>
            </>
          ) : (
            <Num>{progressPct}%</Num>
          )}
        </p>
        {pendingApprovalCount > 0 && (
          <p style={{ fontSize: 13, color: "var(--color-ink-400)" }}>
            {t("awaitingApproval", { n: pendingApprovalCount })}
          </p>
        )}

        {/* Meta */}
        <div
          className="flex flex-wrap"
          style={{ gap: 20, marginTop: 12, fontSize: 13, lineHeight: "18px", color: "var(--color-ink-600)" }}
        >
          {subtask.parent_title && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>{t("taskLabel")} </span>
              <Link
                href={`/tasks/${subtask.parent_id}`}
                style={{ color: "var(--color-nml)", textDecoration: "none", fontWeight: 500 }}
              >
                {subtask.parent_title}
              </Link>
            </span>
          )}
          {subtask.priority && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>{t("priorityLabel")} </span>
              <span style={{ fontWeight: 600, color: PRIORITY_COLORS[subtask.priority] }}>
                {tPriority(subtask.priority)}
              </span>
            </span>
          )}
          {subtask.created_by_name && (
            <span>
              <span style={{ color: "var(--color-ink-400)" }}>{t("ownerLabel")} </span>
              {subtask.created_by_name}
            </span>
          )}
          <span>
            <span style={{ color: "var(--color-ink-400)" }}>{t("dueLabel")} </span>
            {fmt(subtask.due_date)}
          </span>
        </div>

        {subtask.rejection_reason && (
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
            <strong>{tCommon("rejectedLabel")} </strong>
            {subtask.rejection_reason}
          </div>
        )}
      </div>

      {/* Status control */}
      {canChangeStatus && (
        <div style={{ marginBottom: 24, padding: 20, borderRadius: "var(--radius-inner)", background: "var(--color-surface-inner)" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-700)", marginBottom: 12 }}>
            {t("updateStatus")}
          </p>
          <form action={doStatus}>
            <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <select
                name="status"
                defaultValue={subtask.status ?? "not_started"}
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
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
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
                  background: isStatusPending ? "var(--color-ink-300)" : "var(--color-ink-900)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isStatusPending ? "not-allowed" : "pointer",
                }}
              >
                {isStatusPending ? t("updating") : t("update")}
              </button>
            </div>
            {statusState?.error && (
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-crit)" }}>{statusState.error}</p>
            )}
          </form>
        </div>
      )}

      {/* Sub-task approval panel */}
      {showApprovalActions && (
        <div style={{ marginBottom: 24, padding: 20, borderRadius: "var(--radius-inner)", background: "var(--color-warn-soft)" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-warn)", marginBottom: 12 }}>
            {tApprovals("subtaskPendingApproval")}
          </p>

          {approvalPanel === "idle" && (
            <div className="flex items-center" style={{ gap: 10 }}>
              <button
                onClick={() => setApprovalPanel("approve")}
                style={{ height: 44, padding: "0 20px", borderRadius: "999px", border: "none", background: "var(--color-nml)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {tApprovals("approve")}
              </button>
              <button
                onClick={() => setApprovalPanel("reject")}
                style={{ height: 44, padding: "0 20px", borderRadius: "999px", border: "none", background: "var(--color-crit-soft)", color: "var(--color-crit)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {tApprovals("reject")}
              </button>
            </div>
          )}

          {approvalPanel === "approve" && (
            <form action={doApprove} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {approveState?.error && <p style={{ fontSize: 13, color: "var(--color-crit)" }}>{approveState.error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="priority" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-700)" }}>
                  {tApprovals("setPriority")} <span style={{ color: "var(--color-crit)" }}>*</span>
                </label>
                <select id="priority" name="priority" required defaultValue=""
                  style={{ height: 44, padding: "0 16px", borderRadius: "var(--radius-input)", border: "1px solid var(--color-ink-200)", background: "var(--color-surface)", fontSize: 14, color: "var(--color-ink-900)", outline: "none", width: "100%", maxWidth: 280, fontFamily: "inherit", boxSizing: "border-box" }}
                >
                  <option value="" disabled>{tCommon("selectPriority")}</option>
                  <option value="low">{tPriority("low")}</option>
                  <option value="medium">{tPriority("medium")}</option>
                  <option value="high">{tPriority("high")}</option>
                  <option value="critical">{tPriority("critical")}</option>
                </select>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button type="submit" disabled={isApproving}
                  style={{ height: 44, padding: "0 20px", borderRadius: "999px", border: "none", background: isApproving ? "var(--color-ink-300)" : "var(--color-nml)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isApproving ? "not-allowed" : "pointer" }}
                >
                  {isApproving ? tApprovals("approving") : tApprovals("confirmApproval")}
                </button>
                <button type="button" onClick={() => setApprovalPanel("idle")}
                  style={{ height: 44, padding: "0 16px", borderRadius: "999px", border: "none", background: "var(--color-ink-100)", color: "var(--color-ink-700)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}

          {approvalPanel === "reject" && (
            <form action={doReject} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rejectState?.error && <p style={{ fontSize: 13, color: "var(--color-crit)" }}>{rejectState.error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="rejection_reason" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-700)" }}>
                  {tApprovals("rejectionReason")} <span style={{ color: "var(--color-crit)" }}>*</span>
                </label>
                <textarea id="rejection_reason" name="rejection_reason" required maxLength={1000} rows={3}
                  placeholder={tApprovals("explanationSubtask")}
                  style={{ padding: "12px 16px", borderRadius: "var(--radius-input)", border: "1px solid var(--color-ink-200)", background: "var(--color-surface)", fontSize: 14, lineHeight: "20px", color: "var(--color-ink-900)", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", maxWidth: 480 }}
                />
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button type="submit" disabled={isRejecting}
                  style={{ height: 44, padding: "0 20px", borderRadius: "999px", border: "none", background: isRejecting ? "var(--color-ink-300)" : "var(--color-crit-soft)", color: isRejecting ? "#fff" : "var(--color-crit)", fontSize: 14, fontWeight: 600, cursor: isRejecting ? "not-allowed" : "pointer" }}
                >
                  {isRejecting ? tApprovals("rejecting") : tApprovals("confirmRejection")}
                </button>
                <button type="button" onClick={() => setApprovalPanel("idle")}
                  style={{ height: 44, padding: "0 16px", borderRadius: "999px", border: "none", background: "var(--color-ink-100)", color: "var(--color-ink-700)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "inline-flex", background: "var(--color-ink-100)", borderRadius: "999px", padding: 4, gap: 2, marginBottom: 20 }}>
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
              background: activeTab === key ? "var(--color-ink-900)" : "transparent",
              color: activeTab === key ? "#fff" : "var(--color-ink-700)",
              transition: "background 150ms, color 150ms",
              whiteSpace: "nowrap",
            }}
          >
            {label}
            {key === "milestones" && milestones.length > 0 && (
              <span
                style={{
                  marginInlineStart: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: activeTab === key ? "rgba(255,255,255,.2)" : "var(--color-ink-200)",
                  color: activeTab === key ? "#fff" : "var(--color-ink-600)",
                  padding: "1px 6px",
                  borderRadius: "999px",
                }}
              >
                <Num>{approvedDone}/{approvedTotal}</Num>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {activeTab === "details" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {subtask.description ? (
            <div style={{ padding: 20, borderRadius: "var(--radius-inner)", background: "var(--color-surface-inner)" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-600)", marginBottom: 8 }}>{tCommon("description")}</p>
              <p style={{ fontSize: 15, lineHeight: "22px", color: "var(--color-ink-900)" }}>{subtask.description}</p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>{tCommon("noDescriptionProvided")}</p>
          )}

          {assignees.length > 0 && (
            <div style={{ padding: 20, borderRadius: "var(--radius-inner)", background: "var(--color-surface-inner)" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-600)", marginBottom: 12 }}>{tCommon("assignees")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {assignees.map((a) => (
                  <div key={a.id} className="flex items-center" style={{ gap: 10 }}>
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt={a.full_name} style={{ width: 32, height: 32, borderRadius: "999px", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "999px", background: "var(--color-ink-200)", flexShrink: 0 }}>
                        <Users size={14} color="var(--color-ink-600)" />
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, lineHeight: "18px", color: "var(--color-ink-900)" }}>{a.full_name}</p>
                      {a.title && <p style={{ fontSize: 12, color: "var(--color-ink-400)" }}>{a.title}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { label: tCommon("owner"), value: subtask.created_by_name ?? "—" },
              { label: tCommon("team"), value: subtask.team_name ?? "—" },
              {
                label: tCommon("priority"),
                value: subtask.priority ? tPriority(subtask.priority) : tCommon("notSet"),
              },
              { label: tCommon("startDate"), value: fmt(subtask.start_date) },
              { label: tCommon("dueDate"), value: fmt(subtask.due_date) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: 16, borderRadius: "var(--radius-inner)", background: "var(--color-surface-inner)" }}>
                <p style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink-900)" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <div>
          {/* Approve all button */}
          {showApproveAll && (
            <form action={doApproveAll} style={{ marginBottom: 16 }}>
              {approveAllState && "error" in approveAllState && approveAllState.error && (
                <p style={{ fontSize: 13, color: "var(--color-crit)", marginBottom: 8 }}>{approveAllState.error}</p>
              )}
              <button
                type="submit"
                disabled={isApprovingAll}
                className="flex items-center"
                style={{
                  height: 40,
                  padding: "0 18px",
                  borderRadius: "999px",
                  border: "1px solid var(--color-nml)",
                  background: "transparent",
                  color: "var(--color-nml)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isApprovingAll ? "not-allowed" : "pointer",
                  gap: 7,
                  opacity: isApprovingAll ? 0.6 : 1,
                }}
              >
                <CheckCheck size={16} />
                {isApprovingAll
                  ? tApprovals("approving")
                  : tApprovals("bulkApprove", { n: pendingMilestones.length })}
              </button>
            </form>
          )}

          {milestones.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>{tApprovals("noMilestonesFound")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {milestones
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    subtaskId={subtask.id ?? ""}
                    isSuperAdmin={isSuperAdmin}
                    toggleAction={toggleActions[m.id]}
                    approveAction={approveMilestoneActions[m.id]}
                    rejectAction={rejectMilestoneActions[m.id]}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "files" && (
        <FilesTab
          files={files}
          workItemId={subtask.id ?? ""}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
          canUpload={canUpload}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          entries={historyEntries}
          total={historyTotal}
          workItemId={subtask.id ?? ""}
        />
      )}
    </div>
  );
}

function MilestoneRow({
  milestone: m,
  subtaskId,
  isSuperAdmin,
  toggleAction,
  approveAction,
  rejectAction,
}: {
  milestone: Milestone;
  subtaskId: string;
  isSuperAdmin: boolean;
  toggleAction?: ToggleFn;
  approveAction?: ApproveMilestoneFn;
  rejectAction?: RejectMilestoneFn;
}) {
  const t = useTranslations("subtasks");
  const tCommon = useTranslations("common");
  const tApprovals = useTranslations("approvals");

  const [rejectOpen, setRejectOpen] = useState(false);

  const [toggleState, doToggle, isToggling] = useActionState<ToggleMilestoneState, FormData>(
    toggleAction ?? (async (_p, _f) => ({ error: "Not available" })),
    null
  );
  const [approveState, doApprove, isApproving] = useActionState<ApproveMilestoneState, FormData>(
    approveAction ?? (async (_p, _f) => ({ error: "Not available" })),
    null
  );
  const [rejectState, doReject, isRejecting] = useActionState<RejectMilestoneState, FormData>(
    rejectAction ?? (async (_p, _f) => ({ error: "Not available" })),
    null
  );

  const isApproved = m.approval_status === "approved";
  const isPending = m.approval_status === "pending";
  const isRejected = m.approval_status === "rejected";

  // Approval pill colours
  const pillStyle: React.CSSProperties = isPending
    ? { background: "var(--color-warn-soft)", color: "var(--color-warn)" }
    : isApproved
    ? { background: "color-mix(in srgb, var(--color-nml) 12%, transparent)", color: "var(--color-nml)" }
    : { background: "var(--color-crit-soft)", color: "var(--color-crit)" };

  return (
    <div
      style={{
        borderRadius: "var(--radius-row)",
        padding: "10px 12px",
        background: isRejected ? "var(--color-crit-soft)" : "transparent",
        opacity: isRejected ? 0.85 : 1,
      }}
    >
      <div className="flex items-start" style={{ gap: 10 }}>
        {/* Checkbox / toggle */}
        {isApproved ? (
          <form action={doToggle} style={{ flexShrink: 0, marginTop: 1 }}>
            <input type="hidden" name="subtask_id" value={subtaskId} />
            <input type="hidden" name="is_done" value={m.is_done ? "false" : "true"} />
            <button
              type="submit"
              disabled={isToggling}
              title={m.is_done ? t("markUndone") : t("markDone")}
              style={{ background: "none", border: "none", padding: 0, cursor: isToggling ? "wait" : "pointer", display: "flex", alignItems: "center" }}
            >
              {m.is_done ? (
                <CheckCircle2 size={20} color="var(--color-nml)" strokeWidth={1.75} />
              ) : (
                <Circle size={20} color="var(--color-ink-300)" strokeWidth={1.75} />
              )}
            </button>
          </form>
        ) : (
          <div style={{ flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center" }}>
            {isRejected ? (
              <XCircle size={20} color="var(--color-crit)" strokeWidth={1.75} />
            ) : (
              <Circle size={20} color="var(--color-ink-200)" strokeWidth={1.75} />
            )}
          </div>
        )}

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              lineHeight: "22px",
              color: isRejected ? "var(--color-crit)" : isPending ? "var(--color-ink-500)" : "var(--color-ink-900)",
              textDecoration: isRejected ? "line-through" : m.is_done && isApproved ? "line-through" : "none",
              fontWeight: 500,
            }}
          >
            {m.title}
          </p>
          {isPending && (
            <p style={{ fontSize: 12, color: "var(--color-ink-400)", marginTop: 2 }}>
              {tApprovals("awaitingApproval")}
            </p>
          )}
          {isRejected && m.rejection_reason && (
            <p style={{ fontSize: 12, color: "var(--color-crit)", marginTop: 2 }}>
              {m.rejection_reason}
            </p>
          )}
          {toggleState?.error && (
            <p style={{ fontSize: 12, color: "var(--color-crit)", marginTop: 2 }}>{toggleState.error}</p>
          )}
        </div>

        {/* Right side: pill + super_admin controls */}
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "999px",
              textTransform: "capitalize",
              ...pillStyle,
            }}
          >
            {tApprovals(`approvalStatus.${m.approval_status}`)}
          </span>

          {/* Super admin inline approve/reject for pending */}
          {isSuperAdmin && isPending && !rejectOpen && (
            <>
              <form action={doApprove}>
                <button
                  type="submit"
                  disabled={isApproving}
                  style={{
                    height: 30,
                    padding: "0 12px",
                    borderRadius: "999px",
                    border: "none",
                    background: isApproving ? "var(--color-ink-200)" : "color-mix(in srgb, var(--color-nml) 12%, transparent)",
                    color: "var(--color-nml)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isApproving ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isApproving ? "…" : tApprovals("approve")}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: "none",
                  background: "var(--color-crit-soft)",
                  color: "var(--color-crit)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tApprovals("reject")}
              </button>
            </>
          )}
          {approveState?.error && (
            <span style={{ fontSize: 12, color: "var(--color-crit)" }}>{approveState.error}</span>
          )}
        </div>
      </div>

      {/* Inline reject form */}
      {isSuperAdmin && isPending && rejectOpen && (
        <form
          action={doReject}
          style={{ marginTop: 10, marginInlineStart: 30, display: "flex", flexDirection: "column", gap: 8 }}
        >
          {rejectState?.error && (
            <p style={{ fontSize: 12, color: "var(--color-crit)" }}>{rejectState.error}</p>
          )}
          <textarea
            name="rejection_reason"
            required
            maxLength={500}
            rows={2}
            placeholder={tApprovals("reasonPlaceholder")}
            autoFocus
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-input)",
              border: "1px solid var(--color-ink-200)",
              background: "var(--color-surface)",
              fontSize: 13,
              lineHeight: "18px",
              color: "var(--color-ink-900)",
              outline: "none",
              width: "100%",
              maxWidth: 400,
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div className="flex items-center" style={{ gap: 8 }}>
            <button
              type="submit"
              disabled={isRejecting}
              style={{
                height: 30,
                padding: "0 14px",
                borderRadius: "999px",
                border: "none",
                background: isRejecting ? "var(--color-ink-200)" : "var(--color-crit-soft)",
                color: "var(--color-crit)",
                fontSize: 12,
                fontWeight: 600,
                cursor: isRejecting ? "not-allowed" : "pointer",
              }}
            >
              {isRejecting ? "…" : tCommon("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              style={{
                height: 30,
                padding: "0 12px",
                borderRadius: "999px",
                border: "none",
                background: "var(--color-ink-100)",
                color: "var(--color-ink-600)",
                fontSize: 12,
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
  );
}
