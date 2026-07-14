"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { NrepLogo } from "@/components/brand/NrepLogo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  PlusCircle,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navLinkClass =
  "flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-colors";

const navItems = [
  { href: "/admin", label: "Recommendations", icon: LayoutDashboard, exact: true },
  { href: "/admin/new", label: "New Recommendation", icon: PlusCircle, exact: false },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const sidebarContent = (
    <>
      <div className="px-6 py-8 border-b border-white/10">
        <Link
          href="/admin"
          className="flex flex-col items-center gap-4"
          onClick={() => setMobileOpen(false)}
        >
          <div className="relative mx-auto flex w-fit items-center justify-center py-2">
            <div className="sidebar-logo-wash" aria-hidden />
            <NrepLogo height={76} priority className="relative z-10" />
          </div>
          <div className="text-center">
            <p className="text-secondary font-bold text-base tracking-wide">
              REC Portal
            </p>
            <p className="text-white/65 text-sm font-light mt-1">
              Recommendations & Actions
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                navLinkClass,
                active
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}

        <Link
          href="/guest"
          target="_blank"
          className={cn(
            navLinkClass,
            "text-white/75 hover:bg-white/10 hover:text-white"
          )}
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          Public Site
        </Link>
      </nav>

      <div className="px-4 py-6 border-t border-white/10 space-y-3">
        {user && (
          <p
            className="px-4 text-sm text-white/55 truncate"
            title={user.email}
          >
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-11 justify-start gap-3 px-4 text-[15px] font-semibold text-white/75 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-primary text-white shadow-md h-16 flex items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="relative flex w-fit items-center justify-center">
            <div className="sidebar-logo-wash sidebar-logo-wash--sm" aria-hidden />
            <NrepLogo height={36} className="relative z-10" />
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="h-11 w-11 text-white hover:bg-white/10"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "lg:hidden fixed top-16 left-0 bottom-0 z-30 w-72 bg-primary text-white flex flex-col shadow-xl transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-30 w-72 bg-primary text-white flex-col shadow-lg">
        {sidebarContent}
      </aside>
    </>
  );
}
