"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, UserRound, Calendar, Pill,
  Loader2, LogOut, User,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "控制台", icon: LayoutDashboard },
  { href: "/admin/users", label: "医师管理", icon: UserRound },
  { href: "/admin/patients", label: "患者管理", icon: Users },
  { href: "/admin/consultations", label: "就诊管理", icon: Calendar },
  { href: "/admin/prescriptions", label: "处方管理", icon: Pill },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchUser, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user && user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">无权限访问，正在跳转...</p>
      </div>
    );
  }

  const initials = user.name.slice(0, 2);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-primary/10 bg-card/80 backdrop-blur-md px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-serif font-bold tracking-wide text-foreground">系统管理</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded hidden sm:inline">ADMIN</span>
        </div>

        <div className="hidden md:flex flex-1 justify-center">
          <span className="text-sm font-serif font-semibold text-foreground/80 tracking-[0.15em]">
            药谷云阁中医大健康平台
          </span>
        </div>
        <div className="flex-1 md:hidden" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2.5 hover:bg-muted px-2">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left text-sm">
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">系统管理员</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm">{user.name}</span>
                  <span className="text-xs text-muted-foreground">系统管理员</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-14 bottom-0 z-20 w-44 border-r border-primary/10 bg-card hidden md:block">
          <nav className="flex flex-col gap-0.5 p-2 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav tabs */}
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-card border-b border-primary/10 overflow-x-auto">
          <div className="flex px-2 py-1 gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="md:ml-44 mt-10 md:mt-0 flex-1">
          <main className="p-3 md:p-6 max-w-full overflow-x-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
