"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { FileSpreadsheet, Download, AlertCircle, AlertTriangle, ChevronRight, ChevronDown, Calculator, X, Building2, TrendingUp, BarChart3, Layers } from "lucide-react";
import { api } from "@/lib/api/client";
import { custosApi, ValidacaoResponse, DREPorCCResponse, DRECentroCusto } from "@/lib/api/orcamento";
import { useAuthStore } from "@/stores/auth-store";

type VisaoDRE = "consolidado" | "por_cc" | "comparativo" | "margem";
import { toast } from "sonner";

interface DRELinha {
  conta_contabil_codigo: string;
  conta_contabil_descricao: string;
  conta_contabil_completa: string;
  tipo_custo_codigo: string | null;
  tipo_custo_nome: string | null;
  categoria: string;
  valores_mensais: number[];
  total: number;
}

interface DREResponse {
  cenario_id: string;
  cenario_secao_id: string | null;
  ano: number;
  linhas: DRELinha[];
  total_geral: number;
}

interface DREPanelProps {
  cenarioId: string;
  cenarioSecaoId?: string;
  anoInicio: number;
  anoFim: number;
}

// Interface para agrupar rubricas por conta contábil
interface ContaContabilAgrupada {
  codigo: string;
  descricao: string;
  rubricas: {
    codigo: string;
    nome: string;
    valores_mensais: number[];
    total: number;
  }[];
  valores_mensais: number[];
  total: number;
}

