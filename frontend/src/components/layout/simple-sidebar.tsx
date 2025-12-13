"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { getActiveModule } from "./module-switcher";
import { getModuleMenus } from "@/lib/module-menus";

export function SimpleSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const moduleCode = isAdmin ? "admin" : activeModule?.code || "";
  const menuSections = getModuleMenus(moduleCode);

  const moduleInfo = isAdmin 
    ? { name: "Administração", color: "text-foreground" }
    : activeModule 
      ? { name: activeModule.name, color: "text-foreground" }
      : { name: "SIG", color: "text-foreground" };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-background border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            {activeModule && !isAdmin && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <activeModule.icon className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className={cn("text-sm font-semibold", moduleInfo.color)}>
                {moduleInfo.name}
              </span>
              <span className="text-xs text-muted-foreground">Alert Brasil</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-orange-100 text-orange-700 font-medium"
                          : "text-muted-foreground hover:bg-orange-50 hover:text-orange-600",
                        collapsed && "justify-center"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-sm font-medium flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 hover:text-orange-600"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
