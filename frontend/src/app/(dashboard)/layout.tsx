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
  PieChart,
  Target,
  Headphones,
  Users,
  Scale,
  Settings,
} from "lucide-react";
import { getModuleMenus } from "@/lib/module-menus";

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
      <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-border bg-muted/50 py-4">
        {/* Logo */}
        <div className="mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg overflow-hidden p-1">
            <img src="/logo-icon.png" alt="Alert Brasil" className="h-8 w-8 object-contain" />
          </div>
        </div>

        {/* Module Icons */}
        <div className="flex flex-1 flex-col items-center gap-2">
          {modules.map((module) => {
            const isActive = activeModule?.code === module.code;
            const Icon = module.icon;

            return (
              <Tooltip key={module.code}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push(module.href)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-orange-100 text-orange-600 ring-2 ring-orange-400"
                        : "text-muted-foreground hover:text-orange-500 hover:bg-orange-50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {module.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Admin */}
        {user?.is_superadmin && (
          <div className="mt-auto pt-4 border-t border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push("/admin")}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-orange-100 text-orange-600 ring-2 ring-orange-400"
                      : "text-muted-foreground hover:text-orange-500 hover:bg-orange-50"
                  )}
                >
                  <Settings className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
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
        "flex h-full shrink-0 flex-col border-r border-border bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-border p-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {activeModule && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shrink-0">
                <activeModule.icon className="h-4 w-4" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">
                {isAdmin ? "Administração" : activeModule?.name || "SIG"}
              </span>
              <span className="text-[10px] text-muted-foreground">Alert Brasil</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 hover:bg-orange-50 hover:text-orange-600"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
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

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-orange-100 text-orange-700 font-medium"
                        : "text-muted-foreground hover:bg-orange-50 hover:text-orange-600",
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
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-sm font-medium shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
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
  const title = isAdmin ? "Administração" : activeModule?.name || "SIG";

  // Gera breadcrumb baseado no pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    return { label, href };
  });

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {breadcrumbItems.map((item, index) => (
          <span key={item.href} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-border">/</span>}
            {index === breadcrumbItems.length - 1 ? (
              <span className="text-foreground font-medium">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="w-56 pl-9 h-8 text-xs" />
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" className="hover:bg-orange-50 hover:text-orange-600">
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
          <main className="flex-1 overflow-auto bg-muted/20 p-4">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export { getActiveModule };
