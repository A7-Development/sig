"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { getActiveModule, modules } from "./module-switcher";
import { getModuleMenus } from "@/lib/module-menus";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Get active module from URL
  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");
  
  // Get module code for menus
  const moduleCode = isAdmin ? "admin" : activeModule?.code || "";
  const menuSections = getModuleMenus(moduleCode);

  // Get module display info
  const moduleInfo = isAdmin 
    ? { name: "Administração", color: "text-gray-700" }
    : activeModule 
      ? { name: activeModule.name, color: activeModule.color }
      : { name: "SIG", color: "text-gray-700" };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          {activeModule && !isAdmin && (
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 ${activeModule.color}`}>
              <activeModule.icon className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <span className={`text-base font-semibold ${moduleInfo.color}`}>
              {moduleInfo.name}
            </span>
            <span className="text-xs text-muted-foreground">
              SIG - Sistema Integrado
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
