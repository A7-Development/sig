"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  Calculator, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Users,
  Building,
  Percent
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

interface CustosResumo {
  cenario_id: string;
  por_categoria: Record<string, number>;
  total_geral: number;
}

interface CustoCalculado {
  id: string;
  cenario_id: string;
  cenario_secao_id: string;
  funcao_id: string;
  tipo_custo_id: string;
  mes: number;
  ano: number;
  hc_base: number;
  valor_base: number;
  valor_calculado: number;
  funcao?: { id: string; codigo: string; nome: string };
  tipo_custo?: { id: string; codigo: string; nome: string; categoria: string };
}

const CATEGORIAS: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  PROVENTO: { label: "Proventos", icon: DollarSign, color: "bg-blue-100 text-blue-700 border-blue-200" },
  BENEFICIO: { label: "Benefícios", icon: Users, color: "bg-green-100 text-green-700 border-green-200" },
  ENCARGO: { label: "Encargos", icon: Building, color: "bg-purple-100 text-purple-700 border-purple-200" },
  PROVISAO: { label: "Provisões", icon: TrendingUp, color: "bg-orange-100 text-orange-700 border-orange-200" },
  DESCONTO: { label: "Descontos", icon: AlertCircle, color: "bg-red-100 text-red-700 border-red-200" },
};

interface CustosPanelProps {
  cenarioId: string;
  cenarioSecaoId?: string;
  ano?: number;
}

export function CustosPanel({ cenarioId, cenarioSecaoId, ano }: CustosPanelProps) {
  const { accessToken: token } = useAuthStore();
  const queryClient = useQueryClient();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("");

  // Query para resumo
  const { data: resumo, isLoading: isLoadingResumo, refetch: refetchResumo } = useQuery<CustosResumo>({
    queryKey: ["custos-resumo", cenarioId, cenarioSecaoId, ano],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      if (ano) params.append("ano", ano.toString());
      return api.get<CustosResumo>(`/api/v1/orcamento/custos/cenarios/${cenarioId}/resumo?${params}`);
    },
    enabled: !!cenarioId,
  });

  // Query para custos detalhados
  const { data: custos = [], isLoading: isLoadingCustos, refetch: refetchCustos } = useQuery<CustoCalculado[]>({
    queryKey: ["custos-lista", cenarioId, cenarioSecaoId, ano],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      if (ano) params.append("ano", ano.toString());
      return api.get<CustoCalculado[]>(`/api/v1/orcamento/custos/cenarios/${cenarioId}?${params}`);
    },
    enabled: !!cenarioId,
  });

  // Mutation para calcular custos
  const calcularMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      if (ano) params.append("ano", ano.toString());
      return api.post(`/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular?${params}`, {});
    },
    onSuccess: (data: any) => {
      toast.success(`Custos calculados: ${data.quantidade} registros`);
      refetchResumo();
      refetchCustos();
    },
    onError: () => {
      toast.error("Erro ao calcular custos");
    },
  });

  // Agrupar custos por função e tipo
  const custosAgrupados = custos.reduce((acc, custo) => {
    const funcaoKey = custo.funcao?.nome || "Sem função";
    if (!acc[funcaoKey]) {
      acc[funcaoKey] = { total: 0, porCategoria: {} };
    }
    acc[funcaoKey].total += custo.valor_calculado;
    
    const categoria = custo.tipo_custo?.categoria || "OUTROS";
    if (!acc[funcaoKey].porCategoria[categoria]) {
      acc[funcaoKey].porCategoria[categoria] = 0;
    }
    acc[funcaoKey].porCategoria[categoria] += custo.valor_calculado;
    
    return acc;
  }, {} as Record<string, { total: number; porCategoria: Record<string, number> }>);

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isLoading = isLoadingResumo || isLoadingCustos;
  const temCustos = resumo && resumo.total_geral > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Custos do Cenário</h2>
          <p className="text-sm text-muted-foreground">
            Cálculo de custos de pessoal por rubrica
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchResumo();
              refetchCustos();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => calcularMutation.mutate()}
            disabled={calcularMutation.isPending}
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calcularMutation.isPending ? "Calculando..." : "Calcular Custos"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : !temCustos ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum custo calculado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Clique em "Calcular Custos" para processar todas as rubricas de custo 
              baseadas no quadro de pessoal e premissas configuradas.
            </p>
            <Button onClick={() => calcularMutation.mutate()} disabled={calcularMutation.isPending}>
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Custos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards por categoria */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(CATEGORIAS).map(([key, cat]) => {
              const valor = resumo?.por_categoria[key] || 0;
              const Icon = cat.icon;
              return (
                <Card 
                  key={key} 
                  className={`cursor-pointer transition-all ${
                    categoriaSelecionada === key ? 'ring-2 ring-offset-2 ring-orange-500' : ''
                  }`}
                  onClick={() => setCategoriaSelecionada(categoriaSelecionada === key ? "" : key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${cat.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{cat.label}</span>
                    </div>
                    <p className="text-lg font-bold font-mono">
                      {formatCurrency(valor)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Card de Total */}
          <Card className="bg-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Geral de Custos</p>
                <p className="text-3xl font-bold font-mono text-primary">
                  {formatCurrency(resumo?.total_geral || 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Custo Mensal Médio</p>
                <p className="text-xl font-bold font-mono">
                  {formatCurrency((resumo?.total_geral || 0) / 12)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tabela por função */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Custos por Função</CardTitle>
              <CardDescription className="text-xs">
                Visão consolidada de custos agrupados por função
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Função</TableHead>
                    {Object.entries(CATEGORIAS).map(([key, cat]) => (
                      <TableHead key={key} className="text-xs text-right">
                        {cat.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(custosAgrupados).map(([funcao, dados]) => (
                    <TableRow key={funcao} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">{funcao}</TableCell>
                      {Object.keys(CATEGORIAS).map((cat) => (
                        <TableCell key={cat} className="text-xs text-right font-mono">
                          {dados.porCategoria[cat] 
                            ? formatCurrency(dados.porCategoria[cat])
                            : "-"
                          }
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-right font-mono font-bold">
                        {formatCurrency(dados.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(custosAgrupados).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum custo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

