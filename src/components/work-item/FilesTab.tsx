"use client";

import { useRef, useState, useTransition } from "react";
import {
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { FileItemProp } from "./types";
import { uploadFiles, deleteFile, getDownloadUrl } from "@/app/(app)/work-items/file-actions";
import { Num } from "@/components/ui/Num";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TFn = (key: string, values?: Record<string, string | number>) => string;

function formatRelative(dateStr: string, t: TFn): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (secs < 60) return t("justNow");
  if (mins < 60) return t("minutesAgo", { n: mins });
  if (hours < 24) return t("hoursAgo", { n: hours });
  if (days < 7) return t("daysAgo", { n: days });
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatExact(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function FileTypeIcon({ mime }: { mime: string | null }) {
  const t = mime ?? "";
  const size = 20;
  const stroke = 1.5;

  if (t.startsWith("image/")) return <FileImage size={size} strokeWidth={stroke} style={{ color: "var(--color-nml)" }} />;
  if (t === "application/pdf") return <FileText size={size} strokeWidth={stroke} style={{ color: "#E74C3C" }} />;
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv")) return <FileSpreadsheet size={size} strokeWidth={stroke} style={{ color: "#27AE60" }} />;
  if (t.includes("zip") || t.includes("archive") || t.includes("tar")) return <FileArchive size={size} strokeWidth={stroke} style={{ color: "var(--color-warn)" }} />;
  return <File size={size} strokeWidth={stroke} style={{ color: "var(--color-ink-400)" }} />;
}

// ─── component ───────────────────────────────────────────────────────────────

interface FilesTabProps {
  files: FileItemProp[];
  workItemId: string;
  currentUserId: string;
  isSuperAdmin: boolean;
  canUpload: boolean;
}

export default function FilesTab({
  files,
  workItemId,
  currentUserId,
  isSuperAdmin,
  canUpload,
}: FilesTabProps) {
  const t = useTranslations("common");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Stable TFn reference for formatRelative (t is stable from useTranslations)
  const tFn: TFn = (key, values) => t(key as Parameters<typeof t>[0], values as Parameters<typeof t>[1]);

  async function handleFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    arr.forEach((f) => fd.append("files", f));
    try {
      const result = await uploadFiles(workItemId, fd);
      if (result.error) setUploadError(result.error);
    } catch {
      setUploadError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (!canUpload) return;
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (canUpload) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  async function handleDownload(storagePath: string, fileName: string) {
    const url = await getDownloadUrl(storagePath);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    setDeleteErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    try {
      const result = await deleteFile(id);
      if (result.error) {
        setDeleteErrors((prev) => ({ ...prev, [id]: result.error! }));
        setDeletingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
      // On success: page re-renders via revalidatePath; deletingIds entry stays but row is gone
    } catch {
      setDeleteErrors((prev) => ({ ...prev, [id]: t("deleteFailed") }));
      setDeletingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  const canDelete = (file: FileItemProp) => isSuperAdmin || file.uploaded_by === currentUserId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload zone */}
      {canUpload && (
        <>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "var(--color-nml)" : "var(--color-ink-200)"}`,
            borderRadius: "var(--radius-inner)",
            padding: "32px 24px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            background: isDragging
              ? "color-mix(in srgb, var(--color-nml) 4%, transparent)"
              : "var(--color-surface-inner)",
            transition: "border-color 150ms, background 150ms",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Upload
            size={28}
            strokeWidth={1.5}
            style={{
              color: isDragging ? "var(--color-nml)" : "var(--color-ink-300)",
              marginBottom: 10,
            }}
          />
          {uploading ? (
            <p style={{ fontSize: 14, color: "var(--color-ink-600)" }}>{t("uploading")}</p>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink-900)", marginBottom: 4 }}>
                {t("dropFilesOr")}{" "}
                <span style={{ color: "var(--color-nml)" }}>{t("browse")}</span>
              </p>
              <p style={{ fontSize: 13, color: "var(--color-ink-400)" }}>
                {t("anyFileType")}
              </p>
            </>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
          {t("filesPrivacy")}
        </p>
        </>
      )}

      {uploadError && (
        <div
          className="flex items-center"
          style={{
            gap: 8,
            padding: "10px 14px",
            borderRadius: "var(--radius-row)",
            background: "var(--color-crit-soft)",
          }}
        >
          <p style={{ flex: 1, fontSize: 13, color: "var(--color-crit)" }}>{uploadError}</p>
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => setUploadError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-crit)", display: "flex" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center"
          style={{ minHeight: 180, gap: 12 }}
        >
          <FileText size={40} strokeWidth={1.25} color="var(--color-ink-300)" />
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink-900)" }}>
            {t("noFiles")}
          </p>
          <p style={{ fontSize: 14, color: "var(--color-ink-400)" }}>
            {canUpload ? t("dropOrBrowse") : t("attachmentsAppear")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((file) => {
            const isDeleting = deletingIds.has(file.id);
            const delErr = deleteErrors[file.id];
            const isImage = file.mime_type?.startsWith("image/");

            return (
              <div key={file.id}>
                <div
                  className="flex items-center"
                  style={{
                    borderRadius: "var(--radius-row)",
                    padding: "12px 14px",
                    background: "var(--color-surface-inner)",
                    gap: 12,
                    opacity: isDeleting ? 0.5 : 1,
                    transition: "opacity 150ms",
                  }}
                >
                  {/* Thumbnail or icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-input)",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "var(--color-ink-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isImage && file.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.signed_url}
                        alt={file.file_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <FileTypeIcon mime={file.mime_type} />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      className="truncate"
                      style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink-900)" }}
                    >
                      {file.file_name}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-ink-400)", marginTop: 2 }}>
                      {[
                        formatBytes(file.size_bytes),
                        file.uploader_name,
                        formatRelative(file.created_at, tFn),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      title={t("download")}
                      aria-label={t("download")}
                      disabled={isDeleting}
                      onClick={() => handleDownload(file.storage_path, file.file_name)}
                      style={{
                        width: 32, height: 32,
                        borderRadius: "999px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-ink-400)",
                      }}
                    >
                      <Download size={16} />
                    </button>
                    {canDelete(file) && !isDeleting && confirmDeleteId !== file.id && (
                      <button
                        type="button"
                        title={t("delete")}
                        aria-label={t("delete")}
                        onClick={() => setConfirmDeleteId(file.id)}
                        style={{
                          width: 32, height: 32,
                          borderRadius: "999px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--color-ink-400)",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {confirmDeleteId === file.id && (
                      <div className="flex items-center" style={{ gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(file.id)}
                          style={{
                            fontSize: 12, fontWeight: 500,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: "var(--color-crit-soft)",
                            color: "var(--color-crit)",
                            border: "none", cursor: "pointer",
                          }}
                        >
                          {t("delete")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            fontSize: 12, fontWeight: 500,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: "var(--color-ink-100)",
                            color: "var(--color-ink-600)",
                            border: "none", cursor: "pointer",
                          }}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {delErr && (
                  <p style={{ fontSize: 12, color: "var(--color-crit)", marginTop: 4, paddingInlineStart: 14 }}>
                    {delErr}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
