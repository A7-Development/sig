"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Pencil,
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
import { EditCapacityModal } from "./EditCapacityModal";
import { Sparkline } from "./Sparkline";
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
  
  // Modal editar sazonalidade
  const [editingQuadroItem, setEditingQuadroItem] = useState<QuadroPessoal | null>(null);

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

  // Calcular estatísticas de um item do quadro (suporta multi-ano)
  const calcularStats = (item: QuadroPessoal) => {
    // Verificar se temos dados da nova estrutura (quantidades_mes)
    const quantidadesMes = (item as any).quantidades_mes as Array<{ano: number, mes: number, quantidade: number}> | undefined;
    
    let valores: number[];
    
    if (quantidadesMes && quantidadesMes.length > 0) {
      // Usar dados da nova tabela multi-ano
      valores = meses.map(m => {
        const registro = quantidadesMes.find(q => q.ano === m.ano && q.mes === m.mes);
        return registro?.quantidade ?? 0;
      });
    } else {
      // Fallback: usar colunas qtd_xxx (apenas primeiro ano)
      valores = meses.map(m => item[`qtd_${m.mesKey}` as keyof QuadroPessoal] as number || 0);
    }
    
    const total = valores.reduce((sum, v) => sum + v, 0);
    const media = valores.length > 0 ? total / valores.length : 0;
    const min = valores.length > 0 ? Math.min(...valores) : 0;
    const max = valores.length > 0 ? Math.max(...valores) : 0;
    return { valores, total, media, min, max };
  };

  // Handler: Salvar via modal (novo formato com ano/mês)
  const handleSaveFromModal = async (quantidades: { ano: number; mes: number; quantidade: number }[]) => {
    if (!token || !editingQuadroItem) return;
    
    // Enviar no novo formato quantidades_mes
    const updateData = {
      quantidades_mes: quantidades
    };
    
    console.log("[CapacityPanel] Recebido do modal:", quantidades);
    console.log("[CapacityPanel] Enviando para API:", updateData);
    console.log("[CapacityPanel] QuadroItem ID:", editingQuadroItem.id);
    
    try {
      // Salvar alterações (backend recalcula SPANs automaticamente)
      await cenariosApi.updateQuadro(token, cenarioId, editingQuadroItem.id, updateData as any);
      
      // Fechar modal primeiro para evitar estado inconsistente
      setEditingQuadroItem(null);
      
      // Pequeno delay para garantir que o backend processou tudo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Recarregar todos os dados (inclui SPANs recalculados)
      await carregarDados();
      
      // Notificar mudança no cenário (atualiza insights)
      onScenarioChange?.();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      throw err;
    }
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
      <div className="h-full flex flex-col bg-background p-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate" title={centroCusto?.nome || secao.secao?.nome}>
              {centroCusto ? centroCusto.nome : secao.secao?.nome}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-mono">{centroCusto?.codigo || secao.secao?.codigo}</span>
              <span className="mx-1.5">•</span>
              <span>{secao.secao?.nome}</span>
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={() => setShowAddFuncao(true)}
          disabled={funcoesNaoUtilizadas.length === 0 || !centroCusto}
          title={!centroCusto ? "Selecione um Centro de Custo na árvore para adicionar funções" : undefined}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Função
        </Button>
      </div>

      {/* Tabela de Quadro */}
      <div className="flex-1 overflow-auto">
        {!centroCusto ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Selecione um Centro de Custo</p>
            <p className="text-xs mt-1 max-w-sm text-center">
              Clique em um CC na árvore à esquerda para definir o HC Produtivo
            </p>
          </div>
        ) : quadro.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma função configurada</p>
            <p className="text-xs mt-1 max-w-sm text-center">
              Clique em "+ Função" para adicionar pessoas produtivas a este CC
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="px-4 py-2 border-b bg-orange-50/50 text-xs text-orange-700 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">HC Produtivo</span>
              <span className="text-orange-600/70">— pessoas trabalhando efetivamente na operação</span>
            </div>
            
            {/* Visão Sintética - Tabela Resumida */}
            <Table className="corporate-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px] text-[10px]">Função</TableHead>
                  <TableHead className="text-center w-16 text-[10px]">Tipo</TableHead>
                  <TableHead className="text-center w-16 text-[10px]">Fator PA</TableHead>
                  <TableHead className="text-center w-16 text-[10px]">HC Médio</TableHead>
                  <TableHead className="text-center w-20 text-[10px]">HC Total</TableHead>
                  <TableHead className="text-center w-14 text-[10px]">Min</TableHead>
                  <TableHead className="text-center w-14 text-[10px]">Max</TableHead>
                  <TableHead className="text-center w-24 text-[10px]">Tendência</TableHead>
                  <TableHead className="w-20 text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quadro.map(item => {
                  const stats = calcularStats(item);
                  const tipoLabel = item.tipo_calculo === 'span' ? 'SPAN' 
                    : item.tipo_calculo === 'rateio' ? `RATEIO` 
                    : 'MANUAL';
                  const tipoBg = item.tipo_calculo === 'span' ? 'bg-blue-50 text-blue-700' 
                    : item.tipo_calculo === 'rateio' ? 'bg-purple-50 text-purple-700' 
                    : 'bg-gray-50 text-gray-600';
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-[10px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate leading-tight">{item.funcao?.nome}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {item.funcao?.codigo}
                            </span>
                            {item.centro_custo && (
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-green-50 text-green-700 border-green-200">
                                {item.centro_custo.codigo}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[8px] h-4 px-1.5 ${tipoBg}`}>
                          {tipoLabel}
                        </Badge>
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
                          className="h-6 w-12 text-center text-[10px] mx-auto border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-mono">{stats.media.toFixed(1)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-mono font-medium">
                          {Number.isInteger(stats.total) ? stats.total.toLocaleString() : stats.total.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-mono text-muted-foreground">{stats.min}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-mono text-muted-foreground">{stats.max}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Sparkline values={stats.valores} width={48} height={16} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-xs"
                            variant="outline"
                            className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                            onClick={() => setEditingQuadroItem(item)}
                            title="Editar sazonalidade"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteFuncao(item)}
                            title="Remover função"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Linha de Totalizadores */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="text-[10px]">
                    <span className="font-semibold">TOTAIS</span>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono">
                      {(quadro.reduce((sum, q) => sum + calcularStats(q).media, 0)).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono font-semibold">
                      {quadro.reduce((sum, q) => sum + calcularTotalFuncao(q), 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                
                {/* Linha de Total PAs */}
                <TableRow className="bg-orange-50">
                  <TableCell className="text-[10px]">
                    <span className="font-semibold text-orange-700">Total PAs</span>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono text-orange-700">
                      {(meses.reduce((sum, m) => sum + calcularPAsMes(m.mesKey), 0) / meses.length).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono font-semibold text-orange-700">
                      {meses.reduce((sum, m) => sum + calcularPAsMes(m.mesKey), 0).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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

      {/* Modal: Editar Sazonalidade */}
      {editingQuadroItem && (
        <EditCapacityModal
          open={!!editingQuadroItem}
          onClose={() => setEditingQuadroItem(null)}
          onSave={handleSaveFromModal}
          quadroItem={editingQuadroItem}
          funcaoNome={editingQuadroItem.funcao?.nome || "Função"}
          ccCodigo={editingQuadroItem.centro_custo?.codigo || ""}
          ccNome={editingQuadroItem.centro_custo?.nome || ""}
          mesesPeriodo={meses}
        />
      )}
    </div>
  );
}
