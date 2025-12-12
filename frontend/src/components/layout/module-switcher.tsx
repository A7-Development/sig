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

export const modules: ModuleConfig[] = [
  {
    code: "controladoria",
    name: "Controladoria",
    icon: PieChart,
    href: "/controladoria",
    color: "text-emerald-600",
    activeColor: "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500",
  },
  {
    code: "planejamento",
    name: "Planejamento",
    icon: Target,
    href: "/planejamento",
    color: "text-blue-600",
    activeColor: "bg-blue-100 text-blue-700 ring-2 ring-blue-500",
  },
  {
    code: "operacoes",
    name: "Operações",
    icon: Headphones,
    href: "/operacoes",
    color: "text-amber-600",
    activeColor: "bg-amber-100 text-amber-700 ring-2 ring-amber-500",
  },
  {
    code: "rh",
    name: "Recursos Humanos",
    icon: Users,
    href: "/rh",
    color: "text-purple-600",
    activeColor: "bg-purple-100 text-purple-700 ring-2 ring-purple-500",
  },
  {
    code: "juridico",
    name: "Jurídico",
    icon: Scale,
    href: "/juridico",
    color: "text-rose-600",
    activeColor: "bg-rose-100 text-rose-700 ring-2 ring-rose-500",
  },
];

export function ModuleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  const activeModule = modules.find((m) => pathname.startsWith(m.href));

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full w-16 flex-col items-center border-r bg-gray-50 py-4">
        {/* Logo */}
        <div className="mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-lg">
            S
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
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
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
          <div className="mt-auto pt-4 border-t border-gray-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push("/admin")}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-gray-200 text-gray-700 ring-2 ring-gray-400"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
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
