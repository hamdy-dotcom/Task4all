"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import type { Database } from "@/lib/database.types";
import type { BellNotification } from "./NotificationBell";

export type ViewportMode = "expanded" | "icon" | "drawer";

export type ShellProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "title" | "role" | "avatar_url"
>;

interface AppShellProps {
  profile: ShellProfile;
  pendingCount: number;
  unreadCount: number;
  notifications: BellNotification[];
  children: React.ReactNode;
}

function getMode(w: number): ViewportMode {
  if (w < 768) return "drawer";
  if (w < 1100) return "icon";
  return "expanded";
}

export default function AppShell({
  profile,
  pendingCount,
  unreadCount,
  notifications,
  children,
}: AppShellProps) {
  const [mode, setMode] = useState<ViewportMode>("expanded");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const pathname = usePathname();

  // Sync mode to viewport width
  useEffect(() => {
    const sync = () => setMode(getMode(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    const shouldLock = mode === "drawer" && drawerOpen;
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mode, drawerOpen]);

  // icon mode always collapsed; expanded mode respects manual toggle; drawer always expanded
  const collapsed =
    mode === "icon" || (mode === "expanded" && manualCollapsed);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleCollapse = useCallback(
    () => setManualCollapsed((v) => !v),
    []
  );

  return (
    <div
      className="flex h-screen overflow-hidden canvas-wash"
    >
      {/* Semi-transparent backdrop behind the mobile drawer */}
      {mode === "drawer" && drawerOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(32,31,30,.5)" }}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <Sidebar
        profile={profile}
        pendingCount={pendingCount}
        mode={mode}
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onCollapseToggle={toggleCollapse}
        onDrawerClose={closeDrawer}
      />

      {/* Right side: TopBar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          profile={profile}
          mode={mode}
          onMenuOpen={openDrawer}
          unreadCount={unreadCount}
          notifications={notifications}
        />

        <main
          className="flex-1 overflow-auto"
          style={{ padding: "16px 24px 24px" }}
        >
          {/*
           * flex-wrap layout: content card + right rail.
           * Rail is basis-full (<1440px → wraps below) or basis-[340px] (≥1440px → sits beside).
           */}
          <div
            className="glass-card"
            style={{
              borderRadius: "var(--radius-card)",
              padding: 24,
              minHeight: "100%",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
