"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Initiative {
  id: string;
  title: string;
}

interface TaskFiltersProps {
  currentApproval: string;
  currentInitiative: string;
  initiatives: Initiative[];
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

export default function TaskFilters({
  currentApproval,
  currentInitiative,
  initiatives,
}: TaskFiltersProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const ta = useTranslations("approvals");
  const tc = useTranslations("common");

  const push = (key: string, value: string) => {
    const params = new URLSearchParams();
    const approval = key === "approval_status" ? value : currentApproval;
    const initiative = key === "initiative_id" ? value : currentInitiative;
    if (approval) params.set("approval_status", approval);
    if (initiative) params.set("initiative_id", initiative);
    router.push(`/tasks${params.size ? `?${params}` : ""}`);
  };

  const hasFilter = currentApproval || currentInitiative;

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <select
        value={currentApproval}
        onChange={(e) => push("approval_status", e.target.value)}
        style={selectStyle}
        aria-label={t("filters.initiative")}
      >
        <option value="">{tc("all")}</option>
        <option value="pending">{ta("approvalStatus.pending")}</option>
        <option value="approved">{ta("approvalStatus.approved")}</option>
        <option value="rejected">{ta("approvalStatus.rejected")}</option>
      </select>

      {initiatives.length > 0 && (
        <select
          value={currentInitiative}
          onChange={(e) => push("initiative_id", e.target.value)}
          style={selectStyle}
          aria-label={t("filters.initiative")}
        >
          <option value="">{tc("all")}</option>
          {initiatives.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
      )}

      {hasFilter && (
        <button
          onClick={() => router.push("/tasks")}
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
