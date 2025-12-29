"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MesPeriodo {
  ano: number;
  mes: number;
  key: string;     // Unique key: "2026-1"
  label: string;   // Display: "Jan/26"
}

interface PremissaReceitaMes {
  ano: number;
  mes: number;
  vopdu: number;
  indice_conversao: number;
  ticket_medio: number;
  fator: number;
  indice_estorno: number;
}

interface EditReceitasModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (premissas: PremissaReceitaMes[]) => Promise<void>;
  receitaNome: string;
  funcaoNome: string;
  ccCodigo: string;
  ccNome: string;
  mesesPeriodo: MesPeriodo[];
  premissasIniciais: PremissaReceitaMes[];
  diasUteis: number[];
}

const INDICADORES_RECEITA = [
  { key: 'vopdu', label: 'VOPDU', step: 0.01, decimal: 2, desc: 'Venda/Operador/Dia Útil' },
  { key: 'indice_conversao', label: 'Índice Conversão', step: 0.0001, decimal: 4, desc: '% Conversão' },
  { key: 'ticket_medio', label: 'Ticket Médio', step: 0.01, decimal: 2, desc: 'R$ por venda' },
  { key: 'fator', label: 'Fator', step: 0.01, decimal: 2, desc: 'Multiplicador' },
  { key: 'indice_estorno', label: '% Estorno', step: 0.01, decimal: 2, desc: 'Cancelamentos (0-100%)' },
] as const;

