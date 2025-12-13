"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  PieChart,
  Target,
  Headphones,
  Users,
  Scale,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export interface ModuleConfig {
  code: string;
  name: string;
  icon: LucideIcon;
  href: string;
  color: string;
  activeColor: string;
}

// Cor padrão da marca Alert Brasil (laranja)
const ACTIVE_COLOR = "bg-orange-100 text-orange-600 ring-2 ring-orange-400";

export const modules: ModuleConfig[] = [
  {
    code: "controladoria",
    name: "Controladoria",
    icon: PieChart,
    href: "/controladoria",
    color: "text-muted-foreground",
    activeColor: ACTIVE_COLOR,
  },
  {
    code: "planejamento",
    name: "Planejamento",
    icon: Target,
    href: "/planejamento",
    color: "text-muted-foreground",
    activeColor: ACTIVE_COLOR,
  },
  {
    code: "operacoes",
    name: "Operações",
    icon: Headphones,
    href: "/operacoes",
    color: "text-muted-foreground",
    activeColor: ACTIVE_COLOR,
  },
  {
    code: "rh",
    name: "Recursos Humanos",
    icon: Users,
    href: "/rh",
    color: "text-muted-foreground",
    activeColor: ACTIVE_COLOR,
  },
  {
    code: "juridico",
    name: "Jurídico",
    icon: Scale,
    href: "/juridico",
    color: "text-muted-foreground",
    activeColor: ACTIVE_COLOR,
  },
];

export function ModuleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  const activeModule = modules.find((m) => pathname.startsWith(m.href));

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full w-16 shrink-0 flex-col items-center border-r border-border bg-muted/50 py-4">
        {/* Logo Alert Brasil */}
        <div className="mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg overflow-hidden p-1">
            <img
              src="/logo-icon.png"
              alt="Alert Brasil"
              className="h-8 w-8 object-contain"
            />
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
                        ? module.activeColor
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

        {/* Admin Icon (if superadmin) */}
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
      </div>
    </TooltipProvider>
  );
}

export function getActiveModule(pathname: string): ModuleConfig | undefined {
  return modules.find((m) => pathname.startsWith(m.href));
}
