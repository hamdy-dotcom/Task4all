"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface PickerPerson {
  id: string;
  full_name: string;
  title: string | null;
  role: string;
}

interface PeoplePickerProps {
  people: PickerPerson[];
  /** The form field name. Defaults to "assignees". */
  name?: string;
  defaultValue?: string[];
  onChange?: (ids: string[]) => void;
}

const ROLE_ORDER = ["super_admin", "admin", "team_leader", "team_member"];

// Avatar bg/fg per role — intentionally distinct from each other
const ROLE_AVATAR: Record<string, { bg: string; fg: string }> = {
  super_admin: { bg: "var(--color-nml)", fg: "#fff" },
  admin: { bg: "var(--color-ink-900)", fg: "#fff" },
  team_leader: { bg: "#B79A99", fg: "#fff" },
  team_member: { bg: "var(--color-ink-300)", fg: "var(--color-ink-700)" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function Avatar({
  person,
  size,
}: {
  person: PickerPerson;
  size: number;
}) {
  const colors = ROLE_AVATAR[person.role] ?? { bg: "var(--color-ink-300)", fg: "var(--color-ink-700)" };
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "999px",
        background: colors.bg,
        color: colors.fg,
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials(person.full_name)}
    </span>
  );
}

export default function PeoplePicker({
  people,
  name = "assignees",
  defaultValue = [],
  onChange,
}: PeoplePickerProps) {
  const t = useTranslations("common");
  const tProfile = useTranslations("profile");

  // Build role labels (string literals → validated by check-i18n)
  const roleLabels: Record<string, string> = {
    super_admin: tProfile("roles.super_admin"),
    admin: tProfile("roles.admin"),
    team_leader: tProfile("roles.team_leader"),
    team_member: tProfile("roles.team_member"),
  };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [cursor, setCursor] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filtered + grouped list
  const q = query.trim().toLowerCase();
  const filtered = q
    ? people.filter((p) => p.full_name.toLowerCase().includes(q))
    : people;

  const groups = ROLE_ORDER.map((role) => ({
    role,
    label: roleLabels[role] ?? role,
    people: filtered.filter((p) => p.role === role),
  })).filter((g) => g.people.length > 0);

  // Flat ordered list for keyboard navigation
  const flatList = groups.flatMap((g) => g.people);

  const toggle = useCallback((id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setSelected(next);
    onChange?.(next);
  }, [selected, onChange]);

  const openPicker = () => {
    setOpen(true);
    setCursor(-1);
    // Focus search after paint
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const closePicker = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(-1);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) closePicker();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closePicker]);

  // Scroll cursor row into view
  useEffect(() => {
    if (cursor < 0 || !listRef.current) return;
    const rows = listRef.current.querySelectorAll<HTMLElement>("[data-row]");
    rows[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function handleTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  }

  function handleSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePicker();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (cursor >= 0 && flatList[cursor]) toggle(flatList[cursor].id);
    }
  }

  function handleRowKey(e: KeyboardEvent<HTMLLIElement>, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(id);
    } else if (e.key === "Escape") {
      closePicker();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
  }

  const selectedPeople = selected
    .map((id) => people.find((p) => p.id === id))
    .filter(Boolean) as PickerPerson[];

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Hidden inputs for form submission */}
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={open ? closePicker : openPicker}
        onKeyDown={handleTriggerKey}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          minHeight: 44,
          width: "100%",
          padding: "6px 12px 6px 10px",
          borderRadius: "var(--radius-input)",
          border: `1px solid ${open ? "var(--color-ink-900)" : "var(--color-ink-200)"}`,
          background: "var(--color-surface)",
          cursor: "pointer",
          textAlign: "start",
          fontFamily: "inherit",
          transition: "border-color 150ms",
          boxSizing: "border-box",
        }}
      >
        {selectedPeople.length === 0 ? (
          <span
            style={{
              flex: 1,
              fontSize: 15,
              color: "var(--color-ink-400)",
              lineHeight: "30px",
            }}
          >
            {t("assignees")}
          </span>
        ) : (
          <>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
              {selectedPeople.map((p) => (
                <span
                  key={p.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 30,
                    padding: "0 8px 0 4px",
                    borderRadius: "999px",
                    background: "var(--color-ink-100)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-ink-900)",
                    flexShrink: 0,
                    maxWidth: "100%",
                  }}
                >
                  <Avatar person={p} size={22} />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 140,
                    }}
                  >
                    {p.full_name}
                  </span>
                  {/* chip ×: stop propagation so it doesn't toggle the dropdown */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${t("remove")} ${p.full_name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        toggle(p.id);
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 16,
                      height: 16,
                      borderRadius: "999px",
                      background: "var(--color-ink-300)",
                      color: "var(--color-ink-700)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <X size={10} strokeWidth={2.5} />
                  </span>
                </span>
              ))}
            </span>
          </>
        )}
        <ChevronDown
          size={16}
          strokeWidth={2}
          style={{
            color: "var(--color-ink-400)",
            flexShrink: 0,
            marginInlineStart: "auto",
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            zIndex: 50,
            background: "var(--color-surface)",
            borderRadius: "var(--radius-inner)",
            boxShadow: "var(--shadow-pop)",
            padding: 8,
            maxHeight: "min(320px, 50vh)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: "0 4px 6px",
              borderBottom: "1px solid var(--color-ink-200)",
              marginBottom: 6,
              flexShrink: 0,
            }}
          >
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(-1);
              }}
              onKeyDown={handleSearchKey}
              placeholder={t("search")}
              aria-label={t("search")}
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px",
                borderRadius: "999px",
                border: "1px solid var(--color-ink-200)",
                background: "var(--color-surface-inner)",
                fontSize: 14,
                color: "var(--color-ink-900)",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* List */}
          <ul
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {flatList.length === 0 ? (
              <li
                style={{
                  padding: "12px 10px",
                  fontSize: 13,
                  color: "var(--color-ink-400)",
                  textAlign: "center",
                }}
              >
                {t("noMatch")}
              </li>
            ) : (
              groups.map((group) => {
                const groupStart = flatList.findIndex((p) =>
                  group.people.some((gp) => gp.id === p.id)
                );
                return (
                  <li key={group.role}>
                    {/* Group header */}
                    <div
                      style={{
                        padding: "4px 10px 2px",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--color-ink-400)",
                      }}
                    >
                      {group.label}
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {group.people.map((person, i) => {
                        const flatIdx = groupStart + i;
                        const isSelected = selected.includes(person.id);
                        const isCursored = cursor === flatIdx;
                        return (
                          <li
                            key={person.id}
                            role="option"
                            aria-selected={isSelected}
                            data-row
                            tabIndex={-1}
                            onClick={() => toggle(person.id)}
                            onKeyDown={(e) => handleRowKey(e, person.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              minHeight: 44,
                              padding: "6px 10px",
                              borderRadius: "var(--radius-row)",
                              background: isCursored
                                ? "var(--color-surface-inner)"
                                : "transparent",
                              cursor: "pointer",
                              userSelect: "none",
                              transition: "background 100ms",
                            }}
                            onMouseEnter={() => setCursor(flatIdx)}
                            onMouseLeave={() => setCursor(-1)}
                          >
                            <Avatar person={person} size={32} />
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: "var(--color-ink-900)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {person.full_name}
                              </span>
                              {person.title && (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: 12,
                                    color: "var(--color-ink-400)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {person.title}
                                </span>
                              )}
                            </span>
                            {isSelected && (
                              <Check
                                size={16}
                                strokeWidth={2.5}
                                style={{
                                  color: "var(--color-nml)",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
