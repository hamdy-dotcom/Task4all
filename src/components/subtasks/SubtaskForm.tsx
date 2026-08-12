"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { createSubtask, type CreateSubtaskState } from "@/app/(app)/subtasks/actions";
import { uploadFiles } from "@/app/(app)/work-items/file-actions";
import FilePickerZone from "@/components/work-item/FilePickerZone";
import PeoplePicker from "@/components/ui/PeoplePicker";

interface Task {
  id: string;
  title: string;
}

interface Profile {
  id: string;
  full_name: string;
  title: string | null;
  role: string;
}

interface SubtaskFormProps {
  tasks: Task[];
  profiles: Profile[];
  defaultTaskId?: string;
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

export default function SubtaskForm({ tasks, profiles, defaultTaskId }: SubtaskFormProps) {
  const t = useTranslations("subtasks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<CreateSubtaskState, FormData>(
    createSubtask,
    null
  );

  const [milestones, setMilestones] = useState<string[]>([""]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const processedIdRef = useRef<string | null>(null);

  function addMilestone() {
    setMilestones((prev) => [...prev, ""]);
  }

  function removeMilestone(idx: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMilestone(idx: number, value: string) {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? value : m)));
  }

  useEffect(() => {
    if (!state || !("id" in state)) return;
    const newId = state.id;
    if (processedIdRef.current === newId) return;
    processedIdRef.current = newId;

    if (pendingFiles.length === 0) {
      router.push(`/subtasks/${newId}`);
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    pendingFiles.forEach((f) => fd.append("files", f));
    uploadFiles(newId, fd).then((result) => {
      setIsUploading(false);
      if (result.error) setUploadError(result.error);
      router.push(`/subtasks/${newId}`);
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
          {t("form.title")} <span style={{ color: "var(--color-crit)" }}>*</span>
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
          rows={3}
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

      {/* Parent task */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="parent_id" style={labelStyle}>
          {t("form.parentTask")} <span style={{ color: "var(--color-crit)" }}>*</span>
        </label>
        <select
          id="parent_id"
          name="parent_id"
          required
          defaultValue={defaultTaskId ?? ""}
          style={inputStyle}
        >
          <option value="">{t("selectTask")}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>

      {/* Milestones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={labelStyle}>
          {tCommon("milestones")} <span style={{ color: "var(--color-crit)" }}>*</span>
          <span
            style={{
              marginInlineStart: 8,
              fontSize: 12,
              fontWeight: 400,
              color: "var(--color-ink-400)",
            }}
          >
            {t("atLeastOneMilestone")}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className="flex items-center"
              style={{ gap: 8 }}
            >
              <input
                type="text"
                name="milestone_title"
                value={m}
                onChange={(e) => updateMilestone(idx, e.target.value)}
                placeholder={t("form.milestoneInputPlaceholder", { n: idx + 1 })}
                maxLength={200}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-ink-900)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-ink-200)")
                }
              />
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(idx)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-input)",
                    border: "1px solid var(--color-ink-200)",
                    background: "var(--color-surface)",
                    color: "var(--color-crit)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addMilestone}
          className="flex items-center"
          style={{
            alignSelf: "flex-start",
            height: 36,
            padding: "0 14px",
            borderRadius: "999px",
            border: "1px dashed var(--color-ink-300)",
            background: "transparent",
            color: "var(--color-ink-600)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            gap: 6,
          }}
        >
          <Plus size={14} />
          {t("addMilestone")}
        </button>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="start_date" style={labelStyle}>
            {tCommon("startDate")}
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
          href="/subtasks"
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
