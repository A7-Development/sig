"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileSpreadsheet, Download, AlertCircle, ChevronRight, ChevronDown, Calculator } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
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

  // Query para DRE
  const { data: dre, isLoading, error, refetch } = useQuery<DREResponse>({
    queryKey: ["dre", cenarioId, cenarioSecaoId, anoSelecionado],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      params.append("ano", anoSelecionado.toString());
      return api.get<DREResponse>(`/api/v1/orcamento/custos/cenarios/${cenarioId}/dre?${params}`);
    },
    enabled: !!cenarioId,
  });

  // Mutation para calcular custos (pessoal + tecnologia) e atualizar DRE automaticamente
  const calcularMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (cenarioSecaoId) params.append("cenario_secao_id", cenarioSecaoId);
      
      // Calcula custos de pessoal e tecnologia em paralelo
      const [resultadoPessoal, resultadoTecnologia] = await Promise.all([
        api.post(`/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular?${params}`, {}),
        api.post(`/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular-tecnologia?${params}`, {})
      ]);
      
      return { pessoal: resultadoPessoal, tecnologia: resultadoTecnologia };
    },
    onSuccess: async (data: any) => {
      // Atualiza automaticamente a DRE após calcular os custos
      await refetch();
      const totalRegistros = (data.pessoal?.quantidade || 0) + (data.tecnologia?.custos_criados || 0);
      toast.success(`Custos calculados e DRE atualizada: ${totalRegistros} registros processados (${data.pessoal?.quantidade || 0} pessoal + ${data.tecnologia?.custos_criados || 0} tecnologia)`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Erro ao calcular custos");
    },
  });

  // Formatar número com separador de milhar (ponto) - estilo brasileiro
  // Lógica contábil:
  // - Custos (positivos no banco) → exibir como NEGATIVOS (saída de caixa)
  // - Descontos/Créditos (negativos no banco) → exibir como POSITIVOS (entrada de caixa)
  const formatNumber = (value: number) => {
    // Inverte o sinal: custos viram negativos, créditos viram positivos
    const displayValue = -value;
    const absValue = Math.abs(displayValue);
    const formatted = absValue.toLocaleString('pt-BR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    return displayValue < 0 ? `-${formatted}` : formatted;
  };

  // Classe de cor baseada no valor ORIGINAL do banco:
  // - Positivos no banco (custos) → vermelho (serão exibidos como negativos)
  // - Negativos no banco (créditos/descontos) → preto (serão exibidos como positivos)
  const getValueColorClass = (value: number) => {
    if (value > 0) return "text-red-600";  // Custo → vermelho
    if (value < 0) return "text-green-700"; // Crédito/Desconto → verde
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

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4">
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
                DRE de Custos por Conta Contábil
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

        {isLoading ? (
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
                          <>
                            {/* Linha da Conta Contábil */}
                            <TableRow
                              key={conta.codigo}
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
                          </>
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
