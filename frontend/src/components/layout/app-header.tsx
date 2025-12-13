"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getActiveModule } from "./module-switcher";

export function AppHeader() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");

  const title = isAdmin ? "Administração" : activeModule?.name || "SIG";

  return (
    <header className="flex h-12 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger className="h-8 w-8" />
      
      <div className="flex-1">
        <h1 className="text-sm font-semibold">{title}</h1>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-56 pl-9 h-8 text-xs"
          />
        </div>
      </div>

      {/* Notifications */}
      <Button variant="ghost" size="icon-sm" className="hover:bg-orange-50 hover:text-orange-600">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}
