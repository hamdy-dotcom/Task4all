"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createInitiative,
  type CreateInitiativeState,
} from "@/app/(app)/initiatives/actions";
import { uploadFiles } from "@/app/(app)/work-items/file-actions";
import FilePickerZone from "@/components/work-item/FilePickerZone";
import PeoplePicker from "@/components/ui/PeoplePicker";

interface Team {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
  title: string | null;
  role: string;
}

interface InitiativeFormProps {
  northStarId: string;
  teams: Team[];
  profiles: Profile[];
  isSuperAdmin?: boolean;
}

const inputStyle: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface)",
  fontSize: 15,
  color: "var(--color-ink-900)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--color-ink-700)",
};

type ClassificationValue =
  | "product"
  | "service"
  | "project"
  | "experiment"
  | "stopgap"
  | "internal_capability"
  | "process";

interface ClassificationMeta {
  value: ClassificationValue;
  label: string;
  test: string;
  owner: string;
  duration: string;
  measure: string;
  exit: string;
  warning?: string;
}

const CLASSIFICATIONS: ClassificationMeta[] = [
  {
    value: "product",
    label: "Product",
    test: "A recurring need across multiple customers, served by a system that improves — not by effort repeated from scratch for each customer.",
    owner: "Permanent product owner + a fully dedicated vertical team",
    duration: "Open-ended, with a quarterly roadmap",
    measure: "Adoption, retention, recurring revenue",
    exit: "Explicit stop decision after two consecutive quarters of missed metrics",
    warning:
      "A product without a dedicated owner, staffed by people split across three things, is not a product. It is a project in disguise.",
  },
  {
    value: "service",
    label: "Service",
    test: "We execute for a specific customer for a fee, and it scales with people rather than with systems.",
    owner: "One delivery lead per engagement",
    duration: "Per contract, with a declared cap on the number of deliveries",
    measure: "Margin, delivery time, share of work that can be automated",
    exit: "At the cap — automate, raise the price, or stop",
    warning:
      "Services are the fastest way to turn a technology company into a delivery agency. Allowed for two reasons only — early revenue or learning from the field — and the reason and the cap must be written on day one.",
  },
  {
    value: "project",
    label: "Project",
    test: "It has a defined output and a known end. After delivery, no continuous work remains.",
    owner: "Temporary project owner; team assembled then dissolved",
    duration: "Fixed in advance; extension requires a new decision",
    measure: "Delivered in scope, on time, at agreed quality",
    exit: "Delivery and handover to whoever will operate it",
    warning:
      "A project that delivered but never dissolved its team is either a product born by accident, or people held with no reason.",
  },
  {
    value: "experiment",
    label: "Experiment",
    test: "We do not know the answer and want it at the lowest cost and fastest time.",
    owner: "One person, part-time, no permanent team",
    duration: "Weeks not months, with a written time cap",
    measure: "Success criterion written before the start, settled by a number",
    exit: "At the cap — promote to product or stop. No third option",
    warning:
      "An experiment without a pre-written success criterion is not an experiment. It is a funded hobby, and its result will always be interpreted in favour of whoever started it.",
  },
  {
    value: "stopgap",
    label: "Stopgap",
    test: "We treat a symptom now because the business cannot wait, and we know it is not the right solution.",
    owner: "Whoever built it, until it is replaced",
    duration: "No longer than one quarter",
    measure: "Did it stop the bleeding? What does it cost to run manually?",
    exit: "Logged as debt with a repayment date, reviewed monthly",
    warning:
      "A stopgap that survived a year has become a permanent process with no design, no documentation and no owner — the most dangerous thing that accumulates in a startup.",
  },
  {
    value: "internal_capability",
    label: "Internal Capability",
    test: "No external customer uses it, but more than one product depends on it.",
    owner: "A horizontal team with published standards and a clear interface",
    duration: "Open-ended; priorities set quarterly with product leads",
    measure: "Number of products relying on it, their speed because of it, its reliability",
    exit: "If only one product depends on it, it returns to that product",
    warning:
      "Building a platform before two real products need it is the most elegant form of waste.",
  },
  {
    value: "process",
    label: "Process",
    test: "Recurring internal work that never ends and is executed the same way every time.",
    owner: "One process owner who owns improving it, not only running it",
    duration: "Open-ended, reviewed twice a year",
    measure: "Cycle time, error rate, manual cost",
    exit: "Full automation, or cancellation if the need disappears",
  },
];

