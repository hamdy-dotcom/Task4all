"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, X, ChevronRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Num } from "@/components/ui/Num";
import type {
  ApproveWorkItemState,
  RejectWorkItemState,
  ApproveSubtaskWithMilestonesState,
} from "@/app/(app)/approvals/actions";

// ─── shared types ────────────────────────────────────────────────────────────

export interface PathSegment {
  id: string;
  title: string;
  type: string;
}

export interface PendingMilestone {
  milestone_id: string;
  milestone_title: string;
  sort_order: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function segmentHref(type: string, id: string): string {
  if (type === "north_star" || type === "objective") return "/north-star";
  if (type === "initiative") return `/initiatives/${id}`;
  if (type === "task") return `/tasks/${id}`;
  if (type === "subtask") return `/subtasks/${id}`;
  return "#";
}

function workItemHref(type: string, id: string): string {
  return segmentHref(type, id);
}

const PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;

// ─── PathBreadcrumb ───────────────────────────────────────────────────────────

function PathBreadcrumb({ path }: { path: PathSegment[] }) {
  const [expanded, setExpanded] = useState(false);

  if (path.length === 0) return null;

  const showCollapsed = !expanded && path.length > 3;
  const displayed: Array<PathSegment | "ellipsis"> = showCollapsed
    ? [path[0], "ellipsis", path[path.length - 1]]
    : path;

  return (
    <div
      className="flex items-center flex-wrap"
      style={{ gap: "2px 4px", marginBlockStart: 5 }}
    >
      {displayed.map((seg, i) => {
        if (seg === "ellipsis") {
          return (
            <span key="ellipsis" className="flex items-center" style={{ gap: 4 }}>
              <ChevronRight size={11} style={{ color: "var(--color-ink-300)", flexShrink: 0 }} />
              <button
                type="button"
                onClick={() => setExpanded(true)}
                style={{
                  fontSize: 12,
                  color: "var(--color-ink-400)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontFamily: "inherit",
                }}
              >
                …
              </button>
            </span>
          );
        }

        const isLast = i === displayed.length - 1;
        return (
          <span key={seg.id} className="flex items-center" style={{ gap: 4 }}>
            {i > 0 && (
              <ChevronRight size={11} style={{ color: "var(--color-ink-300)", flexShrink: 0 }} />
            )}
            <Link
              href={segmentHref(seg.type, seg.id)}
              style={{
                fontSize: 12,
                color: isLast ? "var(--color-ink-600)" : "var(--color-ink-400)",
                textDecoration: "none",
                maxInlineSize: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
              title={seg.title}
            >
              {seg.title}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

// ─── SubtaskApprovalModal ─────────────────────────────────────────────────────

type MilestoneDecision = "approve" | "reject" | "skip";

interface SubtaskApprovalModalProps {
  subtaskTitle: string;
  path: PathSegment[];
  pendingMilestones: PendingMilestone[];
  approveAction: (
    prev: ApproveSubtaskWithMilestonesState,
    fd: FormData
  ) => Promise<ApproveSubtaskWithMilestonesState>;
  onClose: () => void;
}

function SubtaskApprovalModal({
  subtaskTitle,
  path,
  pendingMilestones,
  approveAction,
  onClose,
}: SubtaskApprovalModalProps) {
  const t = useTranslations("approvals");
  const tc = useTranslations("common");
  const tp = useTranslations("priority");

  const [state, doApprove, isPending] = useActionState<
    ApproveSubtaskWithMilestonesState,
    FormData
  >(approveAction, null);

  const [decisions, setDecisions] = useState<Record<string, MilestoneDecision>>(
    Object.fromEntries(pendingMilestones.map((m) => [m.milestone_id, "approve"]))
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});

  function handleDecisionChange(id: string, val: MilestoneDecision) {
    setDecisions((prev) => ({ ...prev, [id]: val }));
  }

  function handleReasonChange(id: string, val: string) {
    setReasons((prev) => ({ ...prev, [id]: val }));
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-card)",
          padding: "24px",
          maxInlineSize: 560,
          inlineSize: "100%",
          maxBlockSize: "85vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start"
          style={{ gap: 12, marginBlockEnd: 20 }}
        >
          <div style={{ flex: 1, minInlineSize: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-ink-400)",
                marginBlockEnd: 4,
              }}
            >
              {t("approveSubtask")}
            </p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--color-ink-900)",
                margin: 0,
              }}
            >
              {subtaskTitle}
            </p>
            <PathBreadcrumb path={path} />
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-400)",
              padding: 4,
              flexShrink: 0,
              display: "flex",
            }}
            aria-label={tc("close")}
          >
            <X size={18} />
          </button>
        </div>

        <form action={doApprove} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Priority */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink-600)",
                marginBlockEnd: 6,
              }}
            >
              {tc("priority")}
            </label>
            <select
              name="priority"
              required
              style={{
                fontSize: 14,
                padding: "7px 10px",
                borderRadius: "var(--radius-input)",
                border: "1px solid var(--color-ink-300)",
                color: "var(--color-ink-900)",
                background: "var(--color-surface-inner)",
                inlineSize: "100%",
              }}
            >
              <option value="">{tc("selectPriority")}</option>
              {PRIORITY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {tp(v)}
                </option>
              ))}
            </select>
          </div>

          {/* Milestones */}
          {pendingMilestones.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink-600)",
                  marginBlockEnd: 10,
                }}
              >
                {t("pendingMilestones", { n: pendingMilestones.length })}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingMilestones.map((m) => {
                  const decision = decisions[m.milestone_id] ?? "approve";
                  return (
                    <div
                      key={m.milestone_id}
                      style={{
                        borderRadius: "var(--radius-row)",
                        border: "1px solid var(--color-ink-200)",
                        padding: "12px 14px",
                        background: "var(--color-surface-inner)",
                      }}
                    >
                      {/* hidden inputs */}
                      <input type="hidden" name="milestone_id" value={m.milestone_id} />
                      <input
                        type="hidden"
                        name={`decision_${m.milestone_id}`}
                        value={decision}
                      />

                      <div className="flex items-center" style={{ gap: 10 }}>
                        <p
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: "var(--color-ink-900)",
                            margin: 0,
                          }}
                        >
                          {m.milestone_title}
                        </p>
                        <div className="flex items-center" style={{ gap: 6 }}>
                          {(
                            [
                              ["approve", t("approve")],
                              ["skip", t("skip")],
                              ["reject", t("reject")],
                            ] as const
                          ).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                handleDecisionChange(m.milestone_id, val)
                              }
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                padding: "4px 9px",
                                borderRadius: "var(--radius-input)",
                                border: "none",
                                cursor: "pointer",
                                background:
                                  decision === val
                                    ? val === "approve"
                                      ? "var(--color-nml)"
                                      : val === "reject"
                                      ? "var(--color-crit-soft)"
                                      : "var(--color-ink-200)"
                                    : "var(--color-ink-100)",
                                color:
                                  decision === val
                                    ? val === "approve"
                                      ? "#fff"
                                      : val === "reject"
                                      ? "var(--color-crit)"
                                      : "var(--color-ink-600)"
                                    : "var(--color-ink-400)",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {decision === "reject" && (
                        <div style={{ marginBlockStart: 10 }}>
                          <textarea
                            name={`reason_${m.milestone_id}`}
                            required
                            placeholder={t("rejectPlaceholder")}
                            rows={2}
                            value={reasons[m.milestone_id] ?? ""}
                            onChange={(e) =>
                              handleReasonChange(m.milestone_id, e.target.value)
                            }
                            style={{
                              inlineSize: "100%",
                              fontSize: 13,
                              padding: "7px 9px",
                              borderRadius: "var(--radius-input)",
                              border: "1px solid var(--color-ink-300)",
                              color: "var(--color-ink-900)",
                              background: "var(--color-surface)",
                              resize: "vertical",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {state?.error && (
            <p style={{ fontSize: 13, color: "var(--color-crit)", margin: 0 }}>
              {state.error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "var(--color-nml)",
                border: "none",
                borderRadius: "var(--radius-input)",
                padding: "8px 18px",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.65 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={15} />
              {isPending ? t("approving") : t("confirmApproval")}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                fontSize: 14,
                color: "var(--color-ink-400)",
                background: "none",
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                padding: "8px 4px",
                fontFamily: "inherit",
              }}
            >
              {tc("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── WorkItemApprovalRow ──────────────────────────────────────────────────────

type Mode = "idle" | "approve" | "reject" | "modal";

interface WorkItemApprovalRowProps {
  id: string;
  title: string;
  type: string;
  classification: string | null;
  createdAt: string | null;
  path: PathSegment[];
  pendingMilestones: PendingMilestone[];
  approveAction: (
    prev: ApproveWorkItemState,
    fd: FormData
  ) => Promise<ApproveWorkItemState>;
  approveSubtaskAction: (
    prev: ApproveSubtaskWithMilestonesState,
    fd: FormData
  ) => Promise<ApproveSubtaskWithMilestonesState>;
  rejectAction: (
    prev: RejectWorkItemState,
    fd: FormData
  ) => Promise<RejectWorkItemState>;
}

export function WorkItemApprovalRow({
  id,
  title,
  type,
  classification,
  createdAt,
  path,
  pendingMilestones,
  approveAction,
  approveSubtaskAction,
  rejectAction,
}: WorkItemApprovalRowProps) {
  const t = useTranslations("approvals");
  const tc = useTranslations("common");
  const tp = useTranslations("priority");

  const [mode, setMode] = useState<Mode>("idle");

  const [approveState, doApprove, isApproving] = useActionState<
    ApproveWorkItemState,
    FormData
  >(approveAction, null);
  const [rejectState, doReject, isRejecting] = useActionState<
    RejectWorkItemState,
    FormData
  >(rejectAction, null);

  const date = createdAt
    ? new Date(createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  const href = workItemHref(type, id);
  const isSubtask = type === "subtask";

  return (
    <>
      {mode === "modal" && isSubtask && (
        <SubtaskApprovalModal
          subtaskTitle={title}
          path={path}
          pendingMilestones={pendingMilestones}
          approveAction={approveSubtaskAction}
          onClose={() => setMode("idle")}
        />
      )}

      <div
        style={{
          borderRadius: "var(--radius-row)",
          border: "1px solid var(--color-ink-200)",
          padding: "14px 16px",
          background: "var(--color-surface-inner)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Top row: title + badges + actions */}
        <div className="flex items-start" style={{ gap: 12 }}>
          <div style={{ flex: 1, minInlineSize: 0 }}>
            <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--color-ink-900)",
                }}
              >
                {title}
              </span>
              {classification && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--color-nml)",
                    padding: "2px 6px",
                    background:
                      "color-mix(in srgb, var(--color-nml) 8%, transparent)",
                    borderRadius: 4,
                  }}
                >
                  {classification.replace(/_/g, " ")}
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--color-ink-400)",
                  padding: "2px 6px",
                  background: "var(--color-ink-100)",
                  borderRadius: 4,
                }}
              >
                {type}
              </span>
              {date && (
                <span style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
                  <Num>{date}</Num>
                </span>
              )}
            </div>

            {/* Ancestry breadcrumb */}
            <PathBreadcrumb path={path} />
          </div>

          {/* Controls */}
          <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
            {/* Open in new tab */}
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={tc("external")}
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--color-ink-400)",
                padding: 5,
                borderRadius: "var(--radius-input)",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={15} />
            </Link>

            {mode === "idle" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    isSubtask ? setMode("modal") : setMode("approve")
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#fff",
                    background: "var(--color-nml)",
                    border: "none",
                    borderRadius: "var(--radius-input)",
                    padding: "5px 10px",
                    cursor: "pointer",
                  }}
                >
                  <Check size={14} />
                  {t("approve")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("reject")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-crit)",
                    background: "var(--color-crit-soft)",
                    border: "none",
                    borderRadius: "var(--radius-input)",
                    padding: "5px 10px",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                  {t("reject")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline approve form (non-subtask only) */}
        {mode === "approve" && !isSubtask && (
          <form
            action={doApprove}
            className="flex items-center flex-wrap"
            style={{ gap: 8 }}
          >
            <select
              name="priority"
              required
              style={{
                fontSize: 13,
                padding: "5px 8px",
                borderRadius: "var(--radius-input)",
                border: "1px solid var(--color-ink-300)",
                color: "var(--color-ink-900)",
                background: "var(--color-surface-inner)",
              }}
            >
              <option value="">{tc("selectPriority")}</option>
              {PRIORITY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {tp(v)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isApproving}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                background: "var(--color-nml)",
                border: "none",
                borderRadius: "var(--radius-input)",
                padding: "5px 10px",
                cursor: isApproving ? "not-allowed" : "pointer",
                opacity: isApproving ? 0.6 : 1,
              }}
            >
              {isApproving ? t("approving") : t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              style={{
                fontSize: 13,
                color: "var(--color-ink-400)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "5px 4px",
                fontFamily: "inherit",
              }}
            >
              {tc("cancel")}
            </button>
            {approveState?.error && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-crit)",
                  inlineSize: "100%",
                }}
              >
                {approveState.error}
              </span>
            )}
          </form>
        )}

        {/* Reject form */}
        {mode === "reject" && (
          <form
            action={doReject}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <textarea
              name="rejection_reason"
              required
              placeholder={t("rejectPlaceholder")}
              rows={3}
              style={{
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: "var(--radius-input)",
                border: "1px solid var(--color-ink-300)",
                color: "var(--color-ink-900)",
                background: "var(--color-surface-inner)",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div className="flex items-center" style={{ gap: 8 }}>
              <button
                type="submit"
                disabled={isRejecting}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-crit)",
                  background: "var(--color-crit-soft)",
                  border: "none",
                  borderRadius: "var(--radius-input)",
                  padding: "5px 10px",
                  cursor: isRejecting ? "not-allowed" : "pointer",
                  opacity: isRejecting ? 0.6 : 1,
                }}
              >
                {isRejecting ? t("rejecting") : t("confirmRejection")}
              </button>
              <button
                type="button"
                onClick={() => setMode("idle")}
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-400)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px 4px",
                  fontFamily: "inherit",
                }}
              >
                {tc("cancel")}
              </button>
            </div>
            {rejectState?.error && (
              <span style={{ fontSize: 12, color: "var(--color-crit)" }}>
                {rejectState.error}
              </span>
            )}
          </form>
        )}
      </div>
    </>
  );
}
