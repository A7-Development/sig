"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModuleSwitcher } from "@/components/layout/module-switcher";
import { SimpleSidebar } from "@/components/layout/simple-sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActiveModule } from "@/components/layout/module-switcher";
import { usePathname } from "next/navigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function Header() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const title = isAdmin ? "Administração" : activeModule?.name || "SIG";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      
      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar..." className="w-64 pl-9" />
        </div>
      </div>

      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xl animate-pulse">
            S
          </div>
          <span className="text-gray-500">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full bg-white">
        {/* Mini Sidebar - Seletor de Módulos */}
        <ModuleSwitcher />
        
        {/* Sidebar do Módulo */}
        <SimpleSidebar />
        
        {/* Conteúdo Principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
