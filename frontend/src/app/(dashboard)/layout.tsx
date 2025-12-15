"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { Bell, Search, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PieChart,
  Target,
  Headphones,
  Users,
  Scale,
  Settings,
  ChevronDown,
} from "lucide-react";
import { getModuleMenus, type MenuItem } from "@/lib/module-menus";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Módulos disponíveis
const modules = [
  { code: "controladoria", name: "Controladoria", icon: PieChart, href: "/controladoria" },
  { code: "planejamento", name: "Planejamento", icon: Target, href: "/planejamento" },
  { code: "operacoes", name: "Operações", icon: Headphones, href: "/operacoes" },
  { code: "rh", name: "Recursos Humanos", icon: Users, href: "/rh" },
  { code: "juridico", name: "Jurídico", icon: Scale, href: "/juridico" },
];

function getActiveModule(pathname: string) {
  return modules.find((m) => pathname.startsWith(m.href));
}

// Mini Sidebar com Módulos
function ModuleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const activeModule = getActiveModule(pathname);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-14 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-3">
        {/* Logo */}
        <div className="mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow overflow-hidden p-1">
            <img src="/logo-icon.png" alt="Alert Brasil" className="h-7 w-7 object-contain" />
          </div>
        </div>

        {/* Module Icons */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {modules.map((module) => {
            const isActive = activeModule?.code === module.code;
            const Icon = module.icon;

            return (
              <Tooltip key={module.code}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push(module.href)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">
                  {module.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Admin */}
        {user?.is_superadmin && (
          <div className="mt-auto pt-3 border-t border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push("/admin")}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium text-xs">
                Administração
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

// Sidebar do Módulo
function ModuleSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const moduleCode = isAdmin ? "admin" : activeModule?.code || "";
  const menuSections = getModuleMenus(moduleCode);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <TooltipProvider delayDuration={0}>
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-border p-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {activeModule && (
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                style={{ backgroundColor: "#0E2D55" }}
              >
                <activeModule.icon className="h-4 w-4" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {isAdmin ? "Administração" : activeModule?.name || "SIG"}
              </span>
              <span className="text-[10px] text-muted-foreground">FP&A</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-2">
            {!collapsed && (
              <p className="px-2 py-1 text-xs font-medium text-sidebar-foreground/70">
                {section.title}
              </p>
            )}
            <ul className="space-y-px">
              {section.items.map((item) => {
                const Icon = item.icon;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isActive = pathname === item.href;
                const isSubmenuActive = hasSubmenu && item.submenu?.some(sub => pathname === sub.href);

                // Item com submenu colapsável
                if (hasSubmenu && !collapsed) {
                  return (
                    <li key={item.href}>
                      <Collapsible defaultOpen={isSubmenuActive} className="group/collapsible">
                        <CollapsibleTrigger asChild>
                          <button
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                              isActive || isSubmenuActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1 text-left">{item.name}</span>
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ul className="ml-4 mt-0.5 space-y-px border-l border-sidebar-border pl-2">
                            {item.submenu?.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = pathname === subItem.href;
                              return (
                                <li key={subItem.href}>
                                  <Link
                                    href={subItem.href}
                                    className={cn(
                                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                                      isSubActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    )}
                                  >
                                    <SubIcon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{subItem.name}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                }

                // Item simples (sem submenu)
                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 hover:bg-sidebar-accent"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
    </TooltipProvider>
  );
}

// Header
function Header() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");

  // Gera breadcrumb baseado no pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    return { label, href };
  });

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs flex-1 min-w-0">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          Início
        </Link>
        {breadcrumbItems.map((item, index) => (
          <span key={item.href} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/50">/</span>
            {index === breadcrumbItems.length - 1 ? (
              <span className="text-foreground font-medium truncate">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." className="w-48 pl-8 h-7 text-xs" />
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      if (!accessToken) {
        router.push("/login");
        return;
      }
      const isValid = await checkAuth();
      if (!isValid) {
        router.push("/login");
      }
      setIsChecking(false);
    };
    verify();
  }, [accessToken, checkAuth, router]);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg overflow-hidden animate-pulse">
            <img src="/logo-icon.png" alt="Alert Brasil" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-muted-foreground text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full bg-background">
        {/* Mini Sidebar - Seletor de Módulos */}
        <ModuleSwitcher />

        {/* Sidebar do Módulo */}
        <ModuleSidebar />

        {/* Conteúdo Principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-background p-3">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export { getActiveModule };
