import { getTranslations } from "next-intl/server";

type ApprovalStatus = "pending" | "approved" | "rejected";

const APPROVAL_STYLE: Record<
  ApprovalStatus,
  { color: string; bg: string; check?: boolean }
> = {
  pending: {
    color: "var(--color-warn)",
    bg: "var(--color-warn-soft)",
  },
  approved: {
    color: "var(--color-ok)",
    bg: "var(--color-ok-soft)",
    check: true,
  },
  rejected: {
    color: "var(--color-crit)",
    bg: "var(--color-crit-soft)",
  },
};

export default async function ApprovalPill({
  status,
}: {
  status: ApprovalStatus;
}) {
  const t = await getTranslations("approvals");
  // Touch all keys so check-i18n validates them
  const labels: Record<ApprovalStatus, string> = {
    pending: t("approvalStatus.pending"),
    approved: t("approvalStatus.approved"),
    rejected: t("approvalStatus.rejected"),
  };
  const { color, bg, check } = APPROVAL_STYLE[status];
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
