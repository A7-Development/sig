"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  GitCompare, 
  Briefcase, 
  Building2, 
  CircleDollarSign,
  CalendarDays,
  Calculator,
  ArrowRight,
  Plus,
  FileText
} from "lucide-react";

const acessosRapidos = [
  {
    title: "Cenários",
    description: "Gerencie cenários orçamentários",
    icon: GitCompare,
    href: "/controladoria/orcamento/cenarios",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Cargos e Salários",
    description: "Tabela salarial e benefícios",
    icon: Briefcase,
    href: "/controladoria/orcamento/cargos-salarios",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    title: "Cadastros",
    description: "Departamentos, Seções, CCs, Feriados",
    icon: Building2,
    href: "/controladoria/orcamento/cadastros",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    title: "Encargos",
    description: "Configuração de encargos e provisões",
    icon: Calculator,
    href: "/controladoria/orcamento/configuracoes/encargos",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

export default function OrcamentoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento</h1>
          <p className="text-muted-foreground">
            Construção e gestão do orçamento empresarial
          </p>
        </div>
        <Link href="/controladoria/orcamento/cenarios">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cenário
          </Button>
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cenários Ativos</CardTitle>
            <GitCompare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhum cenário criado ainda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centros de Custo</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Cadastros base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cargos Cadastrados</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Na tabela salarial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feriados</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acessos rápidos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Acessos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {acessosRapidos.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-lg ${item.bgColor} ${item.color} flex items-center justify-center`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <CardTitle className="text-base mt-3">{item.title}</CardTitle>
                  <CardDescription className="text-sm">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Fluxo de trabalho */}
      <Card>
        <CardHeader>
          <CardTitle>Como construir um orçamento</CardTitle>
          <CardDescription>
            Siga o fluxo recomendado para criar um orçamento completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {[
              { num: 1, title: "Cadastros Base", desc: "Configure departamentos, seções e centros de custo" },
              { num: 2, title: "Cargos e Salários", desc: "Defina a tabela salarial com benefícios" },
              { num: 3, title: "Criar Cenário", desc: "Defina premissas e período do orçamento" },
              { num: 4, title: "Dimensionar", desc: "Aloque funções nos centros de custo" },
              { num: 5, title: "Projetar", desc: "Visualize custos mensais e totais" },
            ].map((step, index) => (
              <div key={step.num} className="flex-1 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {step.num}
                </div>
                <div>
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
                {index < 4 && (
                  <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integração TOTVS */}
      <Card className="border-dashed bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">Integração com TOTVS</CardTitle>
          </div>
          <CardDescription>
            O módulo de orçamento está integrado com o sistema TOTVS (CORPORERM) para importação de cadastros.
            Você pode importar departamentos, seções e centros de custo diretamente do sistema legado.
            A lista de funções/cargos também é consultada do TOTVS para garantir consistência.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

