"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Eye, 
  TrendingUp, 
  TrendingDown,
  Minus,
  DollarSign,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceitaCalculada } from "@/lib/api/orcamento";

const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MesPeriodo {
  ano: number;
  mes: number;
  key: string;
  label: string;
}

interface ViewReceitasModalProps {
  open: boolean;
  onClose: () => void;
  receitaNome: string;
  funcaoNome: string;
  ccCodigo: string;
  ccNome: string;
  mesesPeriodo: MesPeriodo[];
  receitasCalculadas: ReceitaCalculada[];
  valorMinimoPa?: number | null;
  valorMaximoPa?: number | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatCurrencyCompact = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number, decimals: number = 2) => {
  return value.toFixed(decimals).replace('.', ',');
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

export function ViewReceitasModal({
  open,
  onClose,
  receitaNome,
  funcaoNome,
  ccCodigo,
  ccNome,
  mesesPeriodo,
  receitasCalculadas,
  valorMinimoPa,
  valorMaximoPa,
}: ViewReceitasModalProps) {

  // Mapear receitas calculadas por mês/ano
  const receitasMap = useMemo(() => {
    const map = new Map<string, ReceitaCalculada>();
    receitasCalculadas.forEach(r => {
      map.set(`${r.ano}-${r.mes}`, r);
    });
    return map;
  }, [receitasCalculadas]);

  // Dados da tabela com status de limite
  const dadosTabela = useMemo(() => {
    return mesesPeriodo.map(m => {
      const receita = receitasMap.get(m.key);
      const valorCalculado = receita?.valor_calculado ?? 0;
      const valorBruto = receita?.valor_bruto;
      const qtdPa = receita?.qtd_pa ?? 0;
      const hcPa = receita?.hc_pa ?? 0;
      const diasUteis = receita?.dias_uteis ?? 0;
      const memoria = receita?.memoria_calculo || {};
      
      // Indicadores da memória de cálculo
      const vopdu = memoria.vopdu ?? 0;
      const indiceConversao = memoria.indice_conversao ?? 0;
      const ticketMedio = memoria.ticket_medio ?? 0;
      const fator = memoria.fator ?? 1;
      const indiceEstorno = memoria.indice_estorno ?? 0;
      
      // Verificar se foi limitado pelo mínimo ou máximo
      let statusLimite: 'normal' | 'min' | 'max' = 'normal';
      if (receita && qtdPa > 0) {
        const limiteMin = valorMinimoPa ? valorMinimoPa * qtdPa : null;
        const limiteMax = valorMaximoPa ? valorMaximoPa * qtdPa : null;
        
        if (valorBruto !== null && valorBruto !== undefined) {
          if (limiteMin !== null && limiteMin > 0 && valorBruto < limiteMin) {
            statusLimite = 'min';
          } else if (limiteMax !== null && limiteMax > 0 && valorBruto > limiteMax) {
            statusLimite = 'max';
          }
        } else if (valorCalculado > 0) {
          if (limiteMin !== null && limiteMin > 0 && Math.abs(valorCalculado - limiteMin) < 1) {
            statusLimite = 'min';
          } else if (limiteMax !== null && limiteMax > 0 && Math.abs(valorCalculado - limiteMax) < 1) {
            statusLimite = 'max';
          }
        }
      }
      
      return {
        mes: m.mes,
        ano: m.ano,
        label: m.label,
        hcPa,
        qtdPa,
        diasUteis,
        vopdu,
        indiceConversao,
        ticketMedio,
        fator,
        indiceEstorno,
        valorBruto: valorBruto ?? 0,
        valorCalculado,
        statusLimite,
      };
    });
  }, [mesesPeriodo, receitasMap, valorMinimoPa, valorMaximoPa]);

  // Estatísticas
  const stats = useMemo(() => {
    const valores = receitasCalculadas.map(r => r.valor_calculado || 0);
    if (valores.length === 0) return { media: 0, min: 0, max: 0, total: 0, mesesMin: 0, mesesMax: 0 };
    
    const total = valores.reduce((sum, v) => sum + v, 0);
    const media = total / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    
    const mesesMin = dadosTabela.filter(d => d.statusLimite === 'min').length;
    const mesesMax = dadosTabela.filter(d => d.statusLimite === 'max').length;
    
    return { media, min, max, total, mesesMin, mesesMax };
  }, [receitasCalculadas, dadosTabela]);

  // Tendência
  const tendencia = useMemo(() => {
    const valores = receitasCalculadas.map(r => r.valor_calculado || 0);
    if (valores.length < 2) return "stable";
    const first = valores[0];
    const last = valores[valores.length - 1];
    if (first === 0) return "stable";
    const variation = ((last - first) / first) * 100;
    if (variation > 1) return "up";
    if (variation < -1) return "down";
    return "stable";
  }, [receitasCalculadas]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="!fixed !inset-0 !w-screen !h-screen !max-w-none !max-h-none !m-0 !p-0 !rounded-none !translate-x-0 !translate-y-0 !top-0 !left-0 flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="shrink-0 pb-4 px-6 pt-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                Detalhes da Receita: {receitaNome}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <span className="font-mono text-xs">{ccCodigo}</span>
                <span className="mx-2">—</span>
                <span>{ccNome}</span>
                <span className="mx-2">/</span>
                <span>{funcaoNome}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Legenda */}
              <div className="flex items-center gap-3 text-xs border-r pr-4">
                <span className="text-muted-foreground">Legenda:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
                  <span className="text-blue-700">Mínimo</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-100 border border-orange-400" />
                  <span className="text-orange-700">Máximo</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {valorMinimoPa && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Mín/PA: {formatCurrency(valorMinimoPa)}
                  </Badge>
                )}
                {valorMaximoPa && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Máx/PA: {formatCurrency(valorMaximoPa)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabela de detalhes */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px] text-xs font-semibold">Mês/Ano</TableHead>
                  <TableHead className="text-center w-[60px] text-xs font-semibold">HC/PA</TableHead>
                  <TableHead className="text-center w-[50px] text-xs font-semibold">DU</TableHead>
                  <TableHead className="text-center w-[70px] text-xs font-semibold">VOPDU</TableHead>
                  <TableHead className="text-center w-[70px] text-xs font-semibold">Conversão</TableHead>
                  <TableHead className="text-center w-[80px] text-xs font-semibold">Ticket</TableHead>
                  <TableHead className="text-center w-[60px] text-xs font-semibold">Fator</TableHead>
                  <TableHead className="text-center w-[60px] text-xs font-semibold">Estorno</TableHead>
                  <TableHead className="text-center w-[50px] text-xs font-semibold">PA</TableHead>
                  <TableHead className="text-right w-[120px] text-xs font-semibold">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosTabela.map((row, idx) => (
                  <TableRow 
                    key={row.label}
                    className={cn(
                      row.statusLimite === 'min' && "bg-blue-50 hover:bg-blue-100",
                      row.statusLimite === 'max' && "bg-orange-50 hover:bg-orange-100",
                      row.statusLimite === 'normal' && "hover:bg-muted/30"
                    )}
                  >
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-1">
                        {row.statusLimite === 'min' && <ArrowDown className="h-3 w-3 text-blue-600" />}
                        {row.statusLimite === 'max' && <ArrowUp className="h-3 w-3 text-orange-600" />}
                        <span className={cn(
                          row.statusLimite === 'min' && "text-blue-700 font-semibold",
                          row.statusLimite === 'max' && "text-orange-700 font-semibold"
                        )}>
                          {row.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {formatNumber(row.hcPa, 1)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-blue-600">
                      {row.diasUteis}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {formatNumber(row.vopdu, 2)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {formatNumber(row.indiceConversao, 4)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {formatCurrency(row.ticketMedio)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {formatNumber(row.fator, 2)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-red-600">
                      {formatPercent(row.indiceEstorno)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {formatNumber(row.qtdPa, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-xs font-mono font-bold",
                        row.statusLimite === 'min' && "text-blue-700",
                        row.statusLimite === 'max' && "text-orange-700",
                        row.statusLimite === 'normal' && "text-green-700"
                      )}>
                        {formatCurrencyCompact(row.valorCalculado)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Linha de totais/médias */}
                <TableRow className="bg-muted/30 border-t-2 font-semibold">
                  <TableCell className="text-xs font-bold">TOTAL</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-center text-xs font-mono">—</TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-mono font-bold text-green-700">
                      {formatCurrency(stats.total)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer com resumo */}
        <DialogFooter className="shrink-0 pt-4 px-6 pb-6 border-t">
          <div className="flex items-center justify-between w-full">
            {/* Resumo */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-green-600 uppercase tracking-wide">Total Período</span>
                  <span className="font-mono font-semibold text-green-700">
                    {formatCurrency(stats.total)}
                  </span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-border" />
              
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Média:</span>
                <span className="font-mono font-medium text-green-700">
                  {formatCurrency(stats.media)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Min:</span>
                <span className="font-mono">
                  {formatCurrency(stats.min)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max:</span>
                <span className="font-mono">
                  {formatCurrency(stats.max)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                {tendencia === "up" && <TrendingUp className="h-4 w-4 text-green-600" />}
                {tendencia === "down" && <TrendingDown className="h-4 w-4 text-red-600" />}
                {tendencia === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className={cn(
                  "text-xs font-medium",
                  tendencia === "up" && "text-green-600",
                  tendencia === "down" && "text-red-600",
                  tendencia === "stable" && "text-muted-foreground"
                )}>
                  {tendencia === "up" && "Subindo"}
                  {tendencia === "down" && "Descendo"}
                  {tendencia === "stable" && "Estável"}
                </span>
              </div>
              
              {(stats.mesesMin > 0 || stats.mesesMax > 0) && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-2 text-xs">
                    {stats.mesesMin > 0 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        {stats.mesesMin} mês{stats.mesesMin > 1 ? 'es' : ''} no mínimo
                      </Badge>
                    )}
                    {stats.mesesMax > 0 && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        {stats.mesesMax} mês{stats.mesesMax > 1 ? 'es' : ''} no máximo
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Botão fechar */}
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
