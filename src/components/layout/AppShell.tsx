"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !user && pathname !== "/login") {
      router.push("/login");
    } else if (!isLoading && user && user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, isLoading, pathname, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 md:block">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0 [&>button]:hidden">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="md:ml-56">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        {/* Subtle radial vignette on content area */}
        <main
          className="p-3 md:p-6 max-w-full overflow-x-hidden"
          style={{
            backgroundImage: "radial-gradient(ellipse at 50% 0%, hsla(var(--tcm-seal) / 0.02) 0%, transparent 60%)",
            backgroundRepeat: "no-repeat",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