export function EditReceitasModal({
  open,
  onClose,
  onSave,
  receitaNome,
  funcaoNome,
  ccCodigo,
  ccNome,
  mesesPeriodo,
  premissasIniciais,
  diasUteis,
}: EditReceitasModalProps) {
  const [saving, setSaving] = useState(false);
  const [premissas, setPremissas] = useState<Record<string, Record<string, number>>>({});
  const [indicadorAtivo, setIndicadorAtivo] = useState<string>(INDICADORES_RECEITA[0].key);
  
  // Ações rápidas: Preencher todos
  const [preencherTodosValor, setPreencherTodosValor] = useState("");
  
  // Ações rápidas: Variação progressiva
  const [variacaoMesInicio, setVariacaoMesInicio] = useState("");
  const [variacaoMesFim, setVariacaoMesFim] = useState("");
  const [variacaoPercentual, setVariacaoPercentual] = useState("");
  
  // Inicializar valores quando o modal abre
  useEffect(() => {
    if (open && premissasIniciais.length > 0) {
      const initial: Record<string, Record<string, number>> = {};
      
      INDICADORES_RECEITA.forEach(ind => {
        initial[ind.key] = {};
        mesesPeriodo.forEach((m, idx) => {
          const premissa = premissasIniciais[idx];
          if (premissa) {
            // indice_estorno é armazenado como decimal (0-1), mas exibimos como percentual (0-100)
            initial[ind.key][m.key] = ind.key === 'indice_estorno' 
              ? (premissa[ind.key] * 100)
              : premissa[ind.key] || 0;
          } else {
            initial[ind.key][m.key] = 0;
          }
        });
      });
      
      setPremissas(initial);
      
      // Reset ações rápidas
      setPreencherTodosValor("");
      setVariacaoMesInicio(mesesPeriodo[0]?.key || "");
      setVariacaoMesFim(mesesPeriodo[mesesPeriodo.length - 1]?.key || "");
      setVariacaoPercentual("");
    }
  }, [open, premissasIniciais, mesesPeriodo]);

  // Calcular estatísticas para o indicador ativo
  const stats = useMemo(() => {
    const valores = mesesPeriodo.map(m => premissas[indicadorAtivo]?.[m.key] || 0);
    if (valores.length === 0) return { media: 0, min: 0, max: 0, valores: [] };
    
    const total = valores.reduce((sum, v) => sum + v, 0);
    const media = total / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    return { media, min, max, valores };
  }, [premissas, indicadorAtivo, mesesPeriodo]);

  // Calcular tendência
  const tendencia = useMemo(() => {
    const valores = stats.valores;
    if (valores.length < 2) return "stable";
    const first = valores[0];
    const last = valores[valores.length - 1];
    if (first === 0) return "stable";
    const variation = ((last - first) / first) * 100;
    if (variation > 1) return "up";
    if (variation < -1) return "down";
    return "stable";
  }, [stats.valores]);

  // Handler: Atualizar valor individual
  const handleValorChange = (key: string, value: string) => {
    const indicador = INDICADORES_RECEITA.find(i => i.key === indicadorAtivo);
    if (!indicador) return;
    
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    
    setPremissas(prev => ({
      ...prev,
      [indicadorAtivo]: {
        ...prev[indicadorAtivo],
        [key]: numValue
      }
    }));
  };

  // Handler: Preencher todos
  const handlePreencherTodos = () => {
    const indicador = INDICADORES_RECEITA.find(i => i.key === indicadorAtivo);
    if (!indicador) return;
    
    const valor = parseFloat(preencherTodosValor.replace(',', '.')) || 0;
    
    const newPremissas = { ...premissas };
    newPremissas[indicadorAtivo] = {};
    mesesPeriodo.forEach(m => {
      newPremissas[indicadorAtivo][m.key] = valor;
    });
    setPremissas(newPremissas);
  };

  // Handler: Aplicar variação progressiva linear
  const handleAplicarVariacao = () => {
    const percentual = parseFloat(variacaoPercentual.replace(',', '.')) || 0;
    if (percentual === 0) return;
    
    const inicioIndex = mesesPeriodo.findIndex(m => m.key === variacaoMesInicio);
    const fimIndex = mesesPeriodo.findIndex(m => m.key === variacaoMesFim);
    
    if (inicioIndex < 0 || fimIndex < 0 || inicioIndex >= fimIndex) return;
    
    // Valor base é o mês de início
    const valorBase = premissas[indicadorAtivo]?.[mesesPeriodo[inicioIndex]?.key] || 0;
    if (valorBase === 0) return;
    
    // Quantidade de meses para distribuir a variação
    const numMeses = fimIndex - inicioIndex;
    // Incremento percentual por mês
    const incrementoMensal = percentual / numMeses;
    
    // Aplicar variação linear
    const newPremissas = { ...premissas };
    let valorFinal = valorBase;
    
    // Aplicar variação progressiva no período
    for (let i = inicioIndex + 1; i <= fimIndex; i++) {
      const mesKey = mesesPeriodo[i]?.key;
      if (mesKey) {
        const multiplicador = 1 + ((i - inicioIndex) * incrementoMensal / 100);
        valorFinal = parseFloat((valorBase * multiplicador).toFixed(4));
        newPremissas[indicadorAtivo] = {
          ...newPremissas[indicadorAtivo],
          [mesKey]: valorFinal
        };
      }
    }
    
    // Manter o valor final para todos os meses após o período
    for (let i = fimIndex + 1; i < mesesPeriodo.length; i++) {
      const mesKey = mesesPeriodo[i]?.key;
      if (mesKey) {
        newPremissas[indicadorAtivo] = {
          ...newPremissas[indicadorAtivo],
          [mesKey]: valorFinal
        };
      }
    }
    
    setPremissas(newPremissas);
  };

  // Handler: Salvar
  const handleSave = async () => {
    setSaving(true);
    try {
      // Converter para o formato PremissaReceitaMes
      const premissasParaSalvar: PremissaReceitaMes[] = mesesPeriodo.map((m, idx) => ({
        ano: m.ano,
        mes: m.mes,
        vopdu: premissas.vopdu?.[m.key] || 0,
        indice_conversao: premissas.indice_conversao?.[m.key] || 0,
        ticket_medio: premissas.ticket_medio?.[m.key] || 0,
        fator: premissas.fator?.[m.key] || 1,
        // indice_estorno: converter de percentual (0-100) para decimal (0-1)
        indice_estorno: (premissas.indice_estorno?.[m.key] || 0) / 100,
      }));
      
      await onSave(premissasParaSalvar);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Agrupar meses por ano para exibição
  const mesesPorAno = useMemo(() => {
    const grupos: { ano: number; meses: MesPeriodo[] }[] = [];
    mesesPeriodo.forEach(m => {
      const existingGroup = grupos.find(g => g.ano === m.ano);
      if (existingGroup) {
        existingGroup.meses.push(m);
      } else {
        grupos.push({ ano: m.ano, meses: [m] });
      }
    });
    return grupos;
  }, [mesesPeriodo]);

  const indicadorAtual = INDICADORES_RECEITA.find(i => i.key === indicadorAtivo);

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
                <Calendar className="h-5 w-5 text-orange-500" />
                Editar Premissas de Receita: {receitaNome}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <span className="font-mono text-xs">{ccCodigo}</span>
                <span className="mx-2">—</span>
                <span>{ccNome}</span>
                <span className="mx-2">/</span>
                <span>{funcaoNome}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs para selecionar indicador */}
        <div className="shrink-0 border-b px-6">
          <Tabs value={indicadorAtivo} onValueChange={setIndicadorAtivo}>
            <TabsList className="grid w-full grid-cols-5">
              {INDICADORES_RECEITA.map(ind => (
                <TabsTrigger key={ind.key} value={ind.key} className="text-xs">
                  {ind.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Grid de meses - 24 colunas em uma linha */}
        <div className="flex-1 overflow-auto py-6 px-6">
          <div className="mx-auto max-w-[1800px]">
            {/* Renderizar todos os meses em uma única linha horizontal */}
            <div className="flex items-end gap-0.5">
              {mesesPorAno.map((grupo, grupoIndex) => (
                <div key={grupo.ano} className="flex items-end">
                  {/* Badge do ano */}
                  <div className="flex flex-col items-center">
                    <Badge 
                      variant="secondary" 
                      className="mb-2 text-[10px] px-2 py-0.5"
                    >
                      {grupo.ano}
                    </Badge>
                    <div className="flex gap-0.5">
                      {grupo.meses.map((m, idx) => {
                        const diasUteisMes = diasUteis[mesesPeriodo.findIndex(mp => mp.key === m.key)] || 22;
                        return (
                          <div key={m.key} className="flex flex-col items-center gap-1">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {MESES_LABELS[m.mes - 1]}
                              </span>
                              <span className="text-[8px] text-blue-600 font-mono">
                                {diasUteisMes}DU
                              </span>
                            </div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={premissas[indicadorAtivo]?.[m.key] || 0}
                              onChange={(e) => handleValorChange(m.key, e.target.value)}
                              disabled={saving}
                              className={cn(
                                "w-14 h-9 text-center text-sm font-mono px-1"
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Separador vertical entre anos */}
                  {grupoIndex < mesesPorAno.length - 1 && (
                    <div className="w-px h-16 bg-border mx-2 self-end mb-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="shrink-0 border-t border-b py-4 px-6 bg-muted/20">
          <div className="mx-auto max-w-[1600px]">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-500" />
              Ações Rápidas
            </h4>
            <div className="flex flex-wrap items-end gap-6">
              {/* Preencher todos */}
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Preencher todos
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor"
                    value={preencherTodosValor}
                    onChange={(e) => setPreencherTodosValor(e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handlePreencherTodos}
                  disabled={!preencherTodosValor}
                >
                  Aplicar
                </Button>
              </div>

              <div className="w-px h-10 bg-border" />

              {/* Variação progressiva */}
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Variação progressiva
                  </Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">De</span>
                    <Select value={variacaoMesInicio} onValueChange={setVariacaoMesInicio}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {mesesPeriodo.slice(0, -1).map(m => (
                          <SelectItem key={m.key} value={m.key} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-xs text-muted-foreground">até</span>
                    <Select value={variacaoMesFim} onValueChange={setVariacaoMesFim}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {mesesPeriodo.slice(1).map(m => (
                          <SelectItem key={m.key} value={m.key} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-xs text-muted-foreground">aplicar</span>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="+10"
                        value={variacaoPercentual}
                        onChange={(e) => setVariacaoPercentual(e.target.value)}
                        className="w-16 h-8 text-sm pr-5"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleAplicarVariacao}
                  disabled={!variacaoPercentual || !variacaoMesInicio || !variacaoMesFim}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com resumo e botões */}
        <DialogFooter className="shrink-0 pt-4 px-6 pb-6 border-t">
          <div className="flex items-center justify-between w-full">
            {/* Resumo */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Média:</span>
                <span className="font-mono font-medium">
                  {stats.media.toFixed(indicadorAtual?.decimal || 2)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Min:</span>
                <span className="font-mono">
                  {stats.min.toFixed(indicadorAtual?.decimal || 2)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max:</span>
                <span className="font-mono">
                  {stats.max.toFixed(indicadorAtual?.decimal || 2)}
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
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="min-w-24"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

