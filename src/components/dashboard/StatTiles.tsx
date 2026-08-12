import React from "react";
import { Num } from "@/components/ui/Num";

export interface TileData {
  label: string;
  value: number | string;
  unit?: string;
  highlighted: boolean;
  delta?: {
    value: number;
    direction: "up" | "down";
    sentiment: "ok" | "alert";
  };
}

function DeltaPill({ delta, highlighted }: { delta: NonNullable<TileData["delta"]>; highlighted: boolean }) {
  const arrow = delta.direction === "up" ? "↑" : "↓";
  const color = delta.sentiment === "ok" ? "var(--color-ok)" : "var(--color-alert)";
  return (
    <span
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "3px 10px",
        borderRadius: 999,
        background: highlighted ? "#fff" : "var(--color-surface)",
        fontSize: 12,
        fontWeight: 600,
        color,
        boxShadow: "0 1px 2px rgba(32,31,30,.06)",
        whiteSpace: "nowrap",
      }}
    >
      {/* dir=ltr: arrow + number must never swap sides in RTL */}
      <bdi dir="ltr">{arrow} <Num>{Math.abs(delta.value)}</Num></bdi>
    </span>
  );
}

function Tile({ tile }: { tile: TileData }) {
  return (
    <div
      className={tile.highlighted ? undefined : "glass-card"}
      style={{
        position: "relative",
        flex: "1 1 0",
        minWidth: 160,
        background: tile.highlighted ? "var(--color-nml)" : undefined,
        borderRadius: "var(--radius-inner)",
        padding: 20,
        minHeight: 108,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 4,
      }}
    >
      {tile.delta && <DeltaPill delta={tile.delta} highlighted={tile.highlighted} />}

      {/*
        bdi dir="ltr": bidi-isolates value+unit so "42%" never becomes "% 42".
        Inline element — no flex gap — so there is zero space between number and unit.
      */}
      <bdi dir="ltr" style={{ lineHeight: 1.1 }}>
        <span
          className="tnum"
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: tile.highlighted ? "#fff" : "var(--color-ink-900)",
          }}
        >
          {tile.value}
        </span>
        {tile.unit && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: tile.highlighted ? "rgba(255,255,255,.7)" : "var(--color-ink-600)",
            }}
          >
            {tile.unit}
          </span>
        )}
      </bdi>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 400,
          color: tile.highlighted ? "rgba(255,255,255,.85)" : "var(--color-ink-600)",
          lineHeight: "20px",
        }}
      >
        {tile.label}
      </p>
    </div>
  );
}

export function StatTiles({ tiles }: { tiles: TileData[] }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {tiles.map((tile, i) => (
        <Tile key={i} tile={tile} />
      ))}
    </div>
  );
}
