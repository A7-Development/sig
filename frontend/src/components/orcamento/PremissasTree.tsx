"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown, Building2, Users, Briefcase, User, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import type { CenarioEmpresa, CenarioCliente, CenarioSecao, QuadroPessoal, Funcao } from "@/lib/api/orcamento";

// ============================================
// Tipos
// ============================================

type NodeType = 'empresa' | 'cliente' | 'secao' | 'funcao';

export interface SelectedNodePremissas {
  type: NodeType;
  empresa: CenarioEmpresa;
  cliente?: CenarioCliente;
  secao?: CenarioSecao;
  funcao?: Funcao;
  quadroItem?: QuadroPessoal;
}

interface PremissasTreeProps {
  cenarioId: string;
  onNodeSelect?: (node: SelectedNodePremissas | null) => void;
}

interface FuncaoSecao {
  funcao: Funcao;
  quadroItem: QuadroPessoal;
}

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
  const [empresas, setEmpresas] = useState<CenarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado de expansão
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(new Set());
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set());
  const [expandedSecoes, setExpandedSecoes] = useState<Set<string>>(new Set());
  
  // Estado de seleção
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Funções por seção
  const [funcoesPorSecao, setFuncoesPorSecao] = useState<Record<string, FuncaoSecao[]>>({});
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
        api.get<{ items?: Funcao[] }>(`/api/v1/orcamento/funcoes?limit=1000`, token),
      ]);
      
      setEmpresas(empresasRes || []);
      setTodasFuncoes(funcoesRes?.items || funcoesRes || []);
      
      // Expandir a primeira empresa automaticamente
      if (empresasRes && empresasRes.length > 0) {
        setExpandedEmpresas(new Set([empresasRes[0].id]));
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
  // Carregar funções de uma seção
  // ============================================

  const carregarFuncoesSecao = useCallback(async (secaoId: string) => {
    if (!cenarioId || !token || funcoesPorSecao[secaoId]) return;
    
    setLoadingSecoes(prev => new Set(prev).add(secaoId));
    try {
      // Carregar quadro de pessoal da seção
      const quadroRes = await api.get<QuadroPessoal[]>(
        `/api/v1/orcamento/cenarios/${cenarioId}/quadro?cenario_secao_id=${secaoId}`,
        token
      );
      
      const quadro = quadroRes || [];
      
      // Mapear funções com seus itens de quadro
      const funcoesSecao: FuncaoSecao[] = quadro
        .filter(q => q.ativo !== false)
        .map(q => {
          const funcao = todasFuncoes.find(f => f.id === q.funcao_id);
          return funcao ? { funcao, quadroItem: q } : null;
        })
        .filter((f): f is FuncaoSecao => f !== null);
      
      setFuncoesPorSecao(prev => ({ ...prev, [secaoId]: funcoesSecao }));
    } catch (error) {
      console.error("Erro ao carregar funções da seção:", error);
      setFuncoesPorSecao(prev => ({ ...prev, [secaoId]: [] }));
    } finally {
      setLoadingSecoes(prev => {
        const newSet = new Set(prev);
        newSet.delete(secaoId);
        return newSet;
      });
    }
  }, [cenarioId, token, todasFuncoes, funcoesPorSecao]);

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

  const toggleCliente = (clienteId: string) => {
    setExpandedClientes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clienteId)) {
        newSet.delete(clienteId);
      } else {
        newSet.add(clienteId);
      }
      return newSet;
    });
  };

  const toggleSecao = (secaoId: string) => {
    // Carregar funções se ainda não carregou
    if (!funcoesPorSecao[secaoId]) {
      carregarFuncoesSecao(secaoId);
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

  // ============================================
  // Handler de seleção
  // ============================================

  const handleSelectNode = (node: SelectedNodePremissas) => {
    const nodeId = node.type === 'funcao' 
      ? `funcao-${node.quadroItem?.id}`
      : node.type === 'secao' 
        ? `secao-${node.secao?.id}`
        : node.type === 'cliente'
          ? `cliente-${node.cliente?.id}`
          : `empresa-${node.empresa.id}`;
    
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

            {/* Clientes da Empresa */}
            {expandedEmpresas.has(empresa.id) && empresa.clientes && (
              <div className="ml-4 space-y-0.5">
                {empresa.clientes.map((cliente) => (
                  <div key={cliente.id}>
                    {/* Cliente */}
                    <div
                      className={cn(
                        "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
                        selectedNodeId === `cliente-${cliente.id}`
                          ? "bg-orange-100 text-orange-700"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <button
                        onClick={() => toggleCliente(cliente.id)}
                        className="p-0.5 hover:bg-muted rounded"
                      >
                        {expandedClientes.has(cliente.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                      <Users className="h-3 w-3 text-blue-500 shrink-0" />
                      <span 
                        className="text-xs truncate flex-1"
                        title={cliente.nome_cliente || cliente.cliente_nw_codigo}
                        onClick={() => handleSelectNode({ type: 'cliente', empresa, cliente })}
                      >
                        {truncateText(cliente.nome_cliente || cliente.cliente_nw_codigo)}
                      </span>
                    </div>

                    {/* Seções do Cliente */}
                    {expandedClientes.has(cliente.id) && cliente.secoes && (
                      <div className="ml-4 space-y-0.5">
                        {cliente.secoes.map((secao) => (
                          <div key={secao.id}>
                            {/* Seção */}
                            <div
                              className={cn(
                                "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
                                selectedNodeId === `secao-${secao.id}`
                                  ? "bg-orange-100 text-orange-700"
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
                              <Briefcase className="h-3 w-3 text-green-500 shrink-0" />
                              <span 
                                className="text-xs truncate flex-1"
                                title={secao.secao?.nome}
                                onClick={() => handleSelectNode({ type: 'secao', empresa, cliente, secao })}
                              >
                                {truncateText(secao.secao?.nome)}
                              </span>
                              {funcoesPorSecao[secao.id] && (
                                <Badge variant="secondary" className="h-4 text-[9px] px-1">
                                  {funcoesPorSecao[secao.id].length}
                                </Badge>
                              )}
                            </div>

                            {/* Funções da Seção */}
                            {expandedSecoes.has(secao.id) && funcoesPorSecao[secao.id] && (
                              <div className="ml-4 space-y-0.5">
                                {funcoesPorSecao[secao.id].length === 0 ? (
                                  <div className="py-1 px-2 text-[10px] text-muted-foreground italic">
                                    Nenhuma função cadastrada
                                  </div>
                                ) : (
                                  funcoesPorSecao[secao.id].map(({ funcao, quadroItem }) => (
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
                                        cliente, 
                                        secao, 
                                        funcao,
                                        quadroItem 
                                      })}
                                    >
                                      <User className="h-3 w-3 text-purple-500 shrink-0" />
                                      <span 
                                        className="text-xs truncate flex-1"
                                        title={funcao.nome}
                                      >
                                        {truncateText(funcao.nome, 20)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}