const DECISION_TABLE = [
  { q: "Do we not know the answer and want to test it cheaply?", type: "Experiment" },
  { q: "Does it have a known end, with no continuous work after delivery?", type: "Project" },
  { q: "Do we know it is not the right solution, and are doing it to stop harm now?", type: "Stopgap" },
  { q: "Is it executed for a specific customer, repeated with human effort each time?", type: "Service" },
  { q: "Is it used by more than one product internally, unseen by customers?", type: "Internal Capability" },
  { q: "Is it recurring internal work done the same way every time?", type: "Process" },
  { q: "None of the above, and the need recurs across multiple customers?", type: "Product" },
];

export default function InitiativeForm({
  northStarId,
  teams,
  profiles,
  isSuperAdmin,
}: InitiativeFormProps) {
  const router = useRouter();
  const t = useTranslations("initiatives");
  const tCommon = useTranslations("common");

  const [state, formAction, isPending] = useActionState<
    CreateInitiativeState,
    FormData
  >(createInitiative, null);

  const [classification, setClassification] =
    useState<ClassificationValue | null>(null);
  const [hovered, setHovered] = useState<ClassificationValue | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const processedIdRef = useRef<string | null>(null);

  const displayed = hovered ?? classification;
  const displayedInfo = displayed
    ? CLASSIFICATIONS.find((c) => c.value === displayed)
    : null;

  useEffect(() => {
    if (!state || !("id" in state)) return;
    const newId = state.id;
    if (processedIdRef.current === newId) return;
    processedIdRef.current = newId;

    if (pendingFiles.length === 0) {
      router.push(`/initiatives/${newId}`);
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    pendingFiles.forEach((f) => fd.append("files", f));
    uploadFiles(newId, fd).then((result) => {
      setIsUploading(false);
      if (result.error) setUploadError(result.error);
      router.push(`/initiatives/${newId}`);
    });
  }, [state, pendingFiles, router]);

  const isBusy = isPending || isUploading;
  const formError =
    state && "error" in state ? state.error : uploadError;

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Hidden parent (North Star) */}
      <input type="hidden" name="parent_id" value={northStarId} />
      {/* Hidden classification (controlled by pill picker) */}
      <input type="hidden" name="classification" value={classification ?? ""} />

      {formError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-row)",
            background: "var(--color-crit-soft)",
            color: "var(--color-crit)",
            fontSize: 14,
          }}
        >
          {formError}
        </div>
      )}

      {/* Title */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="title" style={labelStyle}>
          {t("form.title")} <span style={{ color: "var(--color-crit)" }}>*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder={t("titlePlaceholderAlt")}
          style={inputStyle}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-ink-900)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-ink-200)")
          }
        />
      </div>

      {/* Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="description" style={labelStyle}>
          {t("form.description")}
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={4}
          placeholder={t("descPlaceholderAlt")}
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-input)",
            border: "1px solid var(--color-ink-200)",
            background: "var(--color-surface)",
            fontSize: 15,
            lineHeight: "22px",
            color: "var(--color-ink-900)",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            fontFamily: "inherit",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-ink-900)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-ink-200)")
          }
        />
      </div>

      {/* Classification picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <label style={labelStyle}>
            {t("form.classification")} <span style={{ color: "var(--color-crit)" }}>*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-ink-400)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {showTable ? "Hide" : "How to choose?"}
          </button>
        </div>

        {showTable && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-row)",
              background: "var(--color-surface-inner)",
              fontSize: 13,
              lineHeight: "20px",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink-400)",
                marginBottom: 8,
              }}
            >
              Answer in order — stop at the first yes.
            </p>
            {DECISION_TABLE.map((row, i) => (
              <div
                key={i}
                className="flex items-start"
                style={{
                  gap: 8,
                  paddingBottom: 6,
                  marginBottom: 6,
                  borderBottom:
                    i < DECISION_TABLE.length - 1
                      ? "1px solid var(--color-ink-200)"
                      : "none",
                }}
              >
                <span style={{ flex: 1, color: "var(--color-ink-700)" }}>
                  {row.q}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--color-ink-900)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pill buttons */}
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {CLASSIFICATIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onMouseEnter={() => setHovered(c.value)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setClassification(c.value)}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: "999px",
                border:
                  classification === c.value
                    ? "none"
                    : "1px solid var(--color-ink-200)",
                background:
                  classification === c.value
                    ? "var(--color-ink-900)"
                    : hovered === c.value
                    ? "var(--color-ink-100)"
                    : "var(--color-surface-inner)",
                color:
                  classification === c.value
                    ? "#fff"
                    : "var(--color-ink-700)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Description popover */}
        {displayedInfo && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-row)",
              background: "var(--color-surface-inner)",
              border: "1px solid var(--color-ink-200)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: "var(--color-ink-700)",
                lineHeight: "20px",
                marginBottom: 10,
              }}
            >
              {displayedInfo.test}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "max-content 1fr",
                gap: "4px 12px",
                fontSize: 13,
                lineHeight: "20px",
              }}
            >
              {[
                { k: "Owner", v: displayedInfo.owner },
                { k: "Duration", v: displayedInfo.duration },
                { k: "Measure", v: displayedInfo.measure },
                { k: "Exit", v: displayedInfo.exit },
              ].map(({ k, v }) => (
                <>
                  <span
                    key={k + "-k"}
                    style={{ fontWeight: 600, color: "var(--color-ink-400)" }}
                  >
                    {k}
                  </span>
                  <span key={k + "-v"} style={{ color: "var(--color-ink-700)" }}>
                    {v}
                  </span>
                </>
              ))}
            </div>
            {displayedInfo.warning && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-input)",
                  background: "var(--color-warn-soft)",
                  fontSize: 12,
                  lineHeight: "18px",
                  color: "var(--color-warn)",
                }}
              >
                ⚠ {displayedInfo.warning}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="start_date" style={labelStyle}>
            {t("form.startDate")}
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-ink-900)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-ink-200)")
            }
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="due_date" style={labelStyle}>
            {t("form.dueDate")}
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            style={inputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-ink-900)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-ink-200)")
            }
          />
        </div>
      </div>

      {/* Team */}
      {teams.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="team_id" style={labelStyle}>
            {t("form.team")}
          </label>
          <select
            id="team_id"
            name="team_id"
            defaultValue=""
            style={inputStyle}
          >
            <option value="">{t("form.noSpecificTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Owner override (super_admin only) */}
      {isSuperAdmin && profiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="owner_id" style={labelStyle}>
            Owner
          </label>
          <select id="owner_id" name="owner_id" defaultValue="" style={inputStyle}>
            <option value="">Myself (default)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.id}
                {p.title ? ` — ${p.title}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Assignees */}
      {profiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={labelStyle}>{t("form.assignees")}</label>
          <PeoplePicker people={profiles} name="assignees" />
        </div>
      )}

      {/* Files */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={labelStyle}>{t("form.filesLabel")}</label>
        <FilePickerZone
          files={pendingFiles}
          onChange={setPendingFiles}
          disabled={isBusy}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center" style={{ gap: 12, marginTop: 4 }}>
        <button
          type="submit"
          disabled={isBusy || !classification}
          style={{
            height: 44,
            padding: "0 24px",
            borderRadius: "999px",
            border: "none",
            background:
              isBusy || !classification
                ? "var(--color-ink-300)"
                : "var(--color-nml)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: isBusy || !classification ? "not-allowed" : "pointer",
            transition: "background 150ms",
          }}
        >
          {isUploading
            ? t("form.uploading")
            : isPending
            ? t("form.submitting")
            : tCommon("submitForApproval")}
        </button>

        <Link
          href="/initiatives"
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: "999px",
            background: "var(--color-ink-100)",
            color: "var(--color-ink-900)",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
