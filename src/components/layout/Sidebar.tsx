"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import {
  LayoutDashboard, Users, Leaf, Shield,
  Stethoscope, ShieldCheck, ClipboardList, ScanLine,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

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
  { href: "/prescriptions", label: "处方管理", icon: ClipboardList, roles: ["ADMIN", "DOCTOR"] },
  { href: "/prescriptions/recognize", label: "处方识别", icon: ScanLine, roles: ["ADMIN", "DOCTOR"] },
  { href: "/settings/rules", label: "规则配置", icon: Shield, roles: ["ADMIN"] },
  { href: "/admin", label: "系统管理", icon: ShieldCheck, roles: ["ADMIN"] },
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
    <div className="flex h-full flex-col sidebar-border bg-card">
      {/* Brand header */}
      <div className="flex h-20 items-center px-4 pt-1.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group"
          onClick={onNavClick}
        >
          <BrandLogo size={76} />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-foreground font-serif tracking-wide">
              药谷云阁
            </span>
            <span className="text-[11px] text-muted-foreground">中医大健康平台</span>
          </div>
        </Link>
      </div>

      {/* Fret divider */}
      <div className="tcm-fret-border" />

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2 mt-1">
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
                <span
                  className="ml-auto w-2.5 h-2.5 flex-shrink-0 rounded-sm border border-primary-foreground/40"
                  style={{ transform: "rotate(5deg)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — cloud motif + seal */}
      <div className="mt-auto border-t border-primary/10 p-3">
        {/* Cloud decoration */}
        <div className="flex justify-center gap-1 mb-2 opacity-25">
          <svg width="18" height="10" viewBox="0 0 18 10" xmlns="http://www.w3.org/2000/svg">
            <path d="M2,8 Q0,6 2,4 Q1,2 4,1.5 Q5,0 8,1 Q10,0 13,1.5 Q16,1 17,3.5 Q18,6 15,7.5 Q13,9 10,8.5 Q7,10 4,9 Z" fill="hsl(var(--tcm-seal))" opacity="0.5" />
          </svg>
          <svg width="14" height="8" viewBox="0 0 14 8" xmlns="http://www.w3.org/2000/svg">
            <path d="M1,6 Q0,4 2,3 Q1,1 3.5,0.5 Q4.5,0 7,1 Q9,0 10.5,1 Q13,1 14,3 Q14.5,5 12,6 Q10,7 7.5,6.5 Q5,7 3,6.5 Z" fill="hsl(var(--tcm-celadon))" opacity="0.5" />
          </svg>
          <svg width="18" height="10" viewBox="0 0 18 10" xmlns="http://www.w3.org/2000/svg">
            <path d="M2,8 Q0,6 2,4 Q1,2 4,1.5 Q5,0 8,1 Q10,0 13,1.5 Q16,1 17,3.5 Q18,6 15,7.5 Q13,9 10,8.5 Q7,10 4,9 Z" fill="hsl(var(--tcm-gold))" opacity="0.5" />
          </svg>
        </div>

        {/* Tiny brand logo */}
        <div className="flex justify-center mb-1.5">
          <BrandLogo size={42} />
        </div>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          执业中医师内部辅助工具
          <br />
          AI学术参考 · 医师最终确认
        </p>
      </div>
    </div>
  );
}
