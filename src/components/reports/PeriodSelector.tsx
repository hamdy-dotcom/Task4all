"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React from "react";

const PERIODS = [
  { value: "week",    label: "Week" },
  { value: "month",   label: "Month" },
  { value: "quarter", label: "Quarter" },
] as const;

export function PeriodSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(period: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("period", period);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--color-ink-100)",
        borderRadius: 999,
        padding: 4,
        gap: 2,
      }}
    >
      {PERIODS.map((p) => {
        const active = current === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => select(p.value)}
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              background: active ? "var(--color-ink-900)" : "transparent",
              color: active ? "#fff" : "var(--color-ink-700)",
              transition: "background 150ms, color 150ms",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
