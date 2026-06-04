"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Pill, LayoutDashboard, History, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/pharmacy/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/pharmacy/herbs", label: "药材价格", icon: Pill },
  { href: "/pharmacy/history", label: "历史记录", icon: History },
];

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-emerald-50/30">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-emerald-100 flex flex-col">
        <div className="p-4 border-b border-emerald-100">
          <Link href="/pharmacy/dashboard" className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-emerald-800 text-lg">药房系统</span>
          </Link>
          <p className="text-xs text-emerald-500 mt-1">药谷云阁 · 药材管理</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-emerald-100">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-700 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
