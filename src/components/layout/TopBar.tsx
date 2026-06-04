"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
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
import { Eye, EyeOff, LogOut, Menu, User } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理员",
  DOCTOR: "执业医师",
  ASSISTANT: "医馆助理",
};

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuthStore();
  const { elderlyMode, toggleElderlyMode } = useUIStore();
  const router = useRouter();

  if (!user) return null;

  const initials = user.name.slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-card/80 backdrop-blur-md px-4 md:px-6 topbar-fret">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden hover:bg-muted"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">菜单</span>
      </Button>

      {/* Desktop: centered brand name */}
      <div className="hidden md:flex flex-1 justify-center">
        <span className="brand-underline text-sm font-serif font-semibold text-foreground/80 tracking-[0.15em]">
          药谷云阁中医大健康平台
        </span>
      </div>
      <div className="flex-1 md:hidden" />

      {/* Elderly mode toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleElderlyMode}
        className="flex items-center gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground mr-1"
        title={elderlyMode ? "切换标准模式" : "切换老花模式"}
      >
        {elderlyMode ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        <span className="hidden sm:inline text-xs">
          {elderlyMode ? "标准" : "老花"}
        </span>
      </Button>

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
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">{user.name}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
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
  );
}
