"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ChevronRight,
  ChevronDown,
  Building2,
  FolderTree,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Building,
  Briefcase,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi,
  empresasApi,
  secoesApi,
  secoesEmpresa,
  centrosCustoApi,
  secaoCentrosCusto,
  type CenarioEmpresa,
  type CenarioSecao,
  type CenarioSecaoCC,
  type Empresa,
  type Secao,
  type CentroCusto,
  type QuadroPessoal,
} from "@/lib/api/orcamento";
import { cn } from "@/lib/utils";

// ============================================
// Tipos
// ============================================

type NodeType = 'empresa' | 'secao' | 'centro_custo';

interface SelectedNode {
  type: NodeType;
  empresa: CenarioEmpresa;
  secao?: CenarioSecao;
  centroCusto?: CentroCusto;
}

// Centro de Custo com contagem de funções
interface CCComContagem {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  qtdFuncoes: number;
}

interface MasterDetailTreeProps {
  cenarioId: string;
  onNodeSelect?: (node: SelectedNode | null) => void;
  onSecoesLoaded?: (secoes: CenarioSecao[]) => void;
  selectedSecaoId?: string | null;
  selectedCCId?: string | null;
}

// ============================================
// Helpers
// ============================================

const truncateText = (text: string | undefined | null, maxLength: number = 20): string => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
};

/**
 * Verifica se uma seção é CORPORATIVO com base no código ou nome.
 */
const isCorporativo = (secao?: Secao | null): boolean => {
  if (!secao) return false;
  const codigo = (secao.codigo || "").toUpperCase();
  const nome = (secao.nome || "").toUpperCase();
  return codigo.includes("CORPORATIVO") || nome.includes("CORPORATIVO");
};

// ============================================
// Componente Principal
// ============================================

