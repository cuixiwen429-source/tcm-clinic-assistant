"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import {
  LayoutDashboard, Users, PenTool, Leaf, Settings, Shield,
  Stethoscope,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/patients", label: "患者管理", icon: Users },
  { href: "/consultations/new", label: "新建就诊", icon: Stethoscope },
  { href: "/settings/herbs", label: "药材管理", icon: Leaf, roles: ["ADMIN", "DOCTOR"] },
  { href: "/settings/rules", label: "规则配置", icon: Shield, roles: ["ADMIN"] },
];

interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-full flex-col border-r border-primary/10 bg-card">
      {/* Brand header */}
      <div className="flex h-14 items-center border-b border-primary/10 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
          onClick={onNavClick}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shadow-sm">
            <PenTool className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">经方辅助诊疗</span>
            <span className="text-[10px] text-muted-foreground">TCM Assistant</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-primary/10 p-3">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          执业中医师内部辅助工具
          <br />
          AI学术参考 · 医师最终确认
        </p>
      </div>
    </div>
  );
}
