"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createTask, type CreateTaskState } from "@/app/(app)/tasks/actions";
import { uploadFiles } from "@/app/(app)/work-items/file-actions";
import FilePickerZone from "@/components/work-item/FilePickerZone";
import PeoplePicker from "@/components/ui/PeoplePicker";

interface Initiative {
  id: string;
  title: string;
  title_ar: string | null;
}

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

interface TaskFormProps {
  initiatives: Initiative[];
  teams: Team[];
  profiles: Profile[];
  locale: string;
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

export default function TaskForm({ initiatives, teams, profiles, locale }: TaskFormProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const tc = useTranslations("common");

  const [state, formAction, isPending] = useActionState<CreateTaskState, FormData>(
    createTask,
    null
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const processedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || !("id" in state)) return;
    const newId = state.id;
    if (processedIdRef.current === newId) return;
    processedIdRef.current = newId;

    if (pendingFiles.length === 0) {
      router.push(`/tasks/${newId}`);
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    pendingFiles.forEach((f) => fd.append("files", f));
    uploadFiles(newId, fd).then((result) => {
      setIsUploading(false);
      if (result.error) setUploadError(result.error);
      router.push(`/tasks/${newId}`);
    });
  }, [state, pendingFiles, router]);

  const isBusy = isPending || isUploading;
  const formError = state && "error" in state ? state.error : uploadError;

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
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
          {t("form.title")}{" "}
          <span style={{ color: "var(--color-crit)" }}>*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder={t("form.titlePlaceholderAlt")}
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
          placeholder={t("form.descriptionPlaceholderAlt")}
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

      {/* Parent initiative */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="parent_id" style={labelStyle}>
          {t("form.parentInitiative")}{" "}
          <span style={{ color: "var(--color-crit)" }}>*</span>
        </label>
        <select
          id="parent_id"
          name="parent_id"
          required
          defaultValue=""
          style={inputStyle}
        >
          <option value="">{t("form.parentPlaceholderAlt")}</option>
          {initiatives.map((i) => (
            <option key={i.id} value={i.id}>
              {locale === "ar" && i.title_ar ? i.title_ar : i.title}
            </option>
          ))}
        </select>
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
            {tc("team")}
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
          disabled={isBusy}
          style={{
            height: 44,
            padding: "0 24px",
            borderRadius: "999px",
            border: "none",
            background: isBusy ? "var(--color-ink-300)" : "var(--color-nml)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: isBusy ? "not-allowed" : "pointer",
            transition: "background 150ms",
          }}
        >
          {isUploading
            ? t("form.uploading")
            : isPending
            ? t("form.submitting")
            : t("form.submitForApproval")}
        </button>

        <Link
          href="/tasks"
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
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
