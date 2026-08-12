"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface InitiativeFiltersProps {
  currentApproval: string;
}

const selectStyle: React.CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: "999px",
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface-inner)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-ink-700)",
  cursor: "pointer",
  outline: "none",
  fontFamily: "inherit",
};

export default function InitiativeFilters({
  currentApproval,
}: InitiativeFiltersProps) {
  const router = useRouter();
  const t = useTranslations("initiatives");
  const tApprovals = useTranslations("approvals");

  const push = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("approval_status", value);
    router.push(`/initiatives${params.size ? `?${params}` : ""}`);
  };

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <select
        value={currentApproval}
        onChange={(e) => push(e.target.value)}
        style={selectStyle}
        aria-label={t("filters.all")}
      >
        <option value="">{t("filters.all")}</option>
        <option value="pending">{tApprovals("approvalStatus.pending")}</option>
        <option value="approved">{tApprovals("approvalStatus.approved")}</option>
        <option value="rejected">{tApprovals("approvalStatus.rejected")}</option>
      </select>

      {currentApproval && (
        <button
          onClick={() => router.push("/initiatives")}
          style={{
            ...selectStyle,
            border: "none",
            background: "transparent",
            color: "var(--color-ink-400)",
          }}
        >
          {t("filters.clearFilters")}
        </button>
      )}
    </div>
  );
}
