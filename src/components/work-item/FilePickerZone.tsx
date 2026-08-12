"use client";

import { useRef, useState } from "react";
import { Upload, X, File, FileImage, FileText, FileSpreadsheet, FileArchive } from "lucide-react";
import { useTranslations } from "next-intl";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mime }: { mime: string }) {
  const size = 16;
  const stroke = 1.5;
  if (mime.startsWith("image/")) return <FileImage size={size} strokeWidth={stroke} style={{ color: "var(--color-nml)" }} />;
  if (mime === "application/pdf") return <FileText size={size} strokeWidth={stroke} style={{ color: "#E74C3C" }} />;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return <FileSpreadsheet size={size} strokeWidth={stroke} style={{ color: "#27AE60" }} />;
  if (mime.includes("zip") || mime.includes("archive") || mime.includes("tar")) return <FileArchive size={size} strokeWidth={stroke} style={{ color: "var(--color-warn)" }} />;
  return <File size={size} strokeWidth={stroke} style={{ color: "var(--color-ink-400)" }} />;
}

interface FilePickerZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function FilePickerZone({ files, onChange, disabled }: FilePickerZoneProps) {
  const t = useTranslations("common");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list).filter((f) => f.size > 0);
    if (arr.length === 0) return;
    onChange([...files, ...arr]);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--color-nml)" : "var(--color-ink-200)"}`,
          borderRadius: "var(--radius-inner)",
          padding: "24px 20px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: isDragging
            ? "color-mix(in srgb, var(--color-nml) 4%, transparent)"
            : "var(--color-surface-inner)",
          transition: "border-color 150ms, background 150ms",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload
          size={22}
          strokeWidth={1.5}
          style={{
            color: isDragging ? "var(--color-nml)" : "var(--color-ink-300)",
            marginBottom: 8,
          }}
        />
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-ink-900)", marginBottom: 3 }}>
          {t("dropFilesOr")}{" "}
          <span style={{ color: "var(--color-nml)" }}>{t("browse")}</span>
        </p>
        <p style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
          {t("anyFileType")}
        </p>
      </div>

      {/* Privacy notice */}
      <p style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
        {t("filesPrivacy")}
      </p>

      {/* Pending file list */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center"
              style={{
                gap: 10,
                padding: "8px 12px",
                borderRadius: "var(--radius-row)",
                background: "var(--color-surface-inner)",
              }}
            >
              <FileTypeIcon mime={file.type || ""} />
              <span
                className="truncate"
                style={{ flex: 1, fontSize: 13, color: "var(--color-ink-900)" }}
              >
                {file.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-ink-400)", flexShrink: 0 }}>
                {formatBytes(file.size)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  style={{
                    display: "flex",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-ink-400)",
                    padding: 2,
                    flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
