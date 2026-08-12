"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, ChevronDown, Menu, ArrowLeft } from "lucide-react";
import type { Database } from "@/lib/database.types";
import type { ViewportMode } from "./AppShell";
import NotificationBell, { type BellNotification } from "./NotificationBell";
import { setLocale } from "@/app/(app)/actions";

type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "title" | "avatar_url"
>;

interface TopBarProps {
  profile: Profile;
  unreadCount?: number;
  notifications?: BellNotification[];
  mode: ViewportMode;
  onMenuOpen: () => void;
}

// ── Language switcher dropdown ──────────────────────────────────────────────

function UserChipDropdown({ profile, isMobile }: { profile: Profile; isMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const t = useTranslations("nav");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const avatar = profile.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.full_name}
      width={isMobile ? 36 : 40}
      height={isMobile ? 36 : 40}
      style={{
        borderRadius: "999px",
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
    />
  ) : (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: isMobile ? 36 : 40,
        height: isMobile ? 36 : 40,
        borderRadius: "999px",
        background: "var(--color-ink-100)",
        fontSize: isMobile ? 12 : 14,
        fontWeight: 600,
        color: "var(--color-ink-700)",
      }}
    >
      {initials}
    </div>
  );

  function handleSetLocale(next: "en" | "ar") {
    setOpen(false);
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  if (isMobile) {
    return (
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ display: "flex", flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          aria-label={t("myProfile")}
          aria-expanded={open}
        >
          {avatar}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              className="absolute z-50"
              style={{
                top: 44,
                insetInlineEnd: 0,
                width: 200,
                borderRadius: 14,
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-overlay)",
                border: "1px solid var(--color-surface-inner)",
                overflow: "hidden",
              }}
            >
              <DropdownContent
                locale={locale}
                isPending={isPending}
                onSetLocale={handleSetLocale}
                onClose={() => setOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center shrink-0 glass-card"
        style={{
          height: 52,
          borderRadius: "999px",
          padding: "6px 16px 6px 6px",
          gap: 10,
          boxShadow: "var(--shadow-raised)",
          border: "none",
          background: "none",
          cursor: "pointer",
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatar}

        <div className="flex flex-col" style={{ gap: 2 }}>
          <span
            style={{
              fontSize: 14,
              lineHeight: "20px",
              fontWeight: 600,
              color: "var(--color-ink-900)",
              whiteSpace: "nowrap",
            }}
          >
            {profile.full_name}
          </span>
          <span
            className="truncate"
            style={{
              fontSize: 13,
              lineHeight: "18px",
              color: "var(--color-ink-400)",
              maxWidth: 140,
              minHeight: 18,
            }}
          >
            {profile.title ?? ""}
          </span>
        </div>

        <ChevronDown
          size={16}
          color="var(--color-ink-400)"
          style={{
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="absolute z-50"
            style={{
              top: 60,
              insetInlineEnd: 0,
              width: 220,
              borderRadius: 16,
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-overlay)",
              border: "1px solid var(--color-surface-inner)",
              overflow: "hidden",
            }}
          >
            <DropdownContent
              locale={locale}
              isPending={isPending}
              onSetLocale={handleSetLocale}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function DropdownContent({
  locale,
  isPending,
  onSetLocale,
  onClose,
}: {
  locale: string;
  isPending: boolean;
  onSetLocale: (l: "en" | "ar") => void;
  onClose: () => void;
}) {
  const t = useTranslations("nav");

  return (
    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* My profile link */}
      <Link
        href="/profile"
        onClick={onClose}
        style={{
          display: "block",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--color-ink-900)",
          textDecoration: "none",
          transition: "background 100ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-inner)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {t("myProfile")}
      </Link>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--color-ink-200)", margin: "4px 0" }} />

      {/* Language toggle */}
      <div style={{ padding: "6px 14px 8px" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-ink-400)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {t("language")}
        </p>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--color-surface-inner)",
            borderRadius: 999,
            padding: 3,
          }}
        >
          {(["en", "ar"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => lang !== locale && onSetLocale(lang)}
              disabled={isPending}
              style={{
                flex: 1,
                height: 30,
                borderRadius: 999,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: lang === locale ? "default" : "pointer",
                transition: "background 150ms, color 150ms",
                background: lang === locale ? "var(--color-surface)" : "transparent",
                color: lang === locale ? "var(--color-ink-900)" : "var(--color-ink-400)",
                boxShadow: lang === locale ? "var(--shadow-raised)" : "none",
              }}
            >
              {lang === "en" ? t("english") : t("arabic")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TopBar ──────────────────────────────────────────────────────────────────

export default function TopBar({
  profile,
  unreadCount = 0,
  notifications = [],
  mode,
  onMenuOpen,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const locale = useLocale();
  const isMobile = mode === "drawer";
  const t = useTranslations("nav");

  const searchPlaceholder = t("search");
  const closeSearchLabel = t("closeSearch");
  const openMenuLabel = t("openMenu");

  // Mobile: search overlay
  if (isMobile && searchOpen) {
    return (
      <header
        className="flex items-center gap-3 shrink-0"
        style={{
          height: 64,
          padding: "0 16px",
          borderBottom: "1px solid var(--color-surface-inner)",
        }}
      >
        <button
          onClick={() => setSearchOpen(false)}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: "999px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-ink-900)",
          }}
          aria-label={closeSearchLabel}
        >
          {/* ArrowLeft points to inline-start; flip in RTL so it points the correct way */}
          <span className="flip-rtl flex items-center">
            <ArrowLeft size={20} />
          </span>
        </button>
        <input
          autoFocus
          type="search"
          placeholder={searchPlaceholder}
          className="flex-1 bg-transparent outline-none"
          style={{
            fontSize: 15,
            color: "var(--color-ink-900)",
            border: "none",
          }}
        />
      </header>
    );
  }

  // Mobile header
  if (isMobile) {
    return (
      <header
        className="flex items-center gap-2 shrink-0"
        style={{ height: 64, padding: "0 12px" }}
      >
        {/* Hamburger */}
        <button
          onClick={onMenuOpen}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: "999px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-ink-900)",
          }}
          aria-label={openMenuLabel}
        >
          <Menu size={22} />
        </button>

        {/* Logo mark */}
        <img
          src="/brand/logo-mark.png"
          alt="task4all"
          style={{ width: 32, height: 32, display: "block", flexShrink: 0 }}
        />

        <div className="flex-1" />

        {/* Search icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: "999px",
            border: "none",
            background: "var(--color-surface-inner)",
            cursor: "pointer",
          }}
          aria-label={searchPlaceholder}
        >
          <Search size={18} color="var(--color-ink-400)" strokeWidth={1.75} />
        </button>

        {/* Bell */}
        <NotificationBell
          unreadCount={unreadCount}
          notifications={notifications}
          isMobile
        />

        {/* Avatar / dropdown */}
        <UserChipDropdown profile={profile} isMobile />
      </header>
    );
  }

  // Desktop / tablet header (≥768px)
  return (
    <header
      className="flex items-center gap-3 shrink-0"
      style={{ height: 80, padding: "0 24px" }}
    >
      {/* Search pill */}
      <div
        className="flex items-center flex-1 glass-card"
        style={{
          height: 52,
          borderRadius: "999px",
          padding: "0 20px",
          gap: 12,
        }}
      >
        <Search size={20} color="var(--color-ink-400)" strokeWidth={1.75} />
        <span
          style={{
            fontSize: 15,
            color: "var(--color-ink-400)",
            userSelect: "none",
          }}
        >
          {searchPlaceholder}
        </span>
      </div>

      {/* Bell */}
      <NotificationBell
        unreadCount={unreadCount}
        notifications={notifications}
      />

      {/* User chip with dropdown */}
      <UserChipDropdown profile={profile} />
    </header>
  );
}
