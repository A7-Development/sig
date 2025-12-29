"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronRight, ChevronDown, Building2, FolderTree, Briefcase, User, Loader2, Building, Split } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { secoesEmpresa, secaoCentrosCusto, cenariosApi } from "@/lib/api/orcamento";
import type { CenarioEmpresa, CenarioSecao, QuadroPessoal, Funcao, Secao, CentroCusto } from "@/lib/api/orcamento";

// ============================================
// Tipos
// ============================================

type NodeType = 'empresa' | 'secao' | 'centro_custo' | 'funcao';

export interface SelectedNodePremissas {
  type: NodeType;
  empresa: CenarioEmpresa;
  secao?: CenarioSecao;
  centroCusto?: CentroCusto;
  funcao?: Funcao;
  quadroItem?: QuadroPessoal;
}

interface PremissasTreeProps {
  cenarioId: string;
  onNodeSelect?: (node: SelectedNodePremissas | null) => void;
}

interface FuncaoCC {
  funcao: Funcao;
  quadroItem: QuadroPessoal;
}

interface CCAgrupado {
  centroCusto: CentroCusto;
  funcoes: FuncaoCC[];
}

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
// Helpers
// ============================================

const truncateText = (text: string | undefined | null, maxLength: number = 15): string => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
};

// ============================================
// Componente Principal
// ============================================

