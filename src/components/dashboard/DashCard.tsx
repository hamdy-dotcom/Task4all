import React from "react";
import { Num } from "@/components/ui/Num";

export function DashCard({
  title,
  count,
  right,
  children,
}: {
  title: string;
  count?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="glass-card"
      style={{
        borderRadius: "var(--radius-card)",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              lineHeight: "26px",
              color: "var(--color-ink-900)",
            }}
          >
            {title}
          </h2>
          {count !== undefined && (
            <span
              className="tnum"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--color-ink-100)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink-600)",
              }}
            >
              <Num>{count}</Num>
            </span>
          )}
        </div>
        {right && <div>{right}</div>}
      </div>
      {children}
    </div>
  );
}
