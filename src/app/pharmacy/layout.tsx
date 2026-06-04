"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Pill, LayoutDashboard, History, LogOut, Menu, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/pharmacy/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/pharmacy/herbs", label: "药材价格", icon: Pill },
  { href: "/pharmacy/prescriptions/recognize", label: "处方识别", icon: ScanLine },
  { href: "/pharmacy/history", label: "历史记录", icon: History },
];

function SidebarContent({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-emerald-100">
        <Link href="/pharmacy/dashboard" className="flex items-center gap-2" onClick={onNav}>
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
              onClick={onNav}
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
    </div>
  );
}

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-emerald-50/30">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-56 bg-white border-r border-emerald-100 flex-col shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile top bar + Sheet drawer */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-emerald-100 flex items-center px-3 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>药房导航</SheetTitle>
            </SheetHeader>
            <SidebarContent pathname={pathname} onNav={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/pharmacy/dashboard" className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-emerald-800">药房系统</span>
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-18 md:pt-6">
        {children}
      </main>
    </div>
  );
}