export function DREPanel({ cenarioId, cenarioSecaoId, anoInicio, anoFim }: DREPanelProps) {
  const { accessToken: token } = useAuthStore();
  const queryClient = useQueryClient();
  const [anoSelecionado, setAnoSelecionado] = useState(anoInicio);
  const [expandedContas, setExpandedContas] = useState<Set<string>>(new Set());
  const [alertaDismissed, setAlertaDismissed] = useState(false);
  const [alertaExpandido, setAlertaExpandido] = useState(false);
  const [visaoSelecionada, setVisaoSelecionada] = useState<VisaoDRE>("consolidado");
  const [ccExpandido, setCcExpandido] = useState<string | null>(null);
  const [expandedContasCC, setExpandedContasCC] = useState<Set<string>>(new Set());

  // Gerar lista de anos disponíveis
  const anos = [];
  for (let ano = anoInicio; ano <= anoFim; ano++) {
    anos.push(ano);
  }

  // Gerar cabeçalhos dos meses no formato MM/YYYY
  const mesesCabecalho = Array.from({ length: 12 }, (_, i) => {
    const mes = String(i + 1).padStart(2, "0");
    return `${mes}/${anoSelecionado}`;
  });

  // Query para validação de configuração
  const { data: validacao } = useQuery<ValidacaoResponse>({
    queryKey: ["validacao-custos", cenarioId, cenarioSecaoId],
    queryFn: () => custosApi.validar(token || '', cenarioId, cenarioSecaoId || undefined),
    enabled: !!cenarioId && !!token,
  });

  // Query para DRE consolidado
  const { data: dre, isLoading, error, refetch } = useQuery<DREResponse>({
    queryKey: ["dre", cenarioId, cenarioSecaoId, anoSelecionado],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      params.append("ano", anoSelecionado.toString());
      return api.get<DREResponse>(`/api/v1/orcamento/custos/cenarios/${cenarioId}/dre?${params}`);
    },
    enabled: !!cenarioId && visaoSelecionada === "consolidado",
  });

  // Query para DRE por Centro de Custo
  const { data: drePorCC, isLoading: isLoadingPorCC, error: errorPorCC, refetch: refetchPorCC } = useQuery<DREPorCCResponse>({
    queryKey: ["dre-por-cc", cenarioId, anoSelecionado],
    queryFn: () => custosApi.drePorCC(token || '', cenarioId, anoSelecionado),
    enabled: !!cenarioId && !!token && visaoSelecionada !== "consolidado",
  });

  // Mutation para calcular custos (pessoal + tecnologia) e atualizar DRE automaticamente
  const calcularMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      
      // Calcula custos de pessoal e tecnologia em paralelo
      // Usa Promise.allSettled para não falhar se um dos endpoints falhar
      const [resultadoPessoal, resultadoTecnologia] = await Promise.allSettled([
        api.post(`/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular?${params}`, {}),
        api.post(`/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular-tecnologia?${params}`, {})
      ]);
      
      return { 
        pessoal: resultadoPessoal.status === 'fulfilled' ? resultadoPessoal.value : null,
        tecnologia: resultadoTecnologia.status === 'fulfilled' ? resultadoTecnologia.value : null,
        erros: [
          resultadoPessoal.status === 'rejected' ? 'Erro ao calcular pessoal' : null,
          resultadoTecnologia.status === 'rejected' ? 'Erro ao calcular tecnologia' : null
        ].filter(Boolean)
      };
    },
    onSuccess: async (data: any) => {
      // Atualiza automaticamente a DRE após calcular os custos
      await refetch();
      const totalRegistros = (data.pessoal?.quantidade || 0) + (data.tecnologia?.custos_criados || 0);
      
      if (data.erros?.length > 0) {
        toast.warning(`DRE atualizada com avisos: ${data.erros.join(', ')}. ${totalRegistros} registros de pessoal processados.`);
      } else {
        toast.success(`Custos calculados e DRE atualizada: ${totalRegistros} registros processados (${data.pessoal?.quantidade || 0} pessoal + ${data.tecnologia?.custos_criados || 0} tecnologia)`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Erro ao calcular custos");
    },
  });

  // Formatar número com separador de milhar (ponto) - estilo brasileiro
  // Lógica contábil (valores já vêm corretos do backend):
  // - Receitas: valores positivos (créditos) → exibir em verde
  // - Custos: valores negativos (débitos) → exibir em vermelho
  const formatNumber = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('pt-BR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    return value < 0 ? `-${formatted}` : formatted;
  };

  // Classe de cor baseada no valor:
  // - Positivos (receitas/créditos) → verde
  // - Negativos (custos/débitos) → vermelho
  // - Zero → preto
  const getValueColorClass = (value: number) => {
    if (value > 0) return "text-green-700";  // Receita/Crédito → verde
    if (value < 0) return "text-red-600"; // Custo/Débito → vermelho
    return "text-slate-900"; // Zero → preto
  };

  // Agrupar e ordenar dados por Conta Contábil
  const contasAgrupadas: ContaContabilAgrupada[] = (() => {
    if (!dre?.linhas) return [];

    const contasMap = new Map<string, ContaContabilAgrupada>();

    dre.linhas.forEach((linha) => {
      const codigoConta = linha.conta_contabil_codigo || "SEM_CONTA";
      
      if (!contasMap.has(codigoConta)) {
        contasMap.set(codigoConta, {
          codigo: codigoConta,
          descricao: linha.conta_contabil_descricao || "Sem Conta Contábil",
          rubricas: [],
          valores_mensais: Array(12).fill(0),
          total: 0,
        });
      }

      const conta = contasMap.get(codigoConta)!;
      
      if (linha.tipo_custo_codigo && linha.tipo_custo_nome) {
        conta.rubricas.push({
          codigo: linha.tipo_custo_codigo,
          nome: linha.tipo_custo_nome,
          valores_mensais: linha.valores_mensais,
          total: linha.total,
        });
      }

      linha.valores_mensais.forEach((valor, idx) => {
        conta.valores_mensais[idx] += valor;
      });
      conta.total += linha.total;
    });

    return Array.from(contasMap.values())
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map((conta) => ({
        ...conta,
        rubricas: conta.rubricas.sort((a, b) => a.codigo.localeCompare(b.codigo)),
      }));
  })();

  const toggleConta = (codigo: string) => {
    const newExpanded = new Set(expandedContas);
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo);
    } else {
      newExpanded.add(codigo);
    }
    setExpandedContas(newExpanded);
  };

  const expandAll = () => {
    setExpandedContas(new Set(contasAgrupadas.map((c) => c.codigo)));
  };

  const collapseAll = () => {
    setExpandedContas(new Set());
  };

  const exportToCSV = () => {
    if (!dre || contasAgrupadas.length === 0) return;

    const headers = ["Conta Contábil", "Rubrica", ...mesesCabecalho, "Total"];
    const rows: string[][] = [];

    contasAgrupadas.forEach((conta) => {
      rows.push([
        `${conta.codigo} - ${conta.descricao}`,
        "",
        ...conta.valores_mensais.map((v) => v.toFixed(2)),
        conta.total.toFixed(2),
      ]);

      conta.rubricas.forEach((rubrica) => {
        rows.push([
          "",
          `${rubrica.codigo} - ${rubrica.nome}`,
          ...rubrica.valores_mensais.map((v) => v.toFixed(2)),
          rubrica.total.toFixed(2),
        ]);
      });
    });

    rows.push([
      "TOTAL GERAL",
      "",
      ...Array(12).fill(""),
      dre.total_geral.toFixed(2),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DRE_${cenarioId}_${anoSelecionado}.csv`;
    link.click();
  };

  const temDados = dre && contasAgrupadas.length > 0;

  // Verifica se há alertas de validação para mostrar
  const temAlertasValidacao = validacao && (validacao.tem_erros || validacao.tem_avisos) && !alertaDismissed;

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Renderiza as visões Por CC, Comparativo e Margem
  const renderVisaoPorCC = () => {
    if (isLoadingPorCC) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (errorPorCC) {
      return (
        <Card className="border-dashed border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">Erro ao carregar DRE</h3>
            <p className="text-sm text-muted-foreground">Verifique se os custos foram calculados</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchPorCC()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!drePorCC || drePorCC.centros_custo.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum dado para exibir</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Processe os custos para gerar o DRE por Centro de Custo.
            </p>
            <Button onClick={() => calcularMutation.mutate()} disabled={calcularMutation.isPending}>
              <Calculator className="h-4 w-4 mr-2" />
              {calcularMutation.isPending ? "Processando..." : "Calcular e Gerar DRE"}
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Visão MARGEM - Cards resumidos
    if (visaoSelecionada === "margem") {
      return (
        <div className="space-y-4">
          {/* Consolidado */}
          {drePorCC.consolidado && (
            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Consolidado</h3>
                    <p className="text-sm text-muted-foreground">Todos os Centros de Custo</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {drePorCC.consolidado.margem_percentual.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Margem</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Receitas</div>
                    <div className="text-sm font-semibold text-green-600">{formatCurrency(drePorCC.consolidado.total_receitas)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Custos Diretos</div>
                    <div className="text-sm font-semibold text-red-600">{formatCurrency(-drePorCC.consolidado.total_custos_diretos)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Custos Indiretos</div>
                    <div className="text-sm font-semibold text-orange-600">{formatCurrency(-drePorCC.consolidado.total_custos_indiretos)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Margem</div>
                    <div className={`text-sm font-bold ${drePorCC.consolidado.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(drePorCC.consolidado.margem)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CCs individuais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drePorCC.centros_custo.map((cc) => (
              <Card key={cc.centro_custo_id} className={`${cc.margem >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-sm">{cc.centro_custo_nome}</h4>
                      <p className="text-xs text-muted-foreground">{cc.centro_custo_codigo}</p>
                    </div>
                    <div className={`text-lg font-bold ${cc.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cc.margem_percentual.toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receitas</span>
                      <span className="font-medium text-green-600">{formatCurrency(cc.total_receitas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custos Diretos</span>
                      <span className="font-medium text-red-600">{formatCurrency(-cc.total_custos_diretos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custos Indiretos</span>
                      <span className="font-medium text-orange-600">{formatCurrency(-cc.total_custos_indiretos)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t mt-1">
                      <span className="font-medium">Margem</span>
                      <span className={`font-bold ${cc.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(cc.margem)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Visão COMPARATIVO - Tabela lado a lado
    if (visaoSelecionada === "comparativo") {
      return (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[180px] font-semibold">Indicador</TableHead>
                    {drePorCC.centros_custo.map((cc) => (
                      <TableHead key={cc.centro_custo_id} className="text-right min-w-[140px]">
                        <div className="font-semibold">{cc.centro_custo_codigo}</div>
                        <div className="text-[10px] font-normal text-muted-foreground truncate">{cc.centro_custo_nome}</div>
                      </TableHead>
                    ))}
                    {drePorCC.consolidado && (
                      <TableHead className="text-right min-w-[140px] bg-slate-100">
                        <div className="font-bold">TOTAL</div>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Receitas</TableCell>
                    {drePorCC.centros_custo.map((cc) => (
                      <TableCell key={cc.centro_custo_id} className="text-right font-mono text-green-600">
                        {formatCurrency(cc.total_receitas)}
                      </TableCell>
                    ))}
                    {drePorCC.consolidado && (
                      <TableCell className="text-right font-mono font-semibold text-green-700 bg-slate-50">
                        {formatCurrency(drePorCC.consolidado.total_receitas)}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Custos Diretos</TableCell>
                    {drePorCC.centros_custo.map((cc) => (
                      <TableCell key={cc.centro_custo_id} className="text-right font-mono text-red-600">
                        {formatCurrency(-cc.total_custos_diretos)}
                      </TableCell>
                    ))}
                    {drePorCC.consolidado && (
                      <TableCell className="text-right font-mono font-semibold text-red-700 bg-slate-50">
                        {formatCurrency(-drePorCC.consolidado.total_custos_diretos)}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Custos Indiretos</TableCell>
                    {drePorCC.centros_custo.map((cc) => (
                      <TableCell key={cc.centro_custo_id} className="text-right font-mono text-orange-600">
                        {formatCurrency(-cc.total_custos_indiretos)}
                      </TableCell>
                    ))}
                    {drePorCC.consolidado && (
                      <TableCell className="text-right font-mono font-semibold text-orange-700 bg-slate-50">
                        {formatCurrency(-drePorCC.consolidado.total_custos_indiretos)}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow className="border-t-2 bg-muted/30">
                    <TableCell className="font-bold">Margem</TableCell>
                    {drePorCC.centros_custo.map((cc) => (
                      <TableCell key={cc.centro_custo_id} className={`text-right font-mono font-bold ${cc.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(cc.margem)}
                      </TableCell>
                    ))}
                    {drePorCC.consolidado && (
                      <TableCell className={`text-right font-mono font-bold bg-slate-100 ${drePorCC.consolidado.margem >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {formatCurrency(drePorCC.consolidado.margem)}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow className="bg-muted/20">
                    <TableCell className="font-medium">Margem %</TableCell>
                    {drePorCC.centros_custo.map((cc) => (
                      <TableCell key={cc.centro_custo_id} className={`text-right font-mono font-semibold ${cc.margem_percentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cc.margem_percentual.toFixed(1)}%
                      </TableCell>
                    ))}
                    {drePorCC.consolidado && (
                      <TableCell className={`text-right font-mono font-bold bg-slate-100 ${drePorCC.consolidado.margem_percentual >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {drePorCC.consolidado.margem_percentual.toFixed(1)}%
                      </TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Visão POR CC - Tabela estruturada igual ao consolidado
    // Função para agrupar linhas por conta contábil (igual ao consolidado)
    const agruparLinhasPorConta = (linhas: typeof drePorCC.centros_custo[0]["linhas_diretas"]) => {
      const contasMap = new Map<string, {
        codigo: string;
        descricao: string;
        categoria: string;
        rubricas: {
          codigo: string;
          nome: string;
          valores_mensais: number[];
          total: number;
          origem: string;
        }[];
        valores_mensais: number[];
        total: number;
      }>();

      linhas.forEach((linha) => {
        const codigoConta = linha.conta_contabil_codigo || "SEM_CONTA";
        
        if (!contasMap.has(codigoConta)) {
          contasMap.set(codigoConta, {
            codigo: codigoConta,
            descricao: linha.conta_contabil_descricao || "Sem Conta Contábil",
            categoria: linha.categoria,
            rubricas: [],
            valores_mensais: Array(12).fill(0),
            total: 0,
          });
        }

        const conta = contasMap.get(codigoConta)!;
        
        if (linha.tipo_custo_codigo && linha.tipo_custo_nome) {
          conta.rubricas.push({
            codigo: linha.tipo_custo_codigo,
            nome: linha.tipo_custo_nome,
            valores_mensais: linha.valores_mensais,
            total: linha.total,
            origem: linha.origem,
          });
        }

        linha.valores_mensais.forEach((valor, idx) => {
          conta.valores_mensais[idx] += valor;
        });
        conta.total += linha.total;
      });

      return Array.from(contasMap.values())
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .map((conta) => ({
          ...conta,
          rubricas: conta.rubricas.sort((a, b) => a.codigo.localeCompare(b.codigo)),
        }));
    };

    // Renderiza tabela DRE para um CC específico
    const renderTabelaDRE = (cc: DRECentroCusto, expandedSet: Set<string>, toggleFn: (codigo: string) => void) => {
      const todasLinhas = [...cc.linhas_diretas, ...cc.linhas_indiretas];
      const contasAgrupadas = agruparLinhasPorConta(todasLinhas);
      const totalGeral = cc.total_receitas - cc.total_custos;

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-white hover:bg-white">
                <TableHead className="w-6 p-1"></TableHead>
                <TableHead className="min-w-[280px] p-2 text-[10px] font-medium text-muted-foreground">
                  Descrição
                </TableHead>
                {mesesCabecalho.map((mes) => (
                  <TableHead key={mes} className="text-right text-[11px] w-20 px-2 font-medium text-muted-foreground">
                    {mes}
                  </TableHead>
                ))}
                <TableHead className="text-right text-[10px] w-24 px-2 font-semibold text-muted-foreground bg-muted/30">
                  TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasAgrupadas.map((conta) => {
                const isExpanded = expandedSet.has(`${cc.centro_custo_id}-${conta.codigo}`);
                const hasRubricas = conta.rubricas.length > 0;
                const isReceita = conta.categoria === 'RECEITA';
                const isIndireto = conta.rubricas.some(r => r.origem === 'INDIRETO');

                return (
                  <React.Fragment key={conta.codigo}>
                    {/* Linha da Conta Contábil */}
                    <TableRow
                      className={`hover:bg-muted/30 border-b cursor-pointer h-7 ${isIndireto ? 'bg-orange-50/50' : ''}`}
                      onClick={() => hasRubricas && toggleFn(`${cc.centro_custo_id}-${conta.codigo}`)}
                    >
                      <TableCell className="p-1 w-6">
                        {hasRubricas && (
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-[11px] font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{conta.codigo}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="uppercase">{conta.descricao}</span>
                          {isIndireto && (
                            <Badge variant="alert" className="text-[9px] px-1 py-0 h-4">Indireto</Badge>
                          )}
                        </div>
                      </TableCell>
                      {conta.valores_mensais.map((valor, mesIdx) => (
                        <TableCell
                          key={mesIdx}
                          className={`text-right text-[11px] font-mono px-2 ${getValueColorClass(isReceita ? valor : -valor)}`}
                        >
                          {valor !== 0 ? formatNumber(isReceita ? valor : -valor) : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right text-[11px] font-mono font-semibold px-2 bg-muted/30 ${getValueColorClass(isReceita ? conta.total : -conta.total)}`}>
                        {formatNumber(isReceita ? conta.total : -conta.total)}
                      </TableCell>
                    </TableRow>

                    {/* Linhas das Rubricas (expandidas) */}
                    {isExpanded &&
                      conta.rubricas.map((rubrica, idx) => (
                        <TableRow
                          key={`${conta.codigo}-${rubrica.codigo}-${idx}`}
                          className={`hover:bg-muted/20 border-b h-6 ${rubrica.origem === 'INDIRETO' ? 'bg-orange-50/30' : ''}`}
                        >
                          <TableCell className="p-1"></TableCell>
                          <TableCell className="p-2 text-[10px]">
                            <div className="ml-5 flex items-center gap-1">
                              <span className="font-mono text-muted-foreground text-[9px]">{rubrica.codigo}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{rubrica.nome}</span>
                              {rubrica.origem === 'INDIRETO' && (
                                <span className="text-[9px] text-orange-600 ml-1">(rateado)</span>
                              )}
                            </div>
                          </TableCell>
                          {rubrica.valores_mensais.map((valor, mesIdx) => (
                            <TableCell
                              key={mesIdx}
                              className={`text-right text-[10px] font-mono px-2 ${getValueColorClass(isReceita ? valor : -valor)}`}
                            >
                              {valor !== 0 ? formatNumber(isReceita ? valor : -valor) : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                          ))}
                          <TableCell className={`text-right text-[10px] font-mono px-2 bg-muted/20 ${getValueColorClass(isReceita ? rubrica.total : -rubrica.total)}`}>
                            {formatNumber(isReceita ? rubrica.total : -rubrica.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </React.Fragment>
                );
              })}

              {/* Total Geral - destacado como RESULTADO LIQUIDO */}
              <TableRow className="bg-slate-100 border-t-2 border-slate-300 hover:bg-slate-200 h-8">
                <TableCell className="p-1"></TableCell>
                <TableCell className="p-2 text-[11px] font-bold uppercase text-slate-900">
                  RESULTADO LÍQUIDO
                </TableCell>
                {Array(12).fill(0).map((_, i) => {
                  const receitaMes = cc.linhas_diretas
                    .filter(l => l.categoria === 'RECEITA')
                    .reduce((sum, l) => sum + l.valores_mensais[i], 0);
                  const custoMes = cc.linhas_diretas
                    .filter(l => l.categoria !== 'RECEITA')
                    .reduce((sum, l) => sum + l.valores_mensais[i], 0);
                  const indiretaMes = cc.linhas_indiretas
                    .reduce((sum, l) => sum + l.valores_mensais[i], 0);
                  const totalMes = receitaMes - custoMes - indiretaMes;
                  return (
                    <TableCell
                      key={i}
                      className={`text-right text-[11px] font-mono font-bold px-2 ${getValueColorClass(totalMes)}`}
                    >
                      {formatNumber(totalMes)}
                    </TableCell>
                  );
                })}
                <TableCell className={`text-right text-[11px] font-mono font-bold px-2 bg-slate-200 ${getValueColorClass(totalGeral)}`}>
                  {formatNumber(totalGeral)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );
    };

    // Função para toggle de contas dentro de cada CC
    const toggleContaCC = (key: string) => {
      const newSet = new Set(expandedContasCC);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      setExpandedContasCC(newSet);
    };

    return (
      <div className="space-y-6">
        {drePorCC.centros_custo.map((cc) => (
          <Card key={cc.centro_custo_id} className="overflow-hidden">
            {/* Header do CC com resumo */}
            <div
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 border-b ${ccExpandido === cc.centro_custo_id ? 'bg-muted/30' : ''}`}
              onClick={() => setCcExpandido(ccExpandido === cc.centro_custo_id ? null : cc.centro_custo_id)}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-purple-600" />
                <div>
                  <h4 className="font-medium">{cc.centro_custo_nome}</h4>
                  <p className="text-xs text-muted-foreground">{cc.centro_custo_codigo}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Receitas</div>
                  <div className="text-sm font-semibold text-green-600">{formatCurrency(cc.total_receitas)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Custos Diretos</div>
                  <div className="text-sm font-semibold text-red-600">{formatCurrency(-cc.total_custos_diretos)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Custos Indiretos</div>
                  <div className="text-sm font-semibold text-orange-600">{formatCurrency(-cc.total_custos_indiretos)}</div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-xs text-muted-foreground">Margem</div>
                  <div className={`text-sm font-bold ${cc.margem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(cc.margem)} ({cc.margem_percentual.toFixed(1)}%)
                  </div>
                </div>
                {ccExpandido === cc.centro_custo_id ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Tabela DRE do CC (expandida) */}
            {ccExpandido === cc.centro_custo_id && (
              <CardContent className="p-0">
                {renderTabelaDRE(cc, expandedContasCC, toggleContaCC)}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4">
        {/* Banner de alerta de configuração (políticas de benefícios) */}
        {temAlertasValidacao && (
          <Collapsible open={alertaExpandido} onOpenChange={setAlertaExpandido}>
            <Card className={`border ${validacao.tem_erros ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {validacao.tem_erros ? (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-semibold ${validacao.tem_erros ? 'text-red-900' : 'text-amber-900'} mb-1`}>
                          {validacao.tem_erros ? 'Erro de Configuração' : 'Atenção: Configuração Incompleta'}
                        </h3>
                        <p className={`text-sm ${validacao.tem_erros ? 'text-red-800' : 'text-amber-800'}`}>
                          {validacao.total_funcoes_sem_politica} {validacao.total_funcoes_sem_politica === 1 ? 'função' : 'funções'} com 
                          aproximadamente {Math.round(validacao.total_hc_sem_politica)} HC sem política de benefícios vinculada.
                          <strong className="ml-1">VT, VR e VA serão calculados como zero para essas posições.</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className={`h-7 ${validacao.tem_erros ? 'text-red-700 hover:bg-red-100' : 'text-amber-700 hover:bg-amber-100'}`}>
                            {alertaExpandido ? (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Ocultar Detalhes
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-4 w-4 mr-1" />
                                Ver Detalhes
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => setAlertaDismissed(true)}
                          className={`h-6 w-6 ${validacao.tem_erros ? 'text-red-700 hover:bg-red-100' : 'text-amber-700 hover:bg-amber-100'}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CollapsibleContent className="mt-3">
                      <div className={`rounded-md ${validacao.tem_erros ? 'bg-red-100' : 'bg-amber-100'} p-3 space-y-2`}>
                        <p className={`text-xs font-medium ${validacao.tem_erros ? 'text-red-900' : 'text-amber-900'}`}>
                          Funções afetadas:
                        </p>
                        <div className="space-y-1.5">
                          {validacao.items.map((item, idx) => (
                            <div key={idx} className={`text-xs ${item.tipo === 'erro' ? 'text-red-800' : 'text-amber-800'} flex items-start gap-2`}>
                              <Badge 
                                variant={item.tipo === 'erro' ? 'destructive' : 'warning'} 
                                className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                              >
                                {item.tipo === 'erro' ? 'ERRO' : 'AVISO'}
                              </Badge>
                              <span>
                                <strong>{item.funcoes_afetadas.join(', ')}</strong> - {Math.round(item.hc_total_afetado)} HC afetado
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className={`text-[11px] ${validacao.tem_erros ? 'text-red-700' : 'text-amber-700'} mt-2 pt-2 border-t ${validacao.tem_erros ? 'border-red-200' : 'border-amber-200'}`}>
                          <strong>Como resolver:</strong> Acesse Cadastros → Tabela Salarial e vincule uma Política de Benefícios a cada função.
                        </p>
                      </div>
                    </CollapsibleContent>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Collapsible>
        )}

        {/* Banner de alerta quando não há dados */}
        {!isLoading && !temDados && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">DRE não disponível</h3>
                  <p className="text-sm text-orange-800 mb-3">
                    Os custos precisam ser calculados primeiro para gerar a DRE. O processo calculará automaticamente os custos e atualizará a demonstração.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => calcularMutation.mutate()} 
                    disabled={calcularMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {calcularMutation.isPending ? "Processando..." : "Calcular e Gerar DRE"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Demonstrativo de Resultado</h2>
              <p className="text-sm text-muted-foreground">
                {visaoSelecionada === "consolidado" && "DRE Consolidado por Conta Contábil"}
                {visaoSelecionada === "por_cc" && "DRE por Centro de Custo"}
                {visaoSelecionada === "comparativo" && "Comparativo entre Centros de Custo"}
                {visaoSelecionada === "margem" && "Análise de Margem de Contribuição"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Seletor de Visão */}
            <Select value={visaoSelecionada} onValueChange={(v) => setVisaoSelecionada(v as VisaoDRE)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consolidado">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Consolidado
                  </div>
                </SelectItem>
                <SelectItem value="por_cc">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Por Centro de Custo
                  </div>
                </SelectItem>
                <SelectItem value="comparativo">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Comparativo
                  </div>
                </SelectItem>
                <SelectItem value="margem">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Margem
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => calcularMutation.mutate()}
              disabled={calcularMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {calcularMutation.isPending ? "Processando..." : "Calcular e Atualizar"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!dre || contasAgrupadas.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Visões diferentes baseado na seleção */}
        {visaoSelecionada !== "consolidado" ? (
          /* Visões Por CC, Comparativo, Margem */
          renderVisaoPorCC()
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card className="border-dashed border-red-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-red-600 mb-2">Erro ao carregar DRE</h3>
              <p className="text-sm text-muted-foreground">Verifique se os custos foram calculados</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : !dre || contasAgrupadas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum dado para exibir</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Processe os custos para gerar automaticamente a DRE com base no quadro de pessoal e premissas configuradas.
              </p>
              <Button onClick={() => calcularMutation.mutate()} disabled={calcularMutation.isPending}>
                <Calculator className="h-4 w-4 mr-2" />
                {calcularMutation.isPending ? "Processando..." : "Calcular e Gerar DRE"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Ações de expansão */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
                <ChevronDown className="h-3 w-3 mr-1" />
                Expandir Tudo
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
                <ChevronRight className="h-3 w-3 mr-1" />
                Recolher Tudo
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {contasAgrupadas.length} contas contábeis
              </span>
            </div>

            {/* Tabela DRE */}
            <Card className="border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-white hover:bg-white">
                        <TableHead className="w-6 p-1"></TableHead>
                        <TableHead className="min-w-[280px] p-2 text-[10px] font-medium text-muted-foreground">
                          Descrição
                        </TableHead>
                        {mesesCabecalho.map((mes) => (
                          <TableHead key={mes} className="text-right text-[11px] w-20 px-2 font-medium text-muted-foreground">
                            {mes}
                          </TableHead>
                        ))}
                        <TableHead className="text-right text-[10px] w-24 px-2 font-semibold text-muted-foreground bg-muted/30">
                          TOTAL
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasAgrupadas.map((conta) => {
                        const isExpanded = expandedContas.has(conta.codigo);
                        const hasRubricas = conta.rubricas.length > 0;

                        return (
                          <React.Fragment key={conta.codigo}>
                            {/* Linha da Conta Contábil */}
                            <TableRow
                              className="hover:bg-muted/30 border-b cursor-pointer h-7"
                              onClick={() => hasRubricas && toggleConta(conta.codigo)}
                            >
                              <TableCell className="p-1 w-6">
                                {hasRubricas && (
                                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                    {isExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="p-2 text-[11px] font-medium">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <span className="font-mono text-muted-foreground">{conta.codigo}</span>
                                      <span className="mx-1 text-muted-foreground">-</span>
                                      <span className="uppercase">{conta.descricao}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{conta.codigo} - {conta.descricao}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              {conta.valores_mensais.map((valor, mesIdx) => (
                                <TableCell
                                  key={mesIdx}
                                  className={`text-right text-[11px] font-mono px-2 ${getValueColorClass(valor)}`}
                                >
                                  {valor !== 0 ? formatNumber(valor) : <span className="text-muted-foreground">0</span>}
                                </TableCell>
                              ))}
                              <TableCell className={`text-right text-[11px] font-mono font-semibold px-2 bg-muted/30 ${getValueColorClass(conta.total)}`}>
                                {formatNumber(conta.total)}
                              </TableCell>
                            </TableRow>

                            {/* Linhas das Rubricas (expandidas) */}
                            {isExpanded &&
                              conta.rubricas.map((rubrica, idx) => (
                                <TableRow
                                  key={`${conta.codigo}-${rubrica.codigo}-${idx}`}
                                  className="hover:bg-muted/20 border-b h-6"
                                >
                                  <TableCell className="p-1"></TableCell>
                                  <TableCell className="p-2 text-[10px]">
                                    <div className="ml-5 flex items-center gap-1">
                                      <span className="font-mono text-muted-foreground text-[9px]">{rubrica.codigo}</span>
                                      <span className="text-muted-foreground">-</span>
                                      <span>{rubrica.nome}</span>
                                    </div>
                                  </TableCell>
                                  {rubrica.valores_mensais.map((valor, mesIdx) => (
                                    <TableCell
                                      key={mesIdx}
                                      className={`text-right text-[10px] font-mono px-2 ${getValueColorClass(valor)}`}
                                    >
                                      {valor !== 0 ? formatNumber(valor) : <span className="text-muted-foreground">0</span>}
                                    </TableCell>
                                  ))}
                                  <TableCell className={`text-right text-[10px] font-mono px-2 bg-muted/20 ${getValueColorClass(rubrica.total)}`}>
                                    {formatNumber(rubrica.total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Total Geral - destacado como RESULTADO LIQUIDO */}
                      <TableRow className="bg-slate-100 border-t-2 border-slate-300 hover:bg-slate-200 h-8">
                        <TableCell className="p-1"></TableCell>
                        <TableCell className="p-2 text-[11px] font-bold uppercase text-slate-900">
                          RESULTADO LÍQUIDO
                        </TableCell>
                        {Array(12)
                          .fill(0)
                          .map((_, i) => {
                            const totalMes = contasAgrupadas.reduce(
                              (sum, c) => sum + c.valores_mensais[i],
                              0
                            );
                            return (
                              <TableCell
                                key={i}
                                className={`text-right text-[11px] font-mono font-bold px-2 ${getValueColorClass(totalMes)}`}
                              >
                                {formatNumber(totalMes)}
                              </TableCell>
                            );
                          })}
                        <TableCell className={`text-right text-[11px] font-mono font-bold px-2 bg-slate-200 ${getValueColorClass(dre?.total_geral || 0)}`}>
                          {formatNumber(dre?.total_geral || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
