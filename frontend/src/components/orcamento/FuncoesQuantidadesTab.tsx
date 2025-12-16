"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Calculator,
  Settings,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { 
  type Funcao, 
  type FuncaoSpan, 
  type QuadroPessoal,
  type FuncaoSpanCreate,
  cenariosApi
} from "@/lib/api/orcamento";
import { SpanConfigDialog } from "./SpanConfigDialog";
import { useAuthStore } from "@/stores/auth-store";

interface FuncoesQuantidadesTabProps {
  cenarioId: string;
  funcoes: Funcao[];
  quadro: QuadroPessoal[];
  onQuadroChange: () => void;
}

type TipoQuantificacao = 'manual' | 'span' | 'rateio';

interface FuncaoConfig {
  funcao: Funcao;
  tipo: TipoQuantificacao;
  span?: FuncaoSpan | null;
}

export function FuncoesQuantidadesTab({
  cenarioId,
  funcoes,
  quadro,
  onQuadroChange,
}: FuncoesQuantidadesTabProps) {
  const { accessToken: token } = useAuthStore();
  const [spans, setSpans] = useState<FuncaoSpan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSpanDialog, setShowSpanDialog] = useState(false);
  const [spanEditando, setSpanEditando] = useState<FuncaoSpan | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    if (token && cenarioId) {
      carregarSpans();
    }
  }, [token, cenarioId]);

  const carregarSpans = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cenariosApi.getSpans(token, cenarioId);
      setSpans(data);
    } catch (error) {
      console.error("Erro ao carregar spans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSpan = async (data: FuncaoSpanCreate) => {
    if (!token) return;
    try {
      if (spanEditando) {
        await cenariosApi.updateSpan(token, cenarioId, spanEditando.id, data);
      } else {
        await cenariosApi.createSpan(token, cenarioId, data);
      }
      await carregarSpans();
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteSpan = async (spanId: string) => {
    if (!token || !confirm("Deseja remover esta configuração de span?")) return;
    try {
      await cenariosApi.deleteSpan(token, cenarioId, spanId);
      await carregarSpans();
    } catch (error: any) {
      alert(error.message || "Erro ao remover span");
    }
  };

  const handleCalcularSpans = async (aplicar: boolean = false) => {
    if (!token) return;
    setCalculando(true);
    try {
      const resultado = await cenariosApi.calcularSpans(token, cenarioId, aplicar);
      if (aplicar) {
        alert(
          `Cálculo aplicado com sucesso!\n` +
          `Criadas: ${resultado.criadas || 0}\n` +
          `Atualizadas: ${resultado.atualizadas || 0}`
        );
        onQuadroChange();
      } else {
        const totalFuncoes = resultado.total_funcoes || 0;
        const totalMeses = resultado.total_meses || 0;
        alert(
          `Cálculo realizado!\n` +
          `Funções: ${totalFuncoes}\n` +
          `Cálculos: ${totalMeses}\n\n` +
          `Use "Aplicar ao Quadro" para atualizar as quantidades.`
        );
      }
    } catch (error: any) {
      alert(error.message || "Erro ao calcular spans");
    } finally {
      setCalculando(false);
    }
  };

  // Mapear funções com suas configurações
  const funcoesConfig: FuncaoConfig[] = funcoes
    .filter((f) => f.ativo !== false)
    .map((funcao) => {
      const span = spans.find((s) => s.funcao_id === funcao.id);
      const temPosicao = quadro.some((q) => q.funcao_id === funcao.id && q.ativo);
      
      let tipo: TipoQuantificacao = 'manual';
      if (span) {
        tipo = 'span';
      } else if (temPosicao) {
        tipo = 'manual';
      }

      return {
        funcao,
        tipo,
        span: span || null,
      };
    });

  const funcoesComSpan = funcoesConfig.filter((fc) => fc.tipo === 'span');
  const funcoesManuais = funcoesConfig.filter((fc) => fc.tipo === 'manual' && quadro.some(q => q.funcao_id === fc.funcao.id));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-4 border-b bg-muted/10">
        <div>
          <h2 className="section-title">Funções e Quantidades</h2>
          <p className="page-subtitle">
            Configure como as quantidades serão calculadas para cada função
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCalcularSpans(false)}
            disabled={calculando || funcoesComSpan.length === 0}
          >
            <Calculator className="h-4 w-4 mr-1" />
            Calcular Spans
          </Button>
          <Button
            size="sm"
            variant="alert"
            onClick={() => handleCalcularSpans(true)}
            disabled={calculando || funcoesComSpan.length === 0}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Aplicar ao Quadro
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-6">
            {/* Funções com Span */}
            {funcoesComSpan.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Funções Calculadas via Span</CardTitle>
                      <CardDescription className="text-xs">
                        Quantidades calculadas automaticamente baseadas em outras funções
                      </CardDescription>
                    </div>
                    <Badge variant="alert" className="text-[10px]">
                      {funcoesComSpan.length} função{funcoesComSpan.length !== 1 ? "ões" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Função</TableHead>
                        <TableHead>Funções Base</TableHead>
                        <TableHead className="w-24 text-center">Ratio</TableHead>
                        <TableHead className="w-32 text-center">Tipo</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcoesComSpan.map((fc) => {
                        const span = fc.span!;
                        const funcoesBase = funcoes.filter((f) =>
                          span.funcoes_base_ids.includes(f.id)
                        );
                        return (
                          <TableRow key={fc.funcao.id}>
                            <TableCell className="font-medium">
                              {fc.funcao.nome}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {funcoesBase.map((f) => (
                                  <Badge key={f.id} variant="secondary" className="text-[10px]">
                                    {f.nome}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              1 : {span.span_ratio}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="alert" className="text-[10px]">Span</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() => {
                                    setSpanEditando(span);
                                    setShowSpanDialog(true);
                                  }}
                                  className="hover:bg-orange-50 hover:text-orange-600"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() => handleDeleteSpan(span.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Funções Manuais */}
            {funcoesManuais.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Funções com Quantidade Manual</CardTitle>
                      <CardDescription className="text-xs">
                        Quantidades definidas manualmente no quadro de pessoal
                      </CardDescription>
                    </div>
                    <Badge variant="info" className="text-[10px]">
                      {funcoesManuais.length} função{funcoesManuais.length !== 1 ? "ões" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Função</TableHead>
                        <TableHead className="w-32 text-center">Tipo</TableHead>
                        <TableHead className="w-32 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcoesManuais.map((fc) => (
                        <TableRow key={fc.funcao.id}>
                          <TableCell className="font-medium">{fc.funcao.nome}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="info" className="text-[10px]">Manual</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => {
                                setSpanEditando(null);
                                setShowSpanDialog(true);
                                // Pré-selecionar função
                                setTimeout(() => {
                                  const select = document.querySelector(
                                    '[data-funcao-select]'
                                  ) as HTMLSelectElement;
                                  if (select) select.value = fc.funcao.id;
                                }, 100);
                              }}
                              className="hover:bg-orange-50 hover:text-orange-600"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Funções sem configuração */}
            {funcoesConfig.filter((fc) => !fc.span && !quadro.some(q => q.funcao_id === fc.funcao.id)).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Funções Disponíveis</CardTitle>
                      <CardDescription className="text-xs">
                        Funções que ainda não foram configuradas
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        setSpanEditando(null);
                        setShowSpanDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Configurar Span
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {funcoesConfig
                      .filter((fc) => !fc.span && !quadro.some(q => q.funcao_id === fc.funcao.id))
                      .map((fc) => (
                        <Badge
                          key={fc.funcao.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => {
                            setSpanEditando(null);
                            setShowSpanDialog(true);
                          }}
                        >
                          {fc.funcao.nome}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {funcoesConfig.length === 0 && (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <p className="empty-state-title">Nenhuma função disponível</p>
                <p className="empty-state-description">
                  Cadastre funções primeiro para poder configurar spans
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de Configuração de Span */}
      <SpanConfigDialog
        open={showSpanDialog}
        onClose={() => {
          setShowSpanDialog(false);
          setSpanEditando(null);
        }}
        onSave={handleSaveSpan}
        funcoes={funcoes}
        spanExistente={spanEditando}
        cenarioId={cenarioId}
      />
    </div>
  );
}





