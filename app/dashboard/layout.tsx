"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutGrid,
  Calendar,
  Sparkles,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Content Queue", icon: LayoutGrid },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/generate", label: "Generate", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function WeekSummary() {
  const [summary, setSummary] = useState({ approved: 0, scheduled: 0, total: 21 });

  useEffect(() => {
    fetch("/api/content/list")
      .then((r) => r.json())
      .then((res) => {
        const pieces = res.data || [];
        const approved = pieces.filter(
          (p: { status: string }) => p.status === "approved" || p.status === "scheduled"
        ).length;
        const scheduled = pieces.filter(
          (p: { status: string }) => p.status === "scheduled"
        ).length;
        setSummary({ approved, scheduled, total: Math.max(pieces.length, 21) });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="border-t border-[#E5E5E5] pt-4 mt-4">
      <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mb-3">
        This Week
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#6B6B6B]">Approved</span>
          <span className="font-medium text-[#1A1A1A]">
            {summary.approved}/{summary.total}
          </span>
        </div>
        <div className="w-full bg-[#F0F0F0] rounded-full h-1.5">
          <div
            className="bg-[#C9A96E] h-1.5 rounded-full transition-all"
            style={{ width: `${(summary.approved / summary.total) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#6B6B6B]">Scheduled</span>
          <span className="font-medium text-[#1A1A1A]">
            {summary.scheduled}/{summary.total}
          </span>
        </div>
        <div className="w-full bg-[#F0F0F0] rounded-full h-1.5">
          <div
            className="bg-[#1565C0] h-1.5 rounded-full transition-all"
            style={{ width: `${(summary.scheduled / summary.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-[240px] flex-col bg-white border-r border-[#E5E5E5] z-40">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#C9A96E] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#1A1A1A] text-sm">
              DailyFreedom
            </span>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[#C9A96E]/10 text-[#C9A96E] font-medium"
                      : "text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-5">
          <WeekSummary />
          <button
            onClick={() => { window.location.href = "/api/auth/logout"; }}
            className="mt-4 flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#6B6B6B] hover:bg-[#FFEBEE] hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E5E5] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C9A96E] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-[#1A1A1A] text-sm">
            DailyFreedom
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-[#6B6B6B]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/20">
          <div className="absolute right-0 top-14 w-64 bg-white border-l border-[#E5E5E5] h-[calc(100vh-3.5rem)] p-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-[#C9A96E]/10 text-[#C9A96E] font-medium"
                        : "text-[#6B6B6B] hover:bg-[#F5F5F5]"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] z-40 flex">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive ? "text-[#C9A96E]" : "text-[#6B6B6B]"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label.split(" ").pop()}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="md:ml-[240px] min-h-screen pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