export function MasterDetailTree({ 
  cenarioId, 
  onNodeSelect,
  onSecoesLoaded,
  selectedSecaoId,
  selectedCCId
}: MasterDetailTreeProps) {
  const { accessToken: token } = useAuthStore();
  
  // Estado principal
  const [empresas, setEmpresas] = useState<CenarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de expansão
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(new Set());
  const [expandedSecoes, setExpandedSecoes] = useState<Set<string>>(new Set());
  
  // CCs por seção (derivados do QuadroPessoal)
  const [ccsPorSecao, setCCsPorSecao] = useState<Record<string, CCComContagem[]>>({});
  const [loadingCCs, setLoadingCCs] = useState<Set<string>>(new Set());
  
  // Todos os CCs disponíveis
  const [todosCCs, setTodosCCs] = useState<CentroCusto[]>([]);
  
  // Modais
  const [showAddEmpresa, setShowAddEmpresa] = useState(false);
  const [showAddSecao, setShowAddSecao] = useState(false);
  const [showAddCC, setShowAddCC] = useState(false);
  
  // Dados para modais
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<Empresa[]>([]);
  const [secoesDisponiveis, setSecoesDisponiveis] = useState<Secao[]>([]);
  
  // Estado de seleção para modais
  const [empresaSelecionada, setEmpresaSelecionada] = useState<CenarioEmpresa | null>(null);
  const [secaoSelecionadaParaCC, setSecaoSelecionadaParaCC] = useState<CenarioSecao | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [selectedSecaoIdModal, setSelectedSecaoIdModal] = useState<string>("");
  const [selectedCCIdModal, setSelectedCCIdModal] = useState<string>("");
  
  // Ações em andamento
  const [saving, setSaving] = useState(false);

  // ============================================
  // Carregar dados
  // ============================================
  
  const carregarEstrutura = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Carregar empresas do cenário
      const empresasData = await cenariosApi.getEmpresas(token, cenarioId);
      
      // Para cada empresa, carregar seções da nova hierarquia
      const empresasComSecoes = await Promise.all(
        empresasData.map(async (emp) => {
          try {
            const secoesData = await secoesEmpresa.listar(token, cenarioId, emp.id, true);
            return {
              ...emp,
              secoes_diretas: secoesData,
            };
          } catch (err) {
            // Se não encontrar seções na nova hierarquia, manter as antigas
            const secoesAntigas: CenarioSecao[] = [];
            emp.clientes?.forEach(cliente => {
              cliente.secoes?.forEach(secao => {
                if (secao.ativo) {
                  secoesAntigas.push(secao);
                }
              });
            });
            return {
              ...emp,
              secoes_diretas: secoesAntigas,
            };
          }
        })
      );
      
      setEmpresas(empresasComSecoes);
      // Expandir todas as empresas por padrão
      setExpandedEmpresas(new Set(empresasComSecoes.map(e => e.id)));
      
      // Coletar todas as seções e notificar o pai
      if (onSecoesLoaded) {
        const todasSecoes: CenarioSecao[] = [];
        empresasComSecoes.forEach(empresa => {
          empresa.secoes_diretas?.forEach(secao => {
            if (secao.ativo) {
              todasSecoes.push(secao);
            }
          });
        });
        onSecoesLoaded(todasSecoes);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar estrutura");
    } finally {
      setLoading(false);
    }
  }, [token, cenarioId, onSecoesLoaded]);

  useEffect(() => {
    carregarEstrutura();
  }, [carregarEstrutura]);

  // Carregar empresas disponíveis
  useEffect(() => {
    if (token) {
      empresasApi.listar(token, { ativo: true })
        .then(setEmpresasDisponiveis)
        .catch(console.error);
    }
  }, [token]);

  // Carregar seções disponíveis
  useEffect(() => {
    if (token) {
      secoesApi.listar(token, { ativo: true })
        .then(setSecoesDisponiveis)
        .catch(console.error);
    }
  }, [token]);

  // Carregar todos os CCs disponíveis
  useEffect(() => {
    if (token) {
      centrosCustoApi.listar(token, { ativo: true })
        .then(setTodosCCs)
        .catch(console.error);
    }
  }, [token]);

  // ============================================
  // Carregar CCs de uma seção (associados via cenario_secao_cc)
  // ============================================
  
  const carregarCCsSecao = useCallback(async (secaoId: string, forceReload = false) => {
    if (!token || loadingCCs.has(secaoId)) return;
    if (!forceReload && ccsPorSecao[secaoId]) return;
    
    setLoadingCCs(prev => new Set(prev).add(secaoId));
    try {
      // Buscar CCs associados a esta seção
      const ccsAssociados = await secaoCentrosCusto.listar(token, cenarioId, secaoId);
      
      // Buscar quadro de pessoal para contar funções por CC
      const quadro = await cenariosApi.getQuadro(token, cenarioId, { cenario_secao_id: secaoId });
      
      // Contar funções por CC
      const ccCount = new Map<string, number>();
      quadro.forEach((item: QuadroPessoal) => {
        if (item.centro_custo_id && item.ativo) {
          ccCount.set(item.centro_custo_id, (ccCount.get(item.centro_custo_id) || 0) + 1);
        }
      });
      
      // Converter para formato CCComContagem
      const ccs: CCComContagem[] = ccsAssociados
        .filter(assoc => assoc.centro_custo)
        .map(assoc => ({
          id: assoc.centro_custo!.id,
          codigo: assoc.centro_custo!.codigo,
          nome: assoc.centro_custo!.nome,
          tipo: assoc.centro_custo!.tipo || 'OPERACIONAL',
          qtdFuncoes: ccCount.get(assoc.centro_custo!.id) || 0,
        }));
      
      setCCsPorSecao(prev => ({ ...prev, [secaoId]: ccs }));
    } catch (err) {
      console.error('Erro ao carregar CCs da seção:', err);
      setCCsPorSecao(prev => ({ ...prev, [secaoId]: [] }));
    } finally {
      setLoadingCCs(prev => {
        const next = new Set(prev);
        next.delete(secaoId);
        return next;
      });
    }
  }, [token, cenarioId, loadingCCs, ccsPorSecao]);

  // ============================================
  // Handlers de expansão
  // ============================================

  const toggleEmpresa = (empresaId: string) => {
    setExpandedEmpresas(prev => {
      const next = new Set(prev);
      if (next.has(empresaId)) {
        next.delete(empresaId);
      } else {
        next.add(empresaId);
      }
      return next;
    });
  };
  
  const toggleSecao = (secaoId: string) => {
    setExpandedSecoes(prev => {
      const next = new Set(prev);
      if (next.has(secaoId)) {
        next.delete(secaoId);
      } else {
        next.add(secaoId);
        // Carregar CCs ao expandir
        carregarCCsSecao(secaoId);
      }
      return next;
    });
  };

  // ============================================
  // Adicionar Empresa
  // ============================================

  const handleAddEmpresa = async () => {
    if (!token || !selectedEmpresaId) return;
    setSaving(true);
    try {
      await cenariosApi.addEmpresa(token, cenarioId, { empresa_id: selectedEmpresaId });
      await carregarEstrutura();
      setShowAddEmpresa(false);
      setSelectedEmpresaId("");
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmpresa = async (empresa: CenarioEmpresa) => {
    if (!token) return;
    if (!confirm(`Remover empresa "${empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social}" e todas as suas seções?`)) {
      return;
    }
    try {
      await cenariosApi.deleteEmpresa(token, cenarioId, empresa.id);
      await carregarEstrutura();
    } catch (err: any) {
      alert(err.message || "Erro ao remover empresa");
    }
  };

  // ============================================
  // Adicionar Seção (Nova Hierarquia)
  // ============================================

  const openAddSecao = (empresa: CenarioEmpresa) => {
    setEmpresaSelecionada(empresa);
    setSelectedSecaoIdModal("");
    setShowAddSecao(true);
  };

  const handleAddSecao = async () => {
    if (!token || !empresaSelecionada || !selectedSecaoIdModal) return;
    
    setSaving(true);
    try {
      await secoesEmpresa.adicionar(token, cenarioId, empresaSelecionada.id, selectedSecaoIdModal);
      await carregarEstrutura();
      setShowAddSecao(false);
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar seção");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSecao = async (empresa: CenarioEmpresa, secao: CenarioSecao) => {
    if (!token) return;
    if (!confirm(`Remover seção "${secao.secao?.nome}"?`)) {
      return;
    }
    try {
      await secoesEmpresa.remover(token, cenarioId, empresa.id, secao.id);
      await carregarEstrutura();
    } catch (err: any) {
      alert(err.message || "Erro ao remover seção");
    }
  };

  const handleAddCC = async () => {
    if (!token || !secaoSelecionadaParaCC || !selectedCCIdModal) return;
    
    setSaving(true);
    try {
      await secaoCentrosCusto.adicionar(token, cenarioId, secaoSelecionadaParaCC.id, selectedCCIdModal);
      // Recarregar CCs da seção
      await carregarCCsSecao(secaoSelecionadaParaCC.id, true);
      setShowAddCC(false);
      setSelectedCCIdModal("");
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar Centro de Custo");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Cálculos de totais
  // ============================================

  const calcularTotaisEmpresa = (empresa: CenarioEmpresa) => {
    const totalSecoes = empresa.secoes_diretas?.filter(s => s.ativo).length || 0;
    return { totalSecoes };
  };

  // ============================================
  // Filtrar empresas não associadas
  // ============================================

  const empresasNaoAssociadas = empresasDisponiveis.filter(
    emp => !empresas.some(ce => ce.empresa_id === emp.id)
  );

  // Filtrar seções não associadas à empresa selecionada
  const secoesNaoAssociadas = secoesDisponiveis.filter(sec => {
    if (!empresaSelecionada) return true;
    const secoesAssociadas = empresaSelecionada.secoes_diretas || [];
    return !secoesAssociadas.some(cs => cs.secao_id === sec.id);
  });

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-[90%] ml-4" />
        <Skeleton className="h-8 w-[80%] ml-8" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header com botão adicionar empresa */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Estrutura do Cenário</h3>
          <Button 
            size="xs" 
            variant="outline"
            onClick={() => setShowAddEmpresa(true)}
            disabled={empresasNaoAssociadas.length === 0}
          >
            <Plus className="h-3 w-3 mr-1" />
            Empresa
          </Button>
        </div>
      </div>

      {/* Árvore */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {empresas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma empresa adicionada</p>
              <p className="text-xs mt-1">Clique em "+ Empresa" para começar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {empresas.map(empresa => {
                const isExpanded = expandedEmpresas.has(empresa.id);
                const totais = calcularTotaisEmpresa(empresa);
                const secoes = empresa.secoes_diretas?.filter(s => s.ativo) || [];

                return (
                  <div key={empresa.id} className="select-none">
                    {/* Empresa */}
                    <div 
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group",
                        "hover:bg-orange-50 hover:text-orange-700",
                        "transition-colors"
                      )}
                    >
                      <button 
                        onClick={() => toggleEmpresa(empresa.id)}
                        className="p-0.5 hover:bg-orange-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                      <Building2 className="h-3 w-3 text-orange-600" />
                      <span 
                        className="flex-1 text-xs font-medium"
                        title={empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social || "Empresa"}
                      >
                        {truncateText(empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social || "Empresa")}
                      </span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        {totais.totalSecoes} seções
                      </Badge>
                      <div className="flex items-center gap-0.5">
                        <Button 
                          size="icon-xs" 
                          variant="ghost"
                          className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddSecao(empresa);
                          }}
                          title="Adicionar Seção"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon-xs" 
                          variant="ghost"
                          className="h-5 w-5 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEmpresa(empresa);
                          }}
                          title="Remover Empresa"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Seções da Empresa (Nova Hierarquia Simplificada) */}
                    {isExpanded && (
                      <div className="ml-4 border-l border-muted pl-1 mt-0.5 space-y-0.5">
                        {secoes.length === 0 ? (
                          <div 
                            className="py-2 px-3 text-xs text-muted-foreground italic cursor-pointer hover:text-green-600 hover:bg-green-50/50 rounded transition-colors"
                            onClick={() => openAddSecao(empresa)}
                          >
                            + Clique para adicionar seções (ex: CLARO, VIVO, CORPORATIVO)
                          </div>
                        ) : (
                          secoes.map(secao => {
                            const isCorp = isCorporativo(secao.secao);
                            const isSecaoExpanded = expandedSecoes.has(secao.id);
                            const ccsSecao = ccsPorSecao[secao.id] || [];
                            const isLoadingCCs = loadingCCs.has(secao.id);
                            
                            return (
                              <div key={secao.id}>
                                {/* Seção */}
                                <div 
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group",
                                    isCorp 
                                      ? "hover:bg-purple-50 hover:text-purple-700" 
                                      : "hover:bg-green-50 hover:text-green-700",
                                    selectedSecaoId === secao.id && !selectedCCId && (isCorp ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"),
                                    "transition-colors"
                                  )}
                                  onClick={() => {
                                    onNodeSelect?.({ type: 'secao', empresa, secao });
                                    toggleSecao(secao.id);
                                  }}
                                >
                                  <button 
                                    className="p-0.5 hover:bg-muted rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSecao(secao.id);
                                    }}
                                  >
                                    {isSecaoExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </button>
                                  {isCorp ? (
                                    <Building className="h-3 w-3 text-purple-600" />
                                  ) : (
                                    <FolderTree className="h-3 w-3 text-green-600" />
                                  )}
                                  <span 
                                    className="flex-1 text-xs font-medium"
                                    title={secao.secao?.nome || "Seção"}
                                  >
                                    {truncateText(secao.secao?.nome || "Seção", 18)}
                                  </span>
                                  {isCorp && (
                                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                      CORP
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                    {secao.secao?.codigo}
                                  </Badge>
                                  <Button 
                                    size="icon-xs" 
                                    variant="ghost"
                                    className="h-5 w-5 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSecao(empresa, secao);
                                    }}
                                    title="Remover Seção"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                                
                                {/* Centros de Custo da Seção */}
                                {isSecaoExpanded && (
                                  <div className="ml-6 border-l border-muted pl-1 mt-0.5 space-y-0.5">
                                    {isLoadingCCs ? (
                                      <div className="py-2 px-3 text-xs text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Carregando projetos...
                                      </div>
                                    ) : (
                                      <>
                                        {ccsSecao.length === 0 ? (
                                          <div className="py-1 px-3 text-xs text-muted-foreground italic">
                                            Nenhum Centro de Custo adicionado
                                          </div>
                                        ) : (
                                          ccsSecao.map(cc => (
                                            <div 
                                              key={cc.id}
                                              className={cn(
                                                "flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group",
                                                "hover:bg-blue-50 hover:text-blue-700",
                                                selectedCCId === cc.id && "bg-blue-100 text-blue-800",
                                                "transition-colors"
                                              )}
                                              onClick={() => onNodeSelect?.({
                                                type: 'centro_custo',
                                                empresa,
                                                secao,
                                                centroCusto: {
                                                  id: cc.id,
                                                  codigo: cc.codigo,
                                                  nome: cc.nome,
                                                  tipo: cc.tipo as 'OPERACIONAL' | 'POOL' | 'ADMINISTRATIVO' | 'OVERHEAD',
                                                  secao_id: null,
                                                  codigo_totvs: null,
                                                  cliente: null,
                                                  contrato: null,
                                                  uf: null,
                                                  cidade: null,
                                                  ativo: true,
                                                  created_at: '',
                                                  updated_at: ''
                                                }
                                              })}
                                            >
                                              <div className="w-3" />
                                              <Briefcase className="h-3 w-3 text-blue-600" />
                                              <span 
                                                className="flex-1 text-xs"
                                                title={cc.nome}
                                              >
                                                {truncateText(cc.nome, 16)}
                                              </span>
                                              <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                                {cc.qtdFuncoes} {cc.qtdFuncoes === 1 ? 'função' : 'funções'}
                                              </Badge>
                                              <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                                {cc.codigo}
                                              </Badge>
                                            </div>
                                          ))
                                        )}
                                        {/* Botão Adicionar Centro de Custo */}
                                        <div 
                                          className="flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer text-muted-foreground hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSecaoSelecionadaParaCC(secao);
                                            setShowAddCC(true);
                                          }}
                                        >
                                          <div className="w-3" />
                                          <Plus className="h-3 w-3" />
                                          <span className="text-xs">Adicionar Centro de Custo</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modal: Adicionar Empresa */}
      <Dialog open={showAddEmpresa} onOpenChange={setShowAddEmpresa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Empresa</DialogTitle>
            <DialogDescription>
              Selecione uma empresa para adicionar ao cenário.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                {empresasNaoAssociadas.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nome_fantasia || emp.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmpresa(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddEmpresa} 
              disabled={!selectedEmpresaId || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Seção */}
      <Dialog open={showAddSecao} onOpenChange={setShowAddSecao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Seção</DialogTitle>
            <DialogDescription>
              Selecione uma seção para adicionar à empresa {empresaSelecionada?.empresa?.nome_fantasia || empresaSelecionada?.empresa?.razao_social}.
              <br />
              <span className="text-purple-600 font-medium">
                Seções CORPORATIVO aparecem destacadas.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedSecaoIdModal} onValueChange={setSelectedSecaoIdModal}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma seção..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {secoesNaoAssociadas.map(sec => {
                  const isCorp = isCorporativo(sec);
                  return (
                    <SelectItem 
                      key={sec.id} 
                      value={sec.id}
                      className={cn(isCorp && "text-purple-700 font-medium")}
                    >
                      {sec.codigo} - {sec.nome} {isCorp && "(CORPORATIVO)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSecao(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSecao} 
              disabled={!selectedSecaoIdModal || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Centro de Custo */}
      <Dialog open={showAddCC} onOpenChange={setShowAddCC}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Centro de Custo</DialogTitle>
            <DialogDescription>
              Selecione um Centro de Custo para adicionar à seção {secaoSelecionadaParaCC?.secao?.nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedCCIdModal} onValueChange={setSelectedCCIdModal}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um Centro de Custo..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {todosCCs
                  .filter(cc => {
                    // Filtrar CCs já associados a esta seção
                    const ccsAssociados = secaoSelecionadaParaCC ? ccsPorSecao[secaoSelecionadaParaCC.id] || [] : [];
                    return !ccsAssociados.some(assoc => assoc.id === cc.id);
                  })
                  .map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.codigo} - {cc.nome}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCC(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddCC} 
              disabled={!selectedCCIdModal || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { SelectedNode, NodeType };
