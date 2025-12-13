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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { getActiveModule } from "./module-switcher";
import { getModuleMenus } from "@/lib/module-menus";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { state } = useSidebar();

  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const moduleCode = isAdmin ? "admin" : activeModule?.code || "";
  const menuSections = getModuleMenus(moduleCode);

  const moduleInfo = isAdmin 
    ? { name: "Administração" }
    : activeModule 
      ? { name: activeModule.name }
      : { name: "SIG" };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* Header com logo e nome do módulo */}
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          {activeModule && !isAdmin && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shrink-0">
              <activeModule.icon className="h-4 w-4" />
            </div>
          )}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {moduleInfo.name}
              </span>
              <span className="text-[10px] text-muted-foreground">Alert Brasil</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Menu principal */}
      <SidebarContent>
        {menuSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={isActive 
                          ? "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700" 
                          : "hover:bg-orange-50 hover:text-orange-600"
                        }
                      >
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

      {/* Footer com usuário */}
      <SidebarFooter className="border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-sm font-medium shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 hover:text-orange-600"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>

      {/* Rail para arrastar e colapsar */}
      <SidebarRail />
    </Sidebar>
  );
}