export function PremissasTree({ 
  cenarioId, 
  onNodeSelect,
}: PremissasTreeProps) {
  const { accessToken: token } = useAuthStore();
  
  // Estado principal
  const [empresas, setEmpresas] = useState<(CenarioEmpresa & { secoes_diretas?: CenarioSecao[] })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado de expansão
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(new Set());
  const [expandedSecoes, setExpandedSecoes] = useState<Set<string>>(new Set());
  const [expandedCCs, setExpandedCCs] = useState<Set<string>>(new Set());
  
  // Estado de seleção
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Dados por seção (agrupados por CC)
  const [dadosPorSecao, setDadosPorSecao] = useState<Record<string, CCAgrupado[]>>({});
  const [loadingSecoes, setLoadingSecoes] = useState<Set<string>>(new Set());
  
  // Todas as funções disponíveis
  const [todasFuncoes, setTodasFuncoes] = useState<Funcao[]>([]);

  // ============================================
  // Carregar estrutura inicial
  // ============================================

  const carregarEstrutura = useCallback(async () => {
    if (!cenarioId || !token) return;
    
    setLoading(true);
    try {
      // Carregar empresas do cenário e todas as funções
      const [empresasRes, funcoesRes] = await Promise.all([
        api.get<CenarioEmpresa[]>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas`, token),
        api.get<Funcao[]>(`/api/v1/orcamento/funcoes?limit=1000`, token),
      ]);
      
      // Para cada empresa, carregar seções da nova hierarquia
      const empresasComSecoes = await Promise.all(
        (empresasRes || []).map(async (emp) => {
          try {
            const secoesData = await secoesEmpresa.listar(token, cenarioId, emp.id, true);
            return {
              ...emp,
              secoes_diretas: secoesData,
            };
          } catch (err) {
            // Se não encontrar seções na nova hierarquia, tentar a antiga
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
      setTodasFuncoes(funcoesRes || []);
      
      // Expandir a primeira empresa automaticamente
      if (empresasComSecoes.length > 0) {
        setExpandedEmpresas(new Set([empresasComSecoes[0].id]));
      }
    } catch (error) {
      console.error("Erro ao carregar estrutura:", error);
    } finally {
      setLoading(false);
    }
  }, [cenarioId, token]);

  useEffect(() => {
    carregarEstrutura();
  }, [carregarEstrutura]);

  // ============================================
  // Carregar CCs e funções de uma seção
  // ============================================

  const carregarDadosSecao = useCallback(async (secaoId: string) => {
    if (!cenarioId || !token || dadosPorSecao[secaoId]) return;
    
    setLoadingSecoes(prev => new Set(prev).add(secaoId));
    try {
      // 1. Buscar CCs cadastrados na estrutura (cenario_secao_cc)
      const ccsAssociados = await secaoCentrosCusto.listar(token, cenarioId, secaoId);
      
      // 2. Buscar quadro de pessoal da seção
      const quadro = await cenariosApi.getQuadro(token, cenarioId, { cenario_secao_id: secaoId });
      const quadroAtivo = (quadro || []).filter(q => q.ativo !== false);
      
      // ========================================
      // FILTRAR FUNÇÕES RATEADAS: manter apenas a alocação primária
      // ========================================
      const rateioGruposProcessados = new Set<string>();
      const quadroFiltrado: QuadroPessoal[] = [];
      
      // Ordenar para que o maior percentual venha primeiro
      quadroAtivo.sort((a, b) => (b.rateio_percentual || 0) - (a.rateio_percentual || 0));
      
      quadroAtivo.forEach(q => {
        if (q.tipo_calculo !== 'rateio' || !q.rateio_grupo_id) {
          quadroFiltrado.push(q);
          return;
        }
        
        if (rateioGruposProcessados.has(q.rateio_grupo_id)) {
          return;
        }
        
        rateioGruposProcessados.add(q.rateio_grupo_id);
        quadroFiltrado.push(q);
      });
      
      // 3. Criar mapa de CCs a partir da estrutura cadastrada
      const ccMap = new Map<string, CCAgrupado>();
      
      // Primeiro, adicionar todos os CCs da estrutura (mesmo sem funções)
      ccsAssociados.forEach(assoc => {
        if (!assoc.centro_custo) return;
        
        const cc: CentroCusto = {
          id: assoc.centro_custo.id,
          codigo: assoc.centro_custo.codigo,
          codigo_totvs: null,
          nome: assoc.centro_custo.nome,
          tipo: 'OPERACIONAL',
          secao_id: null,
          cliente: null,
          contrato: null,
          uf: null,
          cidade: null,
          area_m2: null,
          ativo: true,
          created_at: '',
          updated_at: ''
        };
        
        ccMap.set(cc.id, {
          centroCusto: cc,
          funcoes: []
        });
      });
      
      // 4. Associar funções aos CCs
      quadroFiltrado.forEach(q => {
        const ccId = q.centro_custo_id;
        if (!ccId) return;
        
        const funcao = todasFuncoes.find(f => f.id === q.funcao_id);
        if (!funcao) return;
        
        // Se o CC já existe no mapa (da estrutura)
        if (ccMap.has(ccId)) {
          ccMap.get(ccId)!.funcoes.push({ funcao, quadroItem: q });
        } else {
          // CC não está na estrutura mas tem função no quadro (caso legado)
          const cc = q.centro_custo ? {
            id: q.centro_custo.id,
            codigo: q.centro_custo.codigo,
            codigo_totvs: null,
            nome: q.centro_custo.nome,
            tipo: 'OPERACIONAL' as const,
            secao_id: null,
            cliente: null,
            contrato: null,
            uf: null,
            cidade: null,
            area_m2: null,
            ativo: true,
            created_at: '',
            updated_at: ''
          } : null;
          
          if (cc) {
            ccMap.set(ccId, {
              centroCusto: cc,
              funcoes: [{ funcao, quadroItem: q }]
            });
          }
        }
      });
      
      // Ordenar CCs por nome
      const ccsAgrupados = Array.from(ccMap.values()).sort((a, b) => 
        (a.centroCusto.nome || '').localeCompare(b.centroCusto.nome || '')
      );
      
      setDadosPorSecao(prev => ({ ...prev, [secaoId]: ccsAgrupados }));
    } catch (error) {
      console.error("Erro ao carregar dados da seção:", error);
      setDadosPorSecao(prev => ({ ...prev, [secaoId]: [] }));
    } finally {
      setLoadingSecoes(prev => {
        const newSet = new Set(prev);
        newSet.delete(secaoId);
        return newSet;
      });
    }
  }, [cenarioId, token, todasFuncoes, dadosPorSecao]);

  // ============================================
  // Handlers de expansão
  // ============================================

  const toggleEmpresa = (empresaId: string) => {
    setExpandedEmpresas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empresaId)) {
        newSet.delete(empresaId);
      } else {
        newSet.add(empresaId);
      }
      return newSet;
    });
  };

  const toggleSecao = (secaoId: string) => {
    // Carregar dados se ainda não carregou
    if (!dadosPorSecao[secaoId]) {
      carregarDadosSecao(secaoId);
    }
    
    setExpandedSecoes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(secaoId)) {
        newSet.delete(secaoId);
      } else {
        newSet.add(secaoId);
      }
      return newSet;
    });
  };

  const toggleCC = (ccKey: string) => {
    setExpandedCCs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ccKey)) {
        newSet.delete(ccKey);
      } else {
        newSet.add(ccKey);
      }
      return newSet;
    });
  };

  // ============================================
  // Handler de seleção
  // ============================================

  const handleSelectNode = (node: SelectedNodePremissas) => {
    let nodeId = '';
    switch (node.type) {
      case 'funcao':
        nodeId = `funcao-${node.quadroItem?.id}`;
        break;
      case 'centro_custo':
        nodeId = `cc-${node.secao?.id}-${node.centroCusto?.id}`;
        break;
      case 'secao':
        nodeId = `secao-${node.secao?.id}`;
        break;
      default:
        nodeId = `empresa-${node.empresa.id}`;
    }
    
    setSelectedNodeId(nodeId);
    onNodeSelect?.(node);
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
        <Building2 className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-xs">Nenhuma empresa vinculada</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {empresas.map((empresa) => (
          <div key={empresa.id}>
            {/* Empresa */}
            <div
              className={cn(
                "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
                selectedNodeId === `empresa-${empresa.id}` 
                  ? "bg-orange-100 text-orange-700"
                  : "hover:bg-muted/50"
              )}
            >
              <button
                onClick={() => toggleEmpresa(empresa.id)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {expandedEmpresas.has(empresa.id) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              <Building2 className="h-3 w-3 text-orange-500 shrink-0" />
              <span 
                className="text-xs truncate flex-1"
                title={empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social}
                onClick={() => handleSelectNode({ type: 'empresa', empresa })}
              >
                {truncateText(empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social)}
              </span>
            </div>

            {/* Seções da Empresa */}
            {expandedEmpresas.has(empresa.id) && empresa.secoes_diretas && (
              <div className="ml-4 space-y-0.5">
                {empresa.secoes_diretas.length === 0 ? (
                  <div className="py-1 px-2 text-[10px] text-muted-foreground italic">
                    Nenhuma seção vinculada
                  </div>
                ) : (
                  empresa.secoes_diretas.map((secao) => {
                    const isCorp = isCorporativo(secao.secao);
                    const ccsSecao = dadosPorSecao[secao.id] || [];
                    const totalFuncoes = ccsSecao.reduce((acc, cc) => acc + cc.funcoes.length, 0);
                    
                    return (
                      <div key={secao.id}>
                        {/* Seção */}
                        <div
                          className={cn(
                            "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
                            selectedNodeId === `secao-${secao.id}`
                              ? "bg-orange-100 text-orange-700"
                              : isCorp
                                ? "hover:bg-purple-50"
                                : "hover:bg-muted/50"
                          )}
                        >
                          <button
                            onClick={() => toggleSecao(secao.id)}
                            className="p-0.5 hover:bg-muted rounded"
                          >
                            {loadingSecoes.has(secao.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : expandedSecoes.has(secao.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                          {isCorp ? (
                            <Building className="h-3 w-3 text-purple-500 shrink-0" />
                          ) : (
                            <FolderTree className="h-3 w-3 text-green-500 shrink-0" />
                          )}
                          <span 
                            className="text-xs truncate flex-1"
                            title={secao.secao?.nome}
                            onClick={() => handleSelectNode({ type: 'secao', empresa, secao })}
                          >
                            {truncateText(secao.secao?.nome)}
                          </span>
                          {isCorp && (
                            <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-purple-100 text-purple-700">
                              CORP
                            </Badge>
                          )}
                          {totalFuncoes > 0 && (
                            <Badge variant="secondary" className="h-4 text-[9px] px-1">
                              {totalFuncoes}
                            </Badge>
                          )}
                        </div>

                        {/* Centros de Custo da Seção */}
                        {expandedSecoes.has(secao.id) && (
                          <div className="ml-4 space-y-0.5">
                            {ccsSecao.length === 0 ? (
                              <div className="py-1 px-2 text-[10px] text-muted-foreground italic">
                                Nenhuma função cadastrada
                              </div>
                            ) : (
                              ccsSecao.map((ccGroup) => {
                                const ccKey = `${secao.id}-${ccGroup.centroCusto.id}`;
                                const isExpanded = expandedCCs.has(ccKey);
                                
                                return (
                                  <div key={ccKey}>
                                    {/* Centro de Custo */}
                                    <div
                                      className={cn(
                                        "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
                                        selectedNodeId === `cc-${ccKey}`
                                          ? "bg-blue-100 text-blue-700"
                                          : "hover:bg-blue-50"
                                      )}
                                    >
                                      <button
                                        onClick={() => toggleCC(ccKey)}
                                        className="p-0.5 hover:bg-muted rounded"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                      </button>
                                      <Briefcase className="h-3 w-3 text-blue-500 shrink-0" />
                                      <span 
                                        className="text-xs truncate flex-1"
                                        title={ccGroup.centroCusto.nome}
                                        onClick={() => handleSelectNode({ 
                                          type: 'centro_custo', 
                                          empresa, 
                                          secao,
                                          centroCusto: ccGroup.centroCusto
                                        })}
                                      >
                                        {truncateText(ccGroup.centroCusto.nome, 18)}
                                      </span>
                                      <Badge variant="outline" className="h-4 text-[9px] px-1 font-mono">
                                        {ccGroup.funcoes.length}
                                      </Badge>
                                    </div>

                                    {/* Funções do Centro de Custo */}
                                    {isExpanded && (
                                      <div className="ml-4 space-y-0.5">
                                        {ccGroup.funcoes.map(({ funcao, quadroItem }) => {
                                          const isRateio = quadroItem.tipo_calculo === 'rateio';
                                          return (
                                            <div
                                              key={quadroItem.id}
                                              className={cn(
                                                "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer",
                                                selectedNodeId === `funcao-${quadroItem.id}`
                                                  ? "bg-orange-100 text-orange-700"
                                                  : "hover:bg-muted/50"
                                              )}
                                              onClick={() => handleSelectNode({ 
                                                type: 'funcao', 
                                                empresa, 
                                                secao, 
                                                centroCusto: ccGroup.centroCusto,
                                                funcao,
                                                quadroItem 
                                              })}
                                            >
                                              <User className="h-3 w-3 text-purple-500 shrink-0" />
                                              <span 
                                                className="text-xs truncate flex-1"
                                                title={funcao.nome}
                                              >
                                                {truncateText(funcao.nome, 18)}
                                              </span>
                                              {isRateio && (
                                                <Badge 
                                                  variant="outline" 
                                                  className="h-4 text-[9px] px-1 bg-green-50 text-green-700 border-green-200"
                                                  title="Função rateada entre múltiplos CCs - premissas aplicadas a partir deste CC"
                                                >
                                                  <Split className="h-2.5 w-2.5 mr-0.5" />
                                                  {quadroItem.rateio_percentual}%
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        })}
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
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
