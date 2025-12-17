"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { FileSpreadsheet, Download, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

interface DRELinha {
  conta_contabil_codigo: string;
  conta_contabil_descricao: string;
  conta_contabil_completa: string; // Formato "CODIGO - DESCRICAO"
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

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CATEGORIAS_CORES: Record<string, string> = {
  PROVENTO: "bg-blue-50 text-blue-700",
  BENEFICIO: "bg-green-50 text-green-700",
  ENCARGO: "bg-purple-50 text-purple-700",
  PROVISAO: "bg-orange-50 text-orange-700",
  DESCONTO: "bg-red-50 text-red-700",
};

interface DREPanelProps {
  cenarioId: string;
  cenarioSecaoId?: string;
  anoInicio: number;
  anoFim: number;
}

export function DREPanel({ cenarioId, cenarioSecaoId, anoInicio, anoFim }: DREPanelProps) {
  const { accessToken: token } = useAuthStore();
  const [anoSelecionado, setAnoSelecionado] = useState(anoInicio);

  // Gerar lista de anos disponíveis
  const anos = [];
  for (let ano = anoInicio; ano <= anoFim; ano++) {
    anos.push(ano);
  }

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

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const exportToCSV = () => {
    if (!dre) return;

    const headers = ["Conta Contábil", "Rubrica", "Categoria", ...MESES, "Total"];
    const rows = dre.linhas.map(linha => [
      linha.conta_contabil_completa,
      linha.tipo_custo_nome || "",
      linha.categoria,
      ...linha.valores_mensais.map(v => v.toFixed(2)),
      linha.total.toFixed(2),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";")),
      ["", "", "", "TOTAL GERAL", ...Array(12).fill(""), dre.total_geral.toFixed(2)].join(";"),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DRE_${cenarioId}_${anoSelecionado}.csv`;
    link.click();
  };

  // Agrupar linhas por categoria
  const linhasPorCategoria = (dre?.linhas || []).reduce((acc, linha) => {
    if (!acc[linha.categoria]) {
      acc[linha.categoria] = [];
    }
    acc[linha.categoria].push(linha);
    return acc;
  }, {} as Record<string, DRELinha[]>);

  // Calcular totais por categoria
  const totaisPorCategoria = Object.entries(linhasPorCategoria).reduce((acc, [cat, linhas]) => {
    acc[cat] = linhas.reduce((sum, l) => sum + l.total, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!dre || dre.linhas.length === 0}>
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
      ) : !dre || dre.linhas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum dado para exibir</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Primeiro calcule os custos na aba "Custos" para gerar o DRE
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards resumo por categoria */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(totaisPorCategoria).map(([cat, total]) => (
              <Card key={cat} className={`${CATEGORIAS_CORES[cat] || 'bg-gray-50'}`}>
                <CardContent className="p-3">
                  <p className="text-xs font-medium opacity-75">{cat}</p>
                  <p className="text-sm font-bold font-mono">{formatCurrency(total)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela DRE */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="sticky left-0 bg-muted/50 z-10 w-64 text-[10px]">Conta Contábil</TableHead>
                      <TableHead className="sticky left-64 bg-muted/50 z-10 w-48 text-[10px]">Rubrica</TableHead>
                      {MESES.map((mes) => (
                        <TableHead key={mes} className="text-center text-[10px] w-20 px-1">
                          {mes}
                        </TableHead>
                      ))}
                      <TableHead className="text-center text-[10px] w-24 bg-muted/70 font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(linhasPorCategoria).map(([categoria, linhas]) => (
                      <>
                        {/* Separador de categoria */}
                        <TableRow key={`cat-${categoria}`} className={`${CATEGORIAS_CORES[categoria] || ''}`}>
                          <TableCell colSpan={14} className="py-1.5 text-xs font-semibold">
                            {categoria}
                          </TableCell>
                        </TableRow>
                        {/* Linhas da categoria */}
                        {linhas.map((linha, idx) => (
                          <TableRow key={`${categoria}-${idx}`} className="hover:bg-muted/30">
                            <TableCell className="sticky left-0 bg-background z-10 text-[10px] font-mono">
                              <div className="truncate max-w-[240px]" title={linha.conta_contabil_completa}>
                                {linha.conta_contabil_completa || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="sticky left-64 bg-background z-10 text-[10px]">
                              <div className="truncate max-w-[180px]" title={linha.tipo_custo_nome || ""}>
                                {linha.tipo_custo_nome || "-"}
                              </div>
                            </TableCell>
                            {linha.valores_mensais.map((valor, mesIdx) => (
                              <TableCell 
                                key={mesIdx} 
                                className={`text-center text-[10px] font-mono ${valor < 0 ? 'text-red-600' : ''}`}
                              >
                                {valor !== 0 ? formatCurrency(valor) : "-"}
                              </TableCell>
                            ))}
                            <TableCell className="text-center text-[10px] font-mono font-semibold bg-muted/30">
                              {formatCurrency(linha.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Subtotal da categoria */}
                        <TableRow className="bg-muted/20 border-t-2">
                          <TableCell colSpan={2} className="sticky left-0 bg-muted/20 z-10 text-[10px] font-bold text-right pr-4">
                            Subtotal {categoria}
                          </TableCell>
                          {Array(12).fill(0).map((_, i) => {
                            const subtotal = linhas.reduce((sum, l) => sum + l.valores_mensais[i], 0);
                            return (
                              <TableCell key={i} className="text-center text-[10px] font-mono font-semibold">
                                {subtotal !== 0 ? formatCurrency(subtotal) : "-"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-[10px] font-mono font-bold bg-muted/40">
                            {formatCurrency(totaisPorCategoria[categoria])}
                          </TableCell>
                        </TableRow>
                      </>
                    ))}
                    {/* Total Geral */}
                    <TableRow className="bg-primary/10 border-t-4">
                      <TableCell colSpan={2} className="sticky left-0 bg-primary/10 z-10 text-xs font-bold">
                        TOTAL GERAL
                      </TableCell>
                      {Array(12).fill(0).map((_, i) => {
                        const total = (dre?.linhas || []).reduce((sum, l) => sum + l.valores_mensais[i], 0);
                        return (
                          <TableCell key={i} className="text-center text-[10px] font-mono font-bold">
                            {formatCurrency(total)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center text-sm font-mono font-bold bg-primary/20">
                        {formatCurrency(dre?.total_geral || 0)}
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
  );
}

