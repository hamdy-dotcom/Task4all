"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Star,
  Flag,
  CheckSquare,
  CornerDownRight,
  ThumbsUp,
  Users,
  CalendarDays,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { Database } from "@/lib/database.types";
import { signOut } from "@/app/(app)/actions";
import type { ViewportMode } from "./AppShell";

type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "title" | "role"
>;

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: Database["public"]["Enums"]["user_role"][];
  badge?: number;
};

function buildNavItems(
  role: Database["public"]["Enums"]["user_role"],
  pendingCount: number,
  t: (key: string) => string
): NavItem[] {
  const all: NavItem[] = [
    { label: t("dashboard"), href: "/", icon: <LayoutDashboard size={18} /> },
    { label: t("northStar"), href: "/north-star", icon: <Star size={18} /> },
    { label: t("initiatives"), href: "/initiatives", icon: <Flag size={18} /> },
    { label: t("tasks"), href: "/tasks", icon: <CheckSquare size={18} /> },
    { label: t("subtasks"), href: "/subtasks", icon: <CornerDownRight size={18} /> },
    {
      label: t("approvals"),
      href: "/approvals",
      icon: <ThumbsUp size={18} />,
      roles: ["super_admin", "admin", "team_leader"],
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: t("meetings"),
      href: "/meetings",
      icon: <CalendarDays size={18} />,
    },
    {
      label: t("teams"),
      href: "/teams",
      icon: <Users size={18} />,
      roles: ["super_admin", "admin"],
    },
  ];
  return all.filter((item) => !item.roles || item.roles.includes(role));
}

interface SidebarProps {
  profile: Profile;
  pendingCount: number;
  mode: ViewportMode;
  collapsed: boolean;
  drawerOpen: boolean;
  onCollapseToggle: () => void;
  onDrawerClose: () => void;
}

export default function Sidebar({
  profile,
  pendingCount,
  mode,
  collapsed,
  drawerOpen,
  onCollapseToggle,
  onDrawerClose,
}: SidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const t = useTranslations("nav");

  const navItems = buildNavItems(profile.role, pendingCount, t);
  const isDrawer = mode === "drawer";
  const showLabels = !collapsed;

  // Escape key closes the drawer
  useEffect(() => {
    if (!isDrawer || !drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDrawerClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDrawer, drawerOpen, onDrawerClose]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Drawer slides in from inline-start (left in LTR, right in RTL)
  const drawerTranslate = drawerOpen
    ? "translateX(0)"
    : isRTL
      ? "translateX(100%)"
      : "translateX(-100%)";

  const navStyle: React.CSSProperties = isDrawer
    ? {
        position: "fixed",
        zIndex: 50,
        top: 0,
        insetInlineStart: 0,
        bottom: 0,
        width: 260,
        minWidth: 260,
        maxWidth: 260,
        overflow: "hidden",
        transform: drawerTranslate,
        transition: "transform 250ms cubic-bezier(.4,0,.2,1)",
      }
    : {
        width: collapsed ? 72 : 260,
        minWidth: collapsed ? 72 : 260,
        maxWidth: collapsed ? 72 : 260,
        flexShrink: 0,
        overflow: "hidden",
        transition:
          "width 200ms cubic-bezier(.4,0,.2,1), min-width 200ms cubic-bezier(.4,0,.2,1), max-width 200ms cubic-bezier(.4,0,.2,1)",
      };

  return (
    <nav
      className="flex flex-col h-full glass-sidebar"
      style={navStyle}
      aria-label={t("mainNav")}
    >
      {/* Logo block */}
      <div
        className="flex items-center px-4"
        style={{ height: 64, gap: 10, minHeight: 64 }}
      >
        {/* Mark — always visible; sits on inline-start in both LTR and RTL */}
        <img
          src="/brand/logo-mark.png"
          alt="task4all"
          style={{ width: 36, height: 36, flexShrink: 0, display: "block" }}
        />

        {/* Wordmark — hidden when collapsed */}
        {showLabels && (
          <span
            className="flex-1 font-semibold"
            style={{
              fontSize: 13,
              lineHeight: "18px",
              color: "var(--color-ink-900)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("appName")}
          </span>
        )}

        {/* Drawer: ✕ close button */}
        {isDrawer && (
          <button
            onClick={onDrawerClose}
            className="flex items-center justify-center shrink-0 ms-auto"
            style={{
              width: 44,
              height: 44,
              borderRadius: "999px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-ink-400)",
            }}
            aria-label={t("closeMenu")}
          >
            <X size={20} />
          </button>
        )}

        {/* Non-drawer: collapse toggle */}
        {!isDrawer && (
          <button
            onClick={onCollapseToggle}
            className="flex items-center justify-center shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: "999px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-ink-400)",
              marginInlineStart: collapsed ? "auto" : 0,
            }}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            {/* Icon: in LTR collapsed=right, expanded=left. flip-rtl mirrors both. */}
            <span className="flex items-center flip-rtl">
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </span>
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex flex-col flex-1 px-3 pt-1 pb-1" style={{ gap: 4 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className="flex items-center relative"
              style={{
                height: 44,
                borderRadius: "999px",
                padding: collapsed ? "0 12px" : "0 16px",
                gap: 12,
                textDecoration: "none",
                background: active
                  ? "var(--color-sidebar-active)"
                  : "transparent",
                boxShadow: active ? "var(--shadow-raised)" : "none",
                color: active ? "var(--color-ink-900)" : "var(--color-ink-700)",
                fontSize: 14,
                fontWeight: 500,
                justifyContent: collapsed ? "center" : "flex-start",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  e.currentTarget.style.background = "rgba(255,255,255,.6)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  color: active ? "var(--color-nml)" : "var(--color-ink-600)",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>

              {showLabels && (
                <span className="flex-1 truncate">{item.label}</span>
              )}

              {/* Badge */}
              {showLabels && item.badge !== undefined && (
                <span
                  className="flex items-center justify-center tnum"
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: "999px",
                    background: "var(--color-nml)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "0 6px",
                  }}
                >
                  <bdi>{item.badge}</bdi>
                </span>
              )}
              {!showLabels && item.badge !== undefined && (
                <span
                  className="absolute"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    background: "var(--color-nml)",
                    top: 6,
                    insetInlineEnd: 6,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer: Logout */}
      <div className="flex flex-col px-3 pb-4" style={{ gap: 4 }}>
        <form action={signOut}>
          <button
            type="submit"
            title={t("logout")}
            aria-label={t("logout")}
            className="flex items-center w-full"
            style={{
              height: 44,
              borderRadius: "999px",
              padding: collapsed ? "0 12px" : "0 16px",
              gap: 12,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-600)",
              fontSize: 14,
              fontWeight: 500,
              justifyContent: collapsed ? "center" : "flex-start",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                color: "var(--color-ink-600)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <LogOut size={18} />
            </span>
            {showLabels && (
              <span className="flex-1" style={{ textAlign: "start" }}>
                {t("logout")}
              </span>
            )}
          </button>
        </form>
      </div>
    </nav>
  );
}
