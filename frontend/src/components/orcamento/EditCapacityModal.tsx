"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  X, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuadroPessoal } from "@/lib/api/orcamento";

const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_KEYS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface MesPeriodo {
  ano: number;
  mes: number;
  key: string;     // Unique key: "2026-1"
  mesKey: string;  // DB key: "jan"
  label: string;   // Display: "Jan/26"
}

interface QuantidadeMes {
  ano: number;
  mes: number;
  quantidade: number;
}

interface EditCapacityModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (quantidades: QuantidadeMes[]) => Promise<void>;
  quadroItem: QuadroPessoal;
  funcaoNome: string;
  ccCodigo: string;
  ccNome: string;
  mesesPeriodo: MesPeriodo[];
}

export function EditCapacityModal({
  open,
  onClose,
  onSave,
  quadroItem,
  funcaoNome,
  ccCodigo,
  ccNome,
  mesesPeriodo,
}: EditCapacityModalProps) {
  const [saving, setSaving] = useState(false);
  const [valores, setValores] = useState<Record<string, number>>({});
  
  // Ações rápidas: Preencher todos
  const [preencherTodosValor, setPreencherTodosValor] = useState("");
  
  // Ações rápidas: Variação progressiva
  const [variacaoMesInicio, setVariacaoMesInicio] = useState("");
  const [variacaoMesFim, setVariacaoMesFim] = useState("");
  const [variacaoPercentual, setVariacaoPercentual] = useState("");
  
  // Inicializar valores quando o modal abre
  useEffect(() => {
    if (open && quadroItem) {
      const initial: Record<string, number> = {};
      
      // Verificar se temos dados da nova estrutura (quantidades_mes)
      const quantidadesMes = (quadroItem as any).quantidades_mes as Array<{ano: number, mes: number, quantidade: number}> | undefined;
      
      if (quantidadesMes && quantidadesMes.length > 0) {
        // Usar dados da nova estrutura
        mesesPeriodo.forEach(m => {
          const registro = quantidadesMes.find(q => q.ano === m.ano && q.mes === m.mes);
          initial[m.key] = registro?.quantidade ?? 0;
        });
      } else {
        // Fallback: usar colunas qtd_xxx apenas para o primeiro ano do período
        // Para anos subsequentes, iniciar com o mesmo valor do mês correspondente do primeiro ano
        const primeiroAno = mesesPeriodo[0]?.ano;
        
        mesesPeriodo.forEach(m => {
          if (m.ano === primeiroAno) {
            // Primeiro ano: ler das colunas qtd_xxx
            const valor = quadroItem[`qtd_${m.mesKey}` as keyof QuadroPessoal] as number || 0;
            initial[m.key] = valor;
          } else {
            // Anos subsequentes: copiar do primeiro ano (usuário pode editar depois)
            const keyPrimeiroAno = `${primeiroAno}-${m.mes}`;
            initial[m.key] = initial[keyPrimeiroAno] ?? 0;
          }
        });
      }
      
      setValores(initial);
      
      // Reset ações rápidas
      setPreencherTodosValor("");
      setVariacaoMesInicio(mesesPeriodo[0]?.key || "");
      setVariacaoMesFim(mesesPeriodo[mesesPeriodo.length - 1]?.key || "");
      setVariacaoPercentual("");
    }
  }, [open, quadroItem, mesesPeriodo]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const vals = Object.values(valores);
    if (vals.length === 0) return { media: 0, total: 0, min: 0, max: 0 };
    
    const total = vals.reduce((sum, v) => sum + v, 0);
    const media = total / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    
    return { media, total, min, max };
  }, [valores]);

  // Calcular tendência
  const tendencia = useMemo(() => {
    const vals = Object.values(valores);
    if (vals.length < 2) return "stable";
    const first = vals[0];
    const last = vals[vals.length - 1];
    if (first === 0) return "stable";
    const variation = ((last - first) / first) * 100;
    if (variation > 1) return "up";
    if (variation < -1) return "down";
    return "stable";
  }, [valores]);

  // Handler: Atualizar valor individual
  const handleValorChange = (key: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    setValores(prev => ({ ...prev, [key]: numValue }));
  };

  // Handler: Preencher todos
  const handlePreencherTodos = () => {
    const valor = parseInt(preencherTodosValor.replace(/[^0-9]/g, '')) || 0;
    const newValores: Record<string, number> = {};
    mesesPeriodo.forEach(m => {
      newValores[m.key] = valor;
    });
    setValores(newValores);
  };

  // Handler: Aplicar variação progressiva linear
  const handleAplicarVariacao = () => {
    const percentual = parseFloat(variacaoPercentual.replace(',', '.')) || 0;
    if (percentual === 0) return;
    
    const inicioIndex = mesesPeriodo.findIndex(m => m.key === variacaoMesInicio);
    const fimIndex = mesesPeriodo.findIndex(m => m.key === variacaoMesFim);
    
    if (inicioIndex < 0 || fimIndex < 0 || inicioIndex >= fimIndex) return;
    
    // Valor base é o mês de início
    const valorBase = valores[mesesPeriodo[inicioIndex]?.key] || 0;
    if (valorBase === 0) return;
    
    // Quantidade de meses para distribuir a variação
    const numMeses = fimIndex - inicioIndex;
    // Incremento percentual por mês
    const incrementoMensal = percentual / numMeses;
    
    // Aplicar variação linear
    const newValores = { ...valores };
    let valorFinal = valorBase;
    
    // Aplicar variação progressiva no período
    for (let i = inicioIndex + 1; i <= fimIndex; i++) {
      const mesKey = mesesPeriodo[i]?.key;
      if (mesKey) {
        const multiplicador = 1 + ((i - inicioIndex) * incrementoMensal / 100);
        valorFinal = Math.round(valorBase * multiplicador);
        newValores[mesKey] = valorFinal;
      }
    }
    
    // Manter o valor final para todos os meses após o período
    for (let i = fimIndex + 1; i < mesesPeriodo.length; i++) {
      const mesKey = mesesPeriodo[i]?.key;
      if (mesKey) {
        newValores[mesKey] = valorFinal;
      }
    }
    
    console.log("[Variação Progressiva] Novos valores:", newValores);
    setValores(newValores);
  };

  // Handler: Salvar
  const handleSave = async () => {
    setSaving(true);
    try {
      // Converter para o novo formato quantidades_mes com ano/mês
      const quantidadesParaSalvar: QuantidadeMes[] = mesesPeriodo.map(m => ({
        ano: m.ano,
        mes: m.mes,
        quantidade: valores[m.key] || 0
      }));
      
      console.log("[EditCapacityModal] Salvando quantidades:", quantidadesParaSalvar);
      console.log("[EditCapacityModal] Estado atual valores:", valores);
      
      await onSave(quantidadesParaSalvar);
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

  const tipoCalculo = quadroItem?.tipo_calculo || 'manual';
  const isEditable = tipoCalculo === 'manual';

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
                Editar Sazonalidade: {funcaoNome}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <span className="font-mono text-xs">{ccCodigo}</span>
                <span className="mx-2">—</span>
                <span>{ccNome}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {tipoCalculo === 'span' && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  SPAN (somente leitura)
                </Badge>
              )}
              {tipoCalculo === 'rateio' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  RATEIO {quadroItem.rateio_percentual}%
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

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
                      {grupo.meses.map((m) => (
                        <div key={m.key} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {MESES_LABELS[m.mes - 1]}
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={valores[m.key] || 0}
                            onChange={(e) => handleValorChange(m.key, e.target.value)}
                            disabled={!isEditable || saving}
                            className={cn(
                              "w-14 h-9 text-center text-sm font-mono px-1",
                              !isEditable && "bg-muted cursor-not-allowed"
                            )}
                          />
                        </div>
                      ))}
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
        {isEditable && (
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
                      inputMode="numeric"
                      pattern="[0-9]*"
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
        )}

        {/* Footer com resumo e botões */}
        <DialogFooter className="shrink-0 pt-4 px-6 pb-6 border-t">
          <div className="flex items-center justify-between w-full">
            {/* Resumo */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Média:</span>
                <span className="font-mono font-medium">{stats.media.toFixed(1)}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-mono font-medium">{stats.total.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Min:</span>
                <span className="font-mono">{stats.min}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max:</span>
                <span className="font-mono">{stats.max}</span>
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
                disabled={saving || !isEditable}
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

