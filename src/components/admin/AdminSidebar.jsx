"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePendingReviewCount } from "@/lib/hooks/usePendingReviewCount";
import { NrepLogo } from "@/components/brand/NrepLogo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  PlusCircle,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Bell,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canCreateRecommendations } from "@/lib/recommendation-assignees";
import { getFirstName } from "@/lib/greeting";

/**
 * Sidebar patterned after NREP-HR-project `sidebar.module.css`:
 * teal gradient, soft active state, gold inset accent — not a gold pill fill.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showCreate = canCreateRecommendations(user?.email);
  const pendingReviews = usePendingReviewCount();
  const firstName = getFirstName(user);

  /** @type {{ href: string; label: string; icon: typeof Bell; exact: boolean; badge?: number }[]} */
  const navItems = [
    {
      href: "/admin",
      label: "Recommendations",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/assignments",
      label: "Assignments",
      icon: ClipboardList,
      exact: false,
    },
    {
      href: "/admin/reviews",
      label: "Review inbox",
      icon: Bell,
      exact: false,
      badge: pendingReviews,
    },
  ];
  if (showCreate) {
    navItems.push({
      href: "/admin/new",
      label: "New Recommendation",
      icon: PlusCircle,
      exact: false,
    });
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  /**
   * @param {string} href
   * @param {boolean} exact
   */
  const isActive = (href, exact) =>
    exact ? pathname === href : pathname.startsWith(href);

  /**
   * @param {string} href
   * @param {string} label
   * @param {typeof Bell} Icon
   * @param {boolean} exact
   * @param {number | undefined} badge
   */
  const navLink = (href, label, Icon, exact, badge) => {
    const active = isActive(href, exact);
    const showBadge = typeof badge === "number" && badge > 0;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "relative mx-2 flex items-center gap-3 rounded-lg px-4 py-3 text-[0.9rem] font-medium transition-all duration-200",
          active
            ? "bg-white/20 text-white shadow-[inset_3px_0_0_0_#EFA74F]"
            : "text-white/90 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
        )}
      >
        {active && (
          <span
            className="absolute -left-2 top-1/2 h-[60%] w-1 -translate-y-1/2 rounded-r bg-secondary"
            aria-hidden
          />
        )}
        <Icon className="h-5 w-5 shrink-0 opacity-90" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {showBadge && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold tabular-nums text-white shadow-sm ring-2 ring-white/25"
            aria-label={`${badge} unread notifications`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className="shrink-0 border-b border-white/10 px-6 py-8">
        <Link
          href="/admin"
          className="flex flex-col items-center gap-4"
          onClick={() => setMobileOpen(false)}
        >
          <div className="mx-auto flex w-fit items-center justify-center rounded-2xl bg-white px-5 py-3.5 ring-1 ring-black/5">
            <NrepLogo height={64} priority />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold tracking-wide text-secondary">
              REC Portal
            </p>
            <p className="mt-1 text-sm font-light text-white/65">
              Recommendations & Actions
            </p>
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 pr-1">
        <div className="mb-1 px-4 pb-2 pt-1">
          <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/80">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            Core
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon, exact, badge }) =>
            navLink(href, label, Icon, exact, badge)
          )}
        </div>

        <div className="mb-1 mt-5 px-4 pb-2 pt-1">
          <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/80">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Links
          </p>
        </div>
        <div className="flex flex-col gap-0.5 pb-1">
          <Link
            href="/guest"
            target="_blank"
            className="relative mx-2 flex items-center gap-3 rounded-lg px-4 py-3 text-[0.9rem] font-medium text-white/90 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-5 w-5 shrink-0 opacity-90" />
            <span className="flex-1">Public Site</span>
          </Link>
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 px-3 py-2.5">
        <div className="mb-1.5 flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white">
            {(firstName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">
              {firstName || "User"}
            </p>
            <p className="truncate text-[10px] leading-tight text-white/60" title={user?.email}>
              {user?.email || "—"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="h-8 w-full justify-start gap-2 px-2 text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-gradient-to-r from-primary-light to-primary px-4 text-white shadow-md lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <NrepLogo height={32} className="relative z-10" />
          <span className="text-sm font-semibold">REC Portal</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="relative h-11 w-11 text-white hover:bg-white/10"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          {pendingReviews > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white">
              {pendingReviews > 99 ? "99+" : pendingReviews}
            </span>
          )}
        </Button>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[4px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col overflow-hidden text-white shadow-xl transition-transform duration-300 lg:hidden",
          "bg-gradient-to-b from-primary-light to-primary",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 flex-col overflow-hidden bg-gradient-to-b from-primary-light to-primary text-white shadow-lg lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
