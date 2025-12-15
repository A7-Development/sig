"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Calculator } from "lucide-react";
import { type Funcao, type FuncaoSpan, type FuncaoSpanCreate } from "@/lib/api/orcamento";

interface SpanConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FuncaoSpanCreate) => Promise<void>;
  funcoes: Funcao[];
  spanExistente?: FuncaoSpan | null;
  cenarioId: string;
}

export function SpanConfigDialog({
  open,
  onClose,
  onSave,
  funcoes,
  spanExistente,
  cenarioId,
}: SpanConfigDialogProps) {
  const [funcaoId, setFuncaoId] = useState<string>("");
  const [funcoesBaseIds, setFuncoesBaseIds] = useState<string[]>([]);
  const [spanRatio, setSpanRatio] = useState<string>("35");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (spanExistente) {
      setFuncaoId(spanExistente.funcao_id);
      setFuncoesBaseIds(spanExistente.funcoes_base_ids || []);
      setSpanRatio(String(spanExistente.span_ratio));
    } else {
      setFuncaoId("");
      setFuncoesBaseIds([]);
      setSpanRatio("35");
    }
  }, [spanExistente, open]);

  const handleAddFuncaoBase = (funcaoIdToAdd: string) => {
    if (funcaoIdToAdd && !funcoesBaseIds.includes(funcaoIdToAdd)) {
      setFuncoesBaseIds([...funcoesBaseIds, funcaoIdToAdd]);
    }
  };

  const handleRemoveFuncaoBase = (funcaoIdToRemove: string) => {
    setFuncoesBaseIds(funcoesBaseIds.filter((id) => id !== funcaoIdToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcaoId || funcoesBaseIds.length === 0 || !spanRatio) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        cenario_id: cenarioId,
        funcao_id: funcaoId,
        funcoes_base_ids: funcoesBaseIds,
        span_ratio: parseFloat(spanRatio),
        ativo: true,
      });
      onClose();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar span");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const funcoesDisponiveis = funcoes.filter((f) => f.id !== funcaoId && f.ativo !== false);
  const funcoesBaseSelecionadas = funcoes.filter((f) => funcoesBaseIds.includes(f.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {spanExistente ? "Editar Configuração de Span" : "Nova Configuração de Span"}
          </CardTitle>
          <CardDescription>
            Configure o cálculo automático de quantidades baseado em outras funções
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Função que será calculada via span */}
            <div className="form-field">
              <Label className="filter-label">Função a Calcular *</Label>
              <Select
                value={funcaoId}
                onValueChange={setFuncaoId}
                disabled={!!spanExistente}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione a função..." />
                </SelectTrigger>
                <SelectContent>
                  {funcoes
                    .filter((f) => f.ativo !== false)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Função que terá sua quantidade calculada automaticamente via span
              </p>
            </div>

            {/* Funções base */}
            <div className="form-field">
              <Label className="filter-label">Funções Base para Cálculo *</Label>
              <div className="space-y-2">
                {/* Seletor para adicionar função base */}
                <Select
                  value=""
                  onValueChange={handleAddFuncaoBase}
                  disabled={funcoesDisponiveis.length === 0}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Adicionar função base..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoesDisponiveis.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Lista de funções base selecionadas */}
                {funcoesBaseSelecionadas.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                    {funcoesBaseSelecionadas.map((f) => (
                      <Badge
                        key={f.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {f.nome}
                        <button
                          type="button"
                          onClick={() => handleRemoveFuncaoBase(f.id)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione uma ou mais funções. O span será calculado sobre a soma das quantidades dessas funções.
              </p>
            </div>

            {/* Ratio do span */}
            <div className="form-field">
              <Label className="filter-label">Ratio do Span *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={spanRatio}
                  onChange={(e) => setSpanRatio(e.target.value)}
                  placeholder="35"
                  className="h-8 text-sm font-mono"
                  required
                />
                <span className="text-sm text-muted-foreground">= 1 para cada</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: 35 significa 1 {funcaoId ? funcoes.find(f => f.id === funcaoId)?.nome : "função"} para cada 35{" "}
                {funcoesBaseSelecionadas.length > 0
                  ? funcoesBaseSelecionadas.map((f) => f.nome).join(" + ")
                  : "funções base"}
              </p>
            </div>

            {/* Preview do cálculo */}
            {funcaoId && funcoesBaseIds.length > 0 && spanRatio && (
              <div className="p-3 bg-muted/30 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold">Fórmula de Cálculo:</span>
                </div>
                <div className="text-xs font-mono space-y-1">
                  <div>
                    <span className="text-muted-foreground">Quantidade =</span>{" "}
                    <span className="font-bold">
                      CEIL(Σ({funcoesBaseSelecionadas.map((f) => f.nome).join(" + ")}) / {spanRatio})
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-2">
                    O cálculo será feito por mês, somando as quantidades das funções base e dividindo pelo ratio.
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" variant="success" size="sm" disabled={loading}>
                {loading ? "Salvando..." : spanExistente ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



