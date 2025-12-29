"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  FolderTree,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Calculator,
  Pencil,
  PieChart,
  Briefcase,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi,
  funcoesApi,
  centrosCustoApi,
  validacaoCenario,
  type CenarioEmpresa,
  type CenarioSecao,
  type QuadroPessoal,
  type Funcao,
  type CentroCusto,
} from "@/lib/api/orcamento";
import { AddFuncaoModal, type AddFuncaoData } from "./AddFuncaoModal";
import { v4 as uuidv4 } from "uuid";

interface CCDisponivel {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
}

// ============================================
// Tipos
// ============================================

interface CapacityPlanningPanelProps {
  cenarioId: string;
  empresa: CenarioEmpresa;
  secao: CenarioSecao;
  todasSecoes: CenarioSecao[];  // Para rateio entre seções
  centroCusto?: CentroCusto;    // CC selecionado na árvore (filtra o quadro)
  anoInicio: number;
  mesInicio: number;
  anoFim: number;
  mesFim: number;
  onScenarioChange?: () => void;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_KEYS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ============================================
// Componente Principal
// ============================================

export function CapacityPlanningPanel({
  cenarioId,
  empresa,
  secao,
  todasSecoes,
  centroCusto,
  anoInicio,
  mesInicio,
  anoFim,
  mesFim,
  onScenarioChange,
}: CapacityPlanningPanelProps) {
  const { accessToken: token } = useAuthStore();
  
  const [quadroCompleto, setQuadroCompleto] = useState<QuadroPessoal[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [centrosCustoDisponiveis, setCentrosCustoDisponiveis] = useState<CCDisponivel[]>([]);
  const [todosCentrosCusto, setTodosCentrosCusto] = useState<CCDisponivel[]>([]);  // Todos os CCs para rateio
  const [isCorporativo, setIsCorporativo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtrar quadro pelo CC selecionado (se houver)
  const quadro = centroCusto 
    ? quadroCompleto.filter(q => q.centro_custo_id === centroCusto.id)
    : quadroCompleto;
  
  // Modal adicionar função
  const [showAddFuncao, setShowAddFuncao] = useState(false);
  
  // Edição inline
  const [editingCell, setEditingCell] = useState<{id: string, mes: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingNextCell, setPendingNextCell] = useState<{id: string, mes: string} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Quando os dados recarregam e tem célula pendente, ativar edição
  useEffect(() => {
    if (pendingNextCell && !loading) {
      const item = quadro.find(q => q.id === pendingNextCell.id);
      if (item && item.tipo_calculo !== 'span') {
        setEditingCell(pendingNextCell);
        setEditValue(String(item[`qtd_${pendingNextCell.mes}` as keyof QuadroPessoal] || 0));
      }
      setPendingNextCell(null);
    }
  }, [loading, pendingNextCell, quadro]);
  
  // Focar e selecionar texto quando input monta
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // ============================================
  // Carregar dados
  // ============================================

  const carregarDados = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Carregar quadro de pessoal da seção
      const quadroData = await cenariosApi.getQuadro(token, cenarioId);
      const quadroSecao = quadroData.filter(q => q.cenario_secao_id === secao.id && q.ativo);
      setQuadroCompleto(quadroSecao);
      
      // Carregar funções disponíveis
      const funcoesData = await funcoesApi.listar(token, { ativo: true });
      setFuncoes(funcoesData);
      
      // Carregar TODOS os centros de custo (sem validação de tipo)
      try {
        const todosCCsData = await centrosCustoApi.listar(token, { ativo: true });
        const ccsFormatados = todosCCsData.map(cc => ({
          id: cc.id,
          codigo: cc.codigo,
          nome: cc.nome,
          tipo: cc.tipo || 'OPERACIONAL',
        }));
        setCentrosCustoDisponiveis(ccsFormatados);
        setTodosCentrosCusto(ccsFormatados);
        setIsCorporativo(false); // Não usar mais essa validação
      } catch (err) {
        console.warn("Não foi possível carregar CCs:", err);
        setCentrosCustoDisponiveis([]);
        setTodosCentrosCusto([]);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [token, cenarioId, secao.id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ============================================
  // Calcular meses do período
  // ============================================

  const mesesPeriodo = useCallback(() => {
    const meses: { ano: number; mes: number; label: string; key: string; mesKey: string }[] = [];
    let ano = anoInicio;
    let mes = mesInicio;
    
    while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
      meses.push({
        ano,
        mes,
        label: `${MESES[mes - 1]}/${String(ano).slice(-2)}`,
        key: `${ano}-${mes}`,  // Unique key for React
        mesKey: MESES_KEYS[mes - 1]  // Key for database field access (jan, fev, etc.)
      });
      
      mes++;
      if (mes > 12) {
        mes = 1;
        ano++;
      }
    }
    
    return meses;
  }, [anoInicio, mesInicio, anoFim, mesFim]);

  // ============================================
  // Handlers
  // ============================================

  const handleAddFuncao = async (data: AddFuncaoData) => {
    if (!token) return;
    
    try {
      if (data.tipo_calculo === "rateio" && data.rateio_ccs && data.rateio_ccs.length > 0) {
        // RATEIO entre CCs: Criar uma entrada para cada CC participante
        const grupoId = uuidv4();
        const qtdTotal = data.rateio_qtd_total || 1;
        
        for (const rateioCC of data.rateio_ccs) {
          // Calcular quantidade rateada: total * percentual / 100
          const qtdRateada = qtdTotal * (rateioCC.percentual / 100);
          
          await cenariosApi.addQuadro(token, cenarioId, {
            cenario_id: cenarioId,
            funcao_id: data.funcao_id,
            cenario_secao_id: secao.id,  // Mantém a seção atual
            centro_custo_id: rateioCC.ccId,  // Varia por CC
            secao_id: null,
            tabela_salarial_id: null,
            fator_pa: data.fator_pa,
            regime: "CLT",
            tipo_calculo: "rateio",
            rateio_grupo_id: grupoId,
            rateio_percentual: rateioCC.percentual,
            rateio_qtd_total: qtdTotal,
            span: null,
            span_ratio: null,
            span_funcoes_base_ids: null,
            salario_override: null,
            observacao: null,
            ativo: true,
            // Aplicar quantidade rateada em todos os meses
            qtd_jan: qtdRateada, qtd_fev: qtdRateada, qtd_mar: qtdRateada, qtd_abr: qtdRateada,
            qtd_mai: qtdRateada, qtd_jun: qtdRateada, qtd_jul: qtdRateada, qtd_ago: qtdRateada,
            qtd_set: qtdRateada, qtd_out: qtdRateada, qtd_nov: qtdRateada, qtd_dez: qtdRateada,
          });
        }
      } else {
        const quantidadeBase = data.tipo_calculo === "manual" && data.aplicar_periodo
          ? (data.quantidade_base || 0)
          : 0;
        // MANUAL ou SPAN: Criar uma única entrada
        await cenariosApi.addQuadro(token, cenarioId, {
          cenario_id: cenarioId,
          funcao_id: data.funcao_id,
          cenario_secao_id: secao.id,
          centro_custo_id: data.centro_custo_id,
          secao_id: null,
          tabela_salarial_id: null,
          fator_pa: data.fator_pa,
          regime: "CLT",
          tipo_calculo: data.tipo_calculo,
          span: null,
          span_ratio: data.span_ratio || null,
          span_funcoes_base_ids: data.span_funcoes_base_ids || null,
          rateio_grupo_id: null,
          rateio_percentual: null,
          rateio_qtd_total: null,
          salario_override: null,
          observacao: null,
          ativo: true,
          qtd_jan: quantidadeBase, qtd_fev: quantidadeBase, qtd_mar: quantidadeBase, qtd_abr: quantidadeBase,
          qtd_mai: quantidadeBase, qtd_jun: quantidadeBase, qtd_jul: quantidadeBase, qtd_ago: quantidadeBase,
          qtd_set: quantidadeBase, qtd_out: quantidadeBase, qtd_nov: quantidadeBase, qtd_dez: quantidadeBase,
        });
      }
      
      await carregarDados();
      onScenarioChange?.();
      setShowAddFuncao(false);
    } catch (err: any) {
      throw err; // Re-throw para o modal tratar
    }
  };

  const handleDeleteFuncao = async (quadroItem: QuadroPessoal) => {
    if (!token) return;
    const funcaoNome = quadroItem.funcao?.nome || "esta função";
    if (!confirm(`Remover ${funcaoNome} desta seção?`)) return;
    
    try {
      await cenariosApi.deleteQuadro(token, cenarioId, quadroItem.id);
      await carregarDados();
      onScenarioChange?.();
    } catch (err: any) {
      alert(err.message || "Erro ao remover função");
    }
  };

  const handleCellEdit = async (
    quadroItem: QuadroPessoal, 
    mesKey: string, 
    valor: number,
    nextCell?: {id: string, mes: string} | null
  ) => {
    if (!token) return;
    
    setEditingCell(null); // Limpar edição atual
    
    const updateData: any = {};
    updateData[`qtd_${mesKey}`] = valor;
    
    try {
      // Definir próxima célula antes de recarregar
      if (nextCell) {
        setPendingNextCell(nextCell);
      }
      
      await cenariosApi.updateQuadro(token, cenarioId, quadroItem.id, updateData);
      // Recarregar dados para atualizar SPANs recalculados
      await carregarDados();
      onScenarioChange?.();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar");
      setPendingNextCell(null);
    }
  };

  const handleFatorPAEdit = async (quadroItem: QuadroPessoal, novoFator: number) => {
    if (!token) return;
    
    try {
      await cenariosApi.updateQuadro(token, cenarioId, quadroItem.id, { fator_pa: novoFator });
      setQuadroCompleto(prev => prev.map(q => 
        q.id === quadroItem.id ? { ...q, fator_pa: novoFator } : q
      ));
      onScenarioChange?.();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar fator PA");
    }
  };

  // ============================================
  // Cálculos
  // ============================================

  const calcularTotalMes = (mesKey: string) => {
    return quadro.reduce((sum, q) => sum + (q[`qtd_${mesKey}` as keyof QuadroPessoal] as number || 0), 0);
  };

  const calcularTotalFuncao = (quadroItem: QuadroPessoal) => {
    return MESES_KEYS.reduce((sum, key) => 
      sum + (quadroItem[`qtd_${key}` as keyof QuadroPessoal] as number || 0), 0
    );
  };

  const calcularPAsMes = (mesKey: string) => {
    return quadro.reduce((sum, q) => {
      const qtd = q[`qtd_${mesKey}` as keyof QuadroPessoal] as number || 0;
      const fator = q.fator_pa || 1;
      return sum + (qtd / fator);
    }, 0);
  };


  // ============================================
  // Funções não utilizadas nesta seção
  // ============================================

  // Funções disponíveis: permite a mesma função em diferentes CCs
  // A unicidade agora é por (função_id + centro_custo_id)
  // Aqui mostramos todas as funções, pois o usuário pode usar a mesma função em outro CC
  const funcoesNaoUtilizadas = funcoes.filter(f => f.ativo !== false);

  const meses = mesesPeriodo();

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="border-b bg-muted/10 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {centroCusto ? (
                <Briefcase className="h-5 w-5 text-blue-600" />
              ) : (
                <FolderTree className="h-5 w-5 text-green-600" />
              )}
              <CardTitle className="text-lg">
                {centroCusto ? centroCusto.nome : secao.secao?.nome}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {centroCusto ? centroCusto.codigo : secao.secao?.codigo}
              </Badge>
              {centroCusto && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  {centroCusto.tipo}
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <FolderTree className="h-3 w-3" />
                {secao.secao?.nome}
              </span>
              {secao.is_corporativo && (
                <Badge variant="outline" className="bg-orange-100 text-orange-600 text-xs">
                  CORPORATIVO
                </Badge>
              )}
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowAddFuncao(true)}
            disabled={funcoesNaoUtilizadas.length === 0 || !centroCusto}
            title={!centroCusto ? "Selecione um Centro de Custo na árvore para adicionar funções" : undefined}
          >
            <Plus className="h-4 w-4 mr-1" />
            Função
          </Button>
        </div>
      </CardHeader>

      {/* Tabela de Quadro */}
      <CardContent className="flex-1 overflow-auto p-0">
        {!centroCusto ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Selecione um Centro de Custo</p>
            <p className="text-xs mt-1 max-w-sm text-center">
              Expanda esta seção na árvore e clique em um Centro de Custo para visualizar e gerenciar o quadro de pessoal
            </p>
          </div>
        ) : quadro.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calculator className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma função configurada neste Centro de Custo</p>
            <p className="text-xs mt-1">Clique em "+ Função" para adicionar</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="px-4 py-2 border-b bg-muted/20 text-xs text-muted-foreground">
              Defina a capacidade base e ajuste a sazonalidade clicando nas células mensais.
            </div>
            <Table className="corporate-table">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[140px] text-[10px]">Função</TableHead>
                <TableHead className="text-center w-16 text-[10px]">Fator PA</TableHead>
                {meses.map(m => (
                  <TableHead key={`${m.ano}-${m.mes}`} className="text-center w-12 text-[10px] px-1">
                    {m.label}
                  </TableHead>
                ))}
                <TableHead className="text-center w-12 bg-muted/30 text-[10px]">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quadro.map(item => {
                const total = calcularTotalFuncao(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-[10px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate leading-tight">{item.funcao?.nome}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {item.funcao?.codigo}
                          </span>
                          {item.centro_custo && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-green-50 text-green-700 border-green-200">
                              {item.centro_custo.codigo}
                            </Badge>
                          )}
                          {item.tipo_calculo === 'span' && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                              SPAN
                            </Badge>
                          )}
                          {item.tipo_calculo === 'rateio' && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                              RATEIO {item.rateio_percentual}%
                            </Badge>
                          )}
                          {(!item.tipo_calculo || item.tipo_calculo === 'manual') && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-gray-50 text-gray-600 border-gray-200">
                              MANUAL
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.fator_pa || 1}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          handleFatorPAEdit(item, parseFloat(val) || 1);
                        }}
                        className="h-6 w-14 text-center text-[10px] mx-auto border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </TableCell>
                    {meses.map((m, mesIndex) => {
                      const uniqueKey = m.key;  // Unique key for React (2025-1)
                      const mesKey = m.mesKey;  // Key for DB field access (jan, fev)
                      const valor = item[`qtd_${mesKey}` as keyof QuadroPessoal] as number || 0;
                      const isEditing = editingCell?.id === item.id && editingCell?.mes === mesKey;
                      const isSpan = item.tipo_calculo === 'span';
                      const isRateio = item.tipo_calculo === 'rateio';
                      const isCalculado = isSpan || isRateio; // Não editável se calculado
                      
                      // Formatar valor (rateio pode ser decimal)
                      const valorFormatado = Number.isInteger(valor) ? valor : valor.toFixed(2);
                      
                      // Calcular próxima célula editável (pula SPANs e Rateios)
                      const getNextCell = (): {id: string, mes: string} | null => {
                        const itemIndex = quadro.findIndex(q => q.id === item.id);
                        
                        // Próximo mês na mesma linha
                        for (let i = mesIndex + 1; i < meses.length; i++) {
                          const nextItem = quadro[itemIndex];
                          if (nextItem && nextItem.tipo_calculo === 'manual') {
                            return { id: nextItem.id, mes: meses[i].mesKey };
                          }
                        }
                        
                        // Próximas linhas
                        for (let row = itemIndex + 1; row < quadro.length; row++) {
                          const nextItem = quadro[row];
                          if (nextItem && nextItem.tipo_calculo === 'manual') {
                            return { id: nextItem.id, mes: meses[0].mesKey };
                          }
                        }
                        
                        return null;
                      };
                      
                      return (
                        <TableCell key={`${item.id}-${uniqueKey}`} className="text-center p-1">
                          {isSpan ? (
                            // Célula somente leitura para SPAN
                            <div 
                              className="w-full h-6 flex items-center justify-center text-[10px] font-mono bg-blue-50 text-blue-700 rounded cursor-not-allowed"
                              title="Calculado automaticamente por SPAN"
                            >
                              {valorFormatado || '-'}
                            </div>
                          ) : isRateio ? (
                            // Célula somente leitura para RATEIO
                            <div 
                              className="w-full h-6 flex items-center justify-center text-[10px] font-mono bg-purple-50 text-purple-700 rounded cursor-not-allowed"
                              title={`Rateio: ${item.rateio_percentual || 0}% de ${item.rateio_qtd_total || 0}`}
                            >
                              {valorFormatado || '-'}
                            </div>
                          ) : isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editValue}
                              onChange={(e) => {
                                // Permitir apenas números
                                const newValue = e.target.value.replace(/[^0-9]/g, '');
                                setEditValue(newValue);
                              }}
                              onBlur={() => handleCellEdit(item, mesKey, parseInt(editValue) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  handleCellEdit(item, mesKey, parseInt(editValue) || 0, getNextCell());
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="h-6 w-12 text-center text-[10px] border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          ) : (
                            <button
                              className="w-full h-6 hover:bg-muted/50 rounded text-[10px] font-mono"
                              onClick={() => {
                                setEditingCell({ id: item.id, mes: mesKey });
                                setEditValue(String(valor));
                              }}
                            >
                              {valorFormatado || '-'}
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center bg-muted/20">
                      <span className="text-[10px] font-medium">{Number.isInteger(total) ? total : total.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteFuncao(item)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Linha de Totais HC Operando */}
              <TableRow className="bg-muted/30">
                <TableCell className="sticky left-0 bg-muted/30 z-10">
                  <span className="text-[10px] font-semibold">HC Operando</span>
                </TableCell>
                <TableCell></TableCell>
                {meses.map(m => (
                  <TableCell key={`total-${m.key}`} className="text-center">
                    <span className="text-[10px] font-semibold">{calcularTotalMes(m.mesKey).toFixed(2)}</span>
                  </TableCell>
                ))}
                <TableCell className="text-center bg-muted/50">
                  <span className="text-[10px] font-semibold">{quadro.reduce((sum, q) => sum + calcularTotalFuncao(q), 0).toFixed(2)}</span>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
              
              {/* Linha de PAs */}
              <TableRow className="bg-orange-50">
                <TableCell className="sticky left-0 bg-orange-50 z-10">
                  <span className="text-[10px] font-semibold text-orange-700">Total PAs</span>
                </TableCell>
                <TableCell></TableCell>
                {meses.map(m => (
                  <TableCell key={`pa-${m.key}`} className="text-center">
                    <span className="text-[10px] font-mono text-orange-700">{calcularPAsMes(m.mesKey).toFixed(1)}</span>
                  </TableCell>
                ))}
                <TableCell className="text-center bg-orange-100">
                  <span className="text-[10px] font-semibold text-orange-700">{meses.reduce((sum, m) => sum + calcularPAsMes(m.mesKey), 0).toFixed(1)}</span>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal: Adicionar Função */}
      <AddFuncaoModal
        open={showAddFuncao}
        onClose={() => setShowAddFuncao(false)}
        onSave={handleAddFuncao}
        funcoes={funcoes}
        funcoesJaAdicionadas={quadro}
        secaoAtual={secao}
        todasSecoes={todasSecoes}
        cenarioId={cenarioId}
        centrosCustoDisponiveis={centrosCustoDisponiveis}
        todosCentrosCusto={todosCentrosCusto}
        isCorporativo={isCorporativo}
        centroCustoPreSelecionado={centroCusto ? {
          id: centroCusto.id,
          codigo: centroCusto.codigo,
          nome: centroCusto.nome,
          tipo: centroCusto.tipo,
        } : undefined}
      />
    </Card>
  );
}
