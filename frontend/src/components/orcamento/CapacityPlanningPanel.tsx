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
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi,
  funcoesApi,
  type CenarioEmpresa,
  type CenarioCliente,
  type CenarioSecao,
  type QuadroPessoal,
  type Funcao,
} from "@/lib/api/orcamento";
import { AddFuncaoModal, type AddFuncaoData } from "./AddFuncaoModal";
import { v4 as uuidv4 } from "uuid";

// ============================================
// Tipos
// ============================================

interface PremissaSimples {
  absenteismo: number;
  abs_pct_justificado: number;
  turnover: number;
  ferias_indice: number;
  dias_treinamento: number;
}

interface CapacityPlanningPanelProps {
  cenarioId: string;
  empresa: CenarioEmpresa;
  cliente: CenarioCliente;
  secao: CenarioSecao;
  todasSecoes: CenarioSecao[];  // Para rateio entre seções
  premissas?: PremissaSimples;  // Premissas do cenário para cálculo de HC na Folha
  anoInicio: number;
  mesInicio: number;
  anoFim: number;
  mesFim: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_KEYS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ============================================
// Componente Principal
// ============================================

export function CapacityPlanningPanel({
  cenarioId,
  empresa,
  cliente,
  secao,
  todasSecoes,
  premissas,
  anoInicio,
  mesInicio,
  anoFim,
  mesFim,
}: CapacityPlanningPanelProps) {
  const { accessToken: token } = useAuthStore();
  
  const [quadro, setQuadro] = useState<QuadroPessoal[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      setQuadro(quadroSecao);
      
      // Carregar funções disponíveis
      const funcoesData = await funcoesApi.listar(token, { ativo: true });
      setFuncoes(funcoesData);
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
    const meses: { ano: number; mes: number; label: string; key: string }[] = [];
    let ano = anoInicio;
    let mes = mesInicio;
    
    while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
      meses.push({
        ano,
        mes,
        label: `${MESES[mes - 1]}/${String(ano).slice(-2)}`,
        key: MESES_KEYS[mes - 1]
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
      if (data.tipo_calculo === "rateio" && data.rateio_secoes && data.rateio_secoes.length > 0) {
        // RATEIO: Criar uma entrada para cada seção participante
        const grupoId = uuidv4();
        const qtdTotal = data.rateio_qtd_total || 1;
        
        for (const rateioSecao of data.rateio_secoes) {
          // Calcular quantidade rateada: total * percentual / 100
          const qtdRateada = qtdTotal * (rateioSecao.percentual / 100);
          
          await cenariosApi.addQuadro(token, cenarioId, {
            cenario_id: cenarioId,
            funcao_id: data.funcao_id,
            cenario_secao_id: rateioSecao.secaoId,
            fator_pa: data.fator_pa,
            regime: "CLT",
            tipo_calculo: "rateio",
            rateio_grupo_id: grupoId,
            rateio_percentual: rateioSecao.percentual,
            rateio_qtd_total: qtdTotal,
            // Aplicar quantidade rateada em todos os meses
            qtd_jan: qtdRateada, qtd_fev: qtdRateada, qtd_mar: qtdRateada, qtd_abr: qtdRateada,
            qtd_mai: qtdRateada, qtd_jun: qtdRateada, qtd_jul: qtdRateada, qtd_ago: qtdRateada,
            qtd_set: qtdRateada, qtd_out: qtdRateada, qtd_nov: qtdRateada, qtd_dez: qtdRateada,
          });
        }
      } else {
        // MANUAL ou SPAN: Criar uma única entrada
        await cenariosApi.addQuadro(token, cenarioId, {
          cenario_id: cenarioId,
          funcao_id: data.funcao_id,
          cenario_secao_id: secao.id,
          fator_pa: data.fator_pa,
          regime: "CLT",
          tipo_calculo: data.tipo_calculo,
          span_ratio: data.span_ratio || null,
          span_funcoes_base_ids: data.span_funcoes_base_ids || null,
          qtd_jan: 0, qtd_fev: 0, qtd_mar: 0, qtd_abr: 0,
          qtd_mai: 0, qtd_jun: 0, qtd_jul: 0, qtd_ago: 0,
          qtd_set: 0, qtd_out: 0, qtd_nov: 0, qtd_dez: 0,
        });
      }
      
      await carregarDados();
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
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar");
      setPendingNextCell(null);
    }
  };

  const handleFatorPAEdit = async (quadroItem: QuadroPessoal, novoFator: number) => {
    if (!token) return;
    
    try {
      await cenariosApi.updateQuadro(token, cenarioId, quadroItem.id, { fator_pa: novoFator });
      setQuadro(prev => prev.map(q => 
        q.id === quadroItem.id ? { ...q, fator_pa: novoFator } : q
      ));
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

  // Calcular HC na Folha considerando premissas de ineficiência
  // Fórmula: HC_Folha = HC_Operando / (1 - ABS%) / (1 - Férias%) / (1 - TO% × (dias_trein/30))
  const calcularHCFolhaMes = (mesKey: string) => {
    const hcOperando = calcularTotalMes(mesKey);
    if (!premissas || hcOperando === 0) return hcOperando;
    
    const abs = (premissas.absenteismo || 0) / 100;
    const ferias = (premissas.ferias_indice || 0) / 100;
    const to = (premissas.turnover || 0) / 100;
    const fatorTreinamento = (premissas.dias_treinamento || 15) / 30;
    
    // Evitar divisão por zero
    const fatorAbs = Math.max(0.01, 1 - abs);
    const fatorFerias = Math.max(0.01, 1 - ferias);
    const fatorTO = Math.max(0.01, 1 - (to * fatorTreinamento));
    
    return hcOperando / fatorAbs / fatorFerias / fatorTO;
  };

  // ============================================
  // Funções não utilizadas nesta seção
  // ============================================

  const funcoesNaoUtilizadas = funcoes.filter(
    f => !quadro.some(q => q.funcao_id === f.id)
  );

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
              <FolderTree className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">{secao.secao?.nome}</CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {secao.secao?.codigo}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {cliente.nome_cliente}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social}
              </span>
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowAddFuncao(true)}
            disabled={funcoesNaoUtilizadas.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Função
          </Button>
        </div>
      </CardHeader>

      {/* Tabela de Quadro */}
      <CardContent className="flex-1 overflow-auto p-0">
        {quadro.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calculator className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma função configurada nesta seção</p>
            <p className="text-xs mt-1">Clique em "+ Função" para adicionar</p>
          </div>
        ) : (
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
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {item.funcao?.codigo}
                          </span>
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
                      const key = m.key;
                      const valor = item[`qtd_${key}` as keyof QuadroPessoal] as number || 0;
                      const isEditing = editingCell?.id === item.id && editingCell?.mes === key;
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
                            return { id: nextItem.id, mes: meses[i].key };
                          }
                        }
                        
                        // Próximas linhas
                        for (let row = itemIndex + 1; row < quadro.length; row++) {
                          const nextItem = quadro[row];
                          if (nextItem && nextItem.tipo_calculo === 'manual') {
                            return { id: nextItem.id, mes: meses[0].key };
                          }
                        }
                        
                        return null;
                      };
                      
                      return (
                        <TableCell key={`${item.id}-${key}`} className="text-center p-1">
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
                              onBlur={() => handleCellEdit(item, key, parseInt(editValue) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  handleCellEdit(item, key, parseInt(editValue) || 0, getNextCell());
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
                                setEditingCell({ id: item.id, mes: key });
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
                    <span className="text-[10px] font-semibold">{calcularTotalMes(m.key).toFixed(2)}</span>
                  </TableCell>
                ))}
                <TableCell className="text-center bg-muted/50">
                  <span className="text-[10px] font-semibold">{quadro.reduce((sum, q) => sum + calcularTotalFuncao(q), 0).toFixed(2)}</span>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
              
              {/* Linha de HC na Folha (calculado com premissas) */}
              {premissas && (
                <TableRow className="bg-blue-50">
                  <TableCell className="sticky left-0 bg-blue-50 z-10">
                    <span className="text-[10px] font-semibold text-blue-700">HC na Folha</span>
                  </TableCell>
                  <TableCell></TableCell>
                  {meses.map(m => (
                    <TableCell key={`folha-${m.key}`} className="text-center">
                      <span className="text-[10px] font-mono text-blue-700">{calcularHCFolhaMes(m.key).toFixed(0)}</span>
                    </TableCell>
                  ))}
                  <TableCell className="text-center bg-blue-100">
                    <span className="text-[10px] font-semibold text-blue-700">
                      {meses.reduce((sum, m) => sum + calcularHCFolhaMes(m.key), 0).toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
              
              {/* Linha de PAs */}
              <TableRow className="bg-orange-50">
                <TableCell className="sticky left-0 bg-orange-50 z-10">
                  <span className="text-[10px] font-semibold text-orange-700">Total PAs</span>
                </TableCell>
                <TableCell></TableCell>
                {meses.map(m => (
                  <TableCell key={`pa-${m.key}`} className="text-center">
                    <span className="text-[10px] font-mono text-orange-700">{calcularPAsMes(m.key).toFixed(1)}</span>
                  </TableCell>
                ))}
                <TableCell className="text-center bg-orange-100">
                  <span className="text-[10px] font-semibold text-orange-700">{meses.reduce((sum, m) => sum + calcularPAsMes(m.key), 0).toFixed(1)}</span>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
      />
    </Card>
  );
}


