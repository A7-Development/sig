"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Layers, CircleDollarSign, CalendarDays, ArrowRight } from "lucide-react";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cadastros do Orçamento</h1>
        <p className="text-muted-foreground">
          Gerencie os cadastros base para construção do orçamento
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cadastros.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`h-12 w-12 rounded-lg ${item.bgColor} ${item.color} flex items-center justify-center`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <CardTitle className="mt-4">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Clique para gerenciar
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Integração com TOTVS</CardTitle>
          <CardDescription>
            Os cadastros podem ser importados diretamente do sistema TOTVS (CORPORERM).
            Cada tela possui um botão &quot;Importar do TOTVS&quot; que permite selecionar e importar registros.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

