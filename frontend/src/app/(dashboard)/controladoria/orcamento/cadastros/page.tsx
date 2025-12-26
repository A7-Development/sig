"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Layers, CircleDollarSign, CalendarDays, ArrowRight, Database, Briefcase, Receipt, BookOpen, Truck, Server, TrendingUp } from "lucide-react";

const cadastros = [
  {
    title: "Empresas",
    description: "Empresas do grupo, tributos e encargos",
    icon: Building2,
    href: "/controladoria/orcamento/cadastros/empresas",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    title: "Departamentos",
    description: "Estrutura organizacional da empresa",
    icon: Layers,
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
    title: "Cargos e Salários",
    description: "Funções, tabela salarial, benefícios e provisões",
    icon: Briefcase,
    href: "/controladoria/orcamento/cadastros/cargos-salarios",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    title: "Feriados",
    description: "Calendário de feriados para cálculo de dias úteis",
    icon: CalendarDays,
    href: "/controladoria/orcamento/cadastros/feriados",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    title: "Eventos de Folha",
    description: "Rubricas e eventos para cálculos de folha",
    icon: Receipt,
    href: "/controladoria/orcamento/cadastros/rubricas",
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  {
    title: "Contas Contábeis",
    description: "Plano de contas para lançamentos contábeis",
    icon: BookOpen,
    href: "/controladoria/orcamento/cadastros/contas-contabeis",
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
  {
    title: "Fornecedores",
    description: "Fornecedores e prestadores de serviços",
    icon: Truck,
    href: "/controladoria/orcamento/cadastros/fornecedores",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  {
    title: "Itens de Custo",
    description: "Itens e categorias de custos operacionais",
    icon: Server,
    href: "/controladoria/orcamento/cadastros/itens-custo",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    title: "Tipos de Receita",
    description: "Tipos de receitas com conta contábil para DRE",
    icon: TrendingUp,
    href: "/controladoria/orcamento/cadastros/tipos-receita",
    color: "text-green-600",
    bgColor: "bg-green-100",
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
            11 módulos
          </Badge>
        </div>
        <p className="page-subtitle">
          Gerencie os cadastros base para construção do orçamento
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

