"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Layers, CircleDollarSign, CalendarDays, ArrowRight, Database } from "lucide-react";

const cadastros = [
  {
    title: "Departamentos",
    description: "Estrutura organizacional da empresa",
    icon: Building2,
    href: "/controladoria/orcamento/cadastros/departamentos",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Seções",
    description: "Unidades operacionais dentro dos departamentos",
    icon: Layers,
    href: "/controladoria/orcamento/cadastros/secoes",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    title: "Centros de Custo",
    description: "Objetos de custeio para alocação de custos",
    icon: CircleDollarSign,
    href: "/controladoria/orcamento/cadastros/centros-custo",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    title: "Feriados",
    description: "Calendário de feriados para cálculo de dias úteis",
    icon: CalendarDays,
    href: "/controladoria/orcamento/cadastros/feriados",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

export default function CadastrosPage() {
  return (
    <div className="page-container">
      {/* Header da página */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="page-title">Cadastros do Orçamento</h1>
          <Badge variant="info" className="text-[10px]">
            4 módulos
          </Badge>
        </div>
        <p className="page-subtitle">
          Gerencie os cadastros base para construção do orçamento
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {cadastros.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer group h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-lg ${item.bgColor} ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-sm mb-1">{item.title}</CardTitle>
                <CardDescription className="text-xs">{item.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Card de Integração */}
      <Card className="mt-6 border-dashed border-orange-200 bg-orange-50/30">
        <CardHeader className="bg-transparent border-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm">Integração com TOTVS</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Os cadastros podem ser importados diretamente do sistema TOTVS (CORPORERM).
                Cada tela possui um botão &quot;Importar do TOTVS&quot; que permite selecionar e importar registros.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

