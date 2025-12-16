"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  X,
  Calculator,
  Users,
  PieChart,
  Pencil,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Funcao,
  type QuadroPessoal,
  type CenarioSecao,
} from "@/lib/api/orcamento";

// ============================================
// Tipos
// ============================================

type TipoCalculo = "manual" | "span" | "rateio";

interface RateioSecao {
  secaoId: string;
  secaoNome: string;
  percentual: number;
}

interface AddFuncaoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddFuncaoData) => Promise<void>;
  funcoes: Funcao[];
  funcoesJaAdicionadas: QuadroPessoal[];  // Funções já na seção atual
  secaoAtual: CenarioSecao;
  todasSecoes: CenarioSecao[];  // Todas as seções do cenário (para rateio)
  cenarioId: string;
}

export interface AddFuncaoData {
  funcao_id: string;
  tipo_calculo: TipoCalculo;
  fator_pa: number;
  // Para SPAN
  span_ratio?: number;
  span_funcoes_base_ids?: string[];
  // Para RATEIO
  rateio_secoes?: RateioSecao[];
  rateio_qtd_total?: number;
}

// ============================================
// Componente Principal
// ============================================

export function AddFuncaoModal({
  open,
  onClose,
  onSave,
  funcoes,
  funcoesJaAdicionadas,
  secaoAtual,
  todasSecoes,
  cenarioId,
}: AddFuncaoModalProps) {
  // Estado do formulário
  const [funcaoId, setFuncaoId] = useState<string>("");
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("manual");
  const [fatorPA, setFatorPA] = useState<number>(1);
  
  // Estado para SPAN
  const [spanRatio, setSpanRatio] = useState<number>(35);
  const [spanFuncoesBaseIds, setSpanFuncoesBaseIds] = useState<string[]>([]);
  
  // Estado para RATEIO
  const [rateioQtdTotal, setRateioQtdTotal] = useState<number>(1);
  const [rateioSecoes, setRateioSecoes] = useState<RateioSecao[]>([]);
  
  // Estado de loading
  const [saving, setSaving] = useState(false);

  // Reset quando modal abre
  useEffect(() => {
    if (open) {
      setFuncaoId("");
      setTipoCalculo("manual");
      setFatorPA(1);
      setSpanRatio(35);
      setSpanFuncoesBaseIds([]);
      setRateioQtdTotal(1);
      // Inicializa rateio com seção atual em 100%
      setRateioSecoes([{
        secaoId: secaoAtual.id,
        secaoNome: secaoAtual.secao?.nome || "Seção atual",
        percentual: 100,
      }]);
    }
  }, [open, secaoAtual]);

  // Funções disponíveis (ainda não adicionadas)
  const funcoesDisponiveis = funcoes.filter(
    (f) => f.ativo !== false && !funcoesJaAdicionadas.some((q) => q.funcao_id === f.id)
  );

  // Funções base disponíveis para span (já adicionadas na seção, exceto a selecionada)
  const funcoesBaseDisponiveis = funcoesJaAdicionadas.filter(
    (q) => q.funcao_id !== funcaoId && q.ativo
  );

  // Outras seções disponíveis para rateio
  const outrasSecoes = todasSecoes.filter((s) => s.id !== secaoAtual.id && s.ativo);

  // Validação do rateio (soma deve ser 100%)
  const somaPercentuais = rateioSecoes.reduce((acc, s) => acc + (s.percentual || 0), 0);
  const rateioValido = Math.abs(somaPercentuais - 100) < 0.01;

  // ============================================
  // Handlers SPAN
  // ============================================

  const handleAddFuncaoBase = (quadroId: string) => {
    const quadro = funcoesJaAdicionadas.find((q) => q.id === quadroId);
    if (quadro && !spanFuncoesBaseIds.includes(quadro.funcao_id)) {
      setSpanFuncoesBaseIds([...spanFuncoesBaseIds, quadro.funcao_id]);
    }
  };

  const handleRemoveFuncaoBase = (funcaoIdToRemove: string) => {
    setSpanFuncoesBaseIds(spanFuncoesBaseIds.filter((id) => id !== funcaoIdToRemove));
  };

  // ============================================
  // Handlers RATEIO
  // ============================================

  const handleToggleSecaoRateio = (secao: CenarioSecao, checked: boolean) => {
    if (checked) {
      // Adiciona seção com 0%
      setRateioSecoes([
        ...rateioSecoes,
        {
          secaoId: secao.id,
          secaoNome: secao.secao?.nome || "Seção",
          percentual: 0,
        },
      ]);
    } else {
      // Remove seção (não pode remover a atual)
      if (secao.id !== secaoAtual.id) {
        setRateioSecoes(rateioSecoes.filter((s) => s.secaoId !== secao.id));
      }
    }
  };

  const handleChangePercentualRateio = (secaoId: string, percentual: number) => {
    setRateioSecoes(
      rateioSecoes.map((s) =>
        s.secaoId === secaoId ? { ...s, percentual } : s
      )
    );
  };

  // ============================================
  // Submit
  // ============================================

  const handleSubmit = async () => {
    if (!funcaoId) {
      alert("Selecione uma função");
      return;
    }

    // Validações específicas por tipo
    if (tipoCalculo === "span") {
      if (spanFuncoesBaseIds.length === 0) {
        alert("Selecione pelo menos uma função base para o cálculo do span");
        return;
      }
      if (!spanRatio || spanRatio <= 0) {
        alert("Informe um ratio válido para o span");
        return;
      }
    }

    if (tipoCalculo === "rateio") {
      if (!rateioValido) {
        alert("A soma dos percentuais do rateio deve ser 100%");
        return;
      }
      if (!rateioQtdTotal || rateioQtdTotal <= 0) {
        alert("Informe a quantidade total a ser rateada");
        return;
      }
    }

    setSaving(true);
    try {
      const data: AddFuncaoData = {
        funcao_id: funcaoId,
        tipo_calculo: tipoCalculo,
        fator_pa: fatorPA,
      };

      if (tipoCalculo === "span") {
        data.span_ratio = spanRatio;
        data.span_funcoes_base_ids = spanFuncoesBaseIds;
      }

      if (tipoCalculo === "rateio") {
        data.rateio_secoes = rateioSecoes;
        data.rateio_qtd_total = rateioQtdTotal;
      }

      await onSave(data);
      onClose();
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar função");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Função</DialogTitle>
          <DialogDescription>
            Adicione uma função à seção <strong>{secaoAtual.secao?.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção da Função */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Função *
            </Label>
            <Select value={funcaoId} onValueChange={setFuncaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função..." />
              </SelectTrigger>
              <SelectContent>
                {funcoesDisponiveis.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Todas as funções já foram adicionadas
                  </div>
                ) : (
                  funcoesDisponiveis.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome} ({f.codigo})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Fator PA */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fator PA
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={fatorPA}
              onChange={(e) => setFatorPA(parseFloat(e.target.value) || 1)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Fator para calcular Posições de Atendimento (HC / fator = PAs)
            </p>
          </div>

          {/* Tipo de Cálculo */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo de Cálculo *
            </Label>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Manual */}
              <button
                type="button"
                onClick={() => setTipoCalculo("manual")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  tipoCalculo === "manual"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-muted hover:border-orange-200 hover:bg-orange-50/50"
                )}
              >
                <Pencil className="h-6 w-6" />
                <span className="font-medium text-sm">Manual</span>
                <span className="text-xs text-center text-muted-foreground">
                  Digitar quantidades
                </span>
              </button>

              {/* Span */}
              <button
                type="button"
                onClick={() => setTipoCalculo("span")}
                disabled={funcoesBaseDisponiveis.length === 0}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  tipoCalculo === "span"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-muted hover:border-blue-200 hover:bg-blue-50/50",
                  funcoesBaseDisponiveis.length === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                <Calculator className="h-6 w-6" />
                <span className="font-medium text-sm">Span</span>
                <span className="text-xs text-center text-muted-foreground">
                  Calcular por outras funções
                </span>
              </button>

              {/* Rateio */}
              <button
                type="button"
                onClick={() => setTipoCalculo("rateio")}
                disabled={outrasSecoes.length === 0}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  tipoCalculo === "rateio"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-muted hover:border-green-200 hover:bg-green-50/50",
                  outrasSecoes.length === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                <PieChart className="h-6 w-6" />
                <span className="font-medium text-sm">Rateio</span>
                <span className="text-xs text-center text-muted-foreground">
                  Compartilhar entre seções
                </span>
              </button>
            </div>
          </div>

          {/* Configuração SPAN */}
          {tipoCalculo === "span" && (
            <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <Calculator className="h-4 w-4" />
                <span className="font-semibold text-sm">Configuração do Span</span>
              </div>

              {/* Funções Base */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Funções Base para Cálculo *</Label>
                <Select value="" onValueChange={handleAddFuncaoBase}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar função base..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoesBaseDisponiveis
                      .filter((q) => !spanFuncoesBaseIds.includes(q.funcao_id))
                      .map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.funcao?.nome || "Função"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {spanFuncoesBaseIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-white rounded border">
                    {spanFuncoesBaseIds.map((fId) => {
                      const funcao = funcoes.find((f) => f.id === fId);
                      return (
                        <Badge key={fId} variant="secondary" className="flex items-center gap-1 pr-1">
                          {funcao?.nome || "Função"}
                          <button
                            type="button"
                            onClick={() => handleRemoveFuncaoBase(fId)}
                            className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ratio */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Ratio do Span *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">1 para cada</span>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={spanRatio}
                    onChange={(e) => setSpanRatio(parseInt(e.target.value) || 35)}
                    className="w-24 font-mono"
                  />
                </div>
              </div>

              {/* Preview da fórmula */}
              {spanFuncoesBaseIds.length > 0 && (
                <div className="p-3 bg-white rounded border text-xs font-mono">
                  <span className="text-muted-foreground">Fórmula: </span>
                  <span className="font-bold">
                    CEIL(Σ({spanFuncoesBaseIds.map((id) => funcoes.find((f) => f.id === id)?.nome).join(" + ")}) / {spanRatio})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Configuração RATEIO */}
          {tipoCalculo === "rateio" && (
            <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <PieChart className="h-4 w-4" />
                <span className="font-semibold text-sm">Configuração do Rateio</span>
              </div>

              {/* Quantidade Total */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Quantidade Total *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={rateioQtdTotal}
                    onChange={(e) => setRateioQtdTotal(parseInt(e.target.value) || 1)}
                    className="w-24 font-mono"
                  />
                  <span className="text-sm text-muted-foreground">pessoas a distribuir</span>
                </div>
              </div>

              {/* Seções e Percentuais */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Distribuição por Seção *</Label>
                
                <div className="space-y-2 p-3 bg-white rounded border">
                  {/* Seção Atual (sempre incluída) */}
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                    <Checkbox checked disabled />
                    <span className="flex-1 text-sm font-medium">
                      {secaoAtual.secao?.nome} <Badge variant="outline" className="ml-2 text-[10px]">atual</Badge>
                    </span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={rateioSecoes.find((s) => s.secaoId === secaoAtual.id)?.percentual || 0}
                        onChange={(e) => handleChangePercentualRateio(secaoAtual.id, parseFloat(e.target.value) || 0)}
                        className="w-20 font-mono text-right"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>

                  {/* Outras Seções */}
                  {outrasSecoes.map((secao) => {
                    const isSelected = rateioSecoes.some((s) => s.secaoId === secao.id);
                    return (
                      <div key={secao.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleSecaoRateio(secao, !!checked)}
                        />
                        <span className="flex-1 text-sm">
                          {secao.secao?.nome}
                        </span>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={rateioSecoes.find((s) => s.secaoId === secao.id)?.percentual || 0}
                              onChange={(e) => handleChangePercentualRateio(secao.id, parseFloat(e.target.value) || 0)}
                              className="w-20 font-mono text-right"
                            />
                            <span className="text-sm">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Soma dos percentuais */}
                <div className={cn(
                  "flex items-center justify-between p-2 rounded text-sm",
                  rateioValido ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  <span>Total:</span>
                  <span className="font-mono font-bold">
                    {somaPercentuais.toFixed(1)}%
                    {rateioValido ? " ✓" : " (deve ser 100%)"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !funcaoId}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


