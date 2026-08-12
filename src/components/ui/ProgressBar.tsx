interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
}

export default function ProgressBar({
  progress,
  showLabel = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: 8,
          borderRadius: 999,
          background: "var(--color-ink-100)",
          overflow: "hidden",
        }}
      >
        {pct > 0 && (
          <div
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              background: "var(--color-nml)",
              borderRadius: 999,
            }}
          />
        )}
      </div>

      {showLabel && (
        <span
          className="tnum"
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: "20px",
            color: "var(--color-ink-900)",
            minWidth: 36,
            textAlign: "end",
          }}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
