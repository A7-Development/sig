"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  FolderTree,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi,
  nwApi,
  empresasApi,
  secoesApi,
  type CenarioEmpresa,
  type CenarioCliente,
  type CenarioSecao,
  type ClienteNW,
  type Empresa,
  type Secao,
} from "@/lib/api/orcamento";
import { cn } from "@/lib/utils";

// ============================================
// Tipos
// ============================================

type NodeType = 'empresa' | 'cliente' | 'secao';

interface SelectedNode {
  type: NodeType;
  empresa: CenarioEmpresa;
  cliente?: CenarioCliente;
  secao?: CenarioSecao;
}

interface MasterDetailTreeProps {
  cenarioId: string;
  onNodeSelect?: (node: SelectedNode | null) => void;
  onSecoesLoaded?: (secoes: CenarioSecao[]) => void;  // Callback com todas as seções
  selectedSecaoId?: string | null;
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

export function MasterDetailTree({ 
  cenarioId, 
  onNodeSelect,
  onSecoesLoaded,
  selectedSecaoId 
}: MasterDetailTreeProps) {
  const { accessToken: token } = useAuthStore();
  
  // Estado principal
  const [empresas, setEmpresas] = useState<CenarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de expansão
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(new Set());
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set());
  
  // Modais
  const [showAddEmpresa, setShowAddEmpresa] = useState(false);
  const [showAddCliente, setShowAddCliente] = useState(false);
  const [showAddSecao, setShowAddSecao] = useState(false);
  
  // Dados para modais
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<Empresa[]>([]);
  const [clientesNW, setClientesNW] = useState<ClienteNW[]>([]);
  const [secoesDisponiveis, setSecoesDisponiveis] = useState<Secao[]>([]);
  
  // Estado de seleção para modais
  const [empresaSelecionada, setEmpresaSelecionada] = useState<CenarioEmpresa | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<CenarioCliente | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [selectedClienteNW, setSelectedClienteNW] = useState<string>("");
  const [selectedSecaoIdModal, setSelectedSecaoIdModal] = useState<string>("");
  
  // Busca
  const [buscaCliente, setBuscaCliente] = useState("");
  const [loadingClientesNW, setLoadingClientesNW] = useState(false);
  
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
      const data = await cenariosApi.getEmpresas(token, cenarioId);
      setEmpresas(data);
      // Expandir todas as empresas por padrão
      setExpandedEmpresas(new Set(data.map(e => e.id)));
      
      // Coletar todas as seções e notificar o pai
      if (onSecoesLoaded) {
        const todasSecoes: CenarioSecao[] = [];
        data.forEach(empresa => {
          empresa.clientes?.forEach(cliente => {
            cliente.secoes?.forEach(secao => {
              if (secao.ativo) {
                todasSecoes.push(secao);
              }
            });
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

  const toggleCliente = (clienteId: string) => {
    setExpandedClientes(prev => {
      const next = new Set(prev);
      if (next.has(clienteId)) {
        next.delete(clienteId);
      } else {
        next.add(clienteId);
      }
      return next;
    });
  };

  // ============================================
  // Buscar clientes NW
  // ============================================

  const buscarClientesNW = async (busca: string) => {
    if (!token || busca.length < 2) {
      setClientesNW([]);
      return;
    }
    setLoadingClientesNW(true);
    try {
      const data = await nwApi.getClientes(token, busca, true);
      setClientesNW(data);
    } catch (err) {
      console.error("Erro ao buscar clientes NW:", err);
    } finally {
      setLoadingClientesNW(false);
    }
  };

  // Debounce busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (buscaCliente.length >= 2) {
        buscarClientesNW(buscaCliente);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaCliente]);

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
    if (!confirm(`Remover empresa "${empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social}" e todos os seus clientes/seções?`)) {
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
  // Adicionar Cliente
  // ============================================

  const openAddCliente = (empresa: CenarioEmpresa) => {
    setEmpresaSelecionada(empresa);
    setBuscaCliente("");
    setClientesNW([]);
    setSelectedClienteNW("");
    setShowAddCliente(true);
  };

  const handleAddCliente = async () => {
    if (!token || !empresaSelecionada || !selectedClienteNW) return;
    const clienteNW = clientesNW.find(c => c.codigo === selectedClienteNW);
    if (!clienteNW) return;
    
    setSaving(true);
    try {
      await cenariosApi.addCliente(token, cenarioId, empresaSelecionada.id, {
        cliente_nw_codigo: clienteNW.codigo,
        nome_cliente: clienteNW.razao_social || clienteNW.nome_fantasia
      });
      await carregarEstrutura();
      setShowAddCliente(false);
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCliente = async (empresa: CenarioEmpresa, cliente: CenarioCliente) => {
    if (!token) return;
    if (!confirm(`Remover cliente "${cliente.nome_cliente}" e todas as suas seções?`)) {
      return;
    }
    try {
      await cenariosApi.deleteCliente(token, cenarioId, empresa.id, cliente.id);
      await carregarEstrutura();
    } catch (err: any) {
      alert(err.message || "Erro ao remover cliente");
    }
  };

  // ============================================
  // Adicionar Seção
  // ============================================

  const openAddSecao = (empresa: CenarioEmpresa, cliente: CenarioCliente) => {
    setEmpresaSelecionada(empresa);
    setClienteSelecionado(cliente);
    setSelectedSecaoIdModal("");
    setShowAddSecao(true);
  };

  const handleAddSecao = async () => {
    if (!token || !empresaSelecionada || !clienteSelecionado || !selectedSecaoIdModal) return;
    
    setSaving(true);
    try {
      await cenariosApi.addSecao(token, cenarioId, empresaSelecionada.id, clienteSelecionado.id, {
        secao_id: selectedSecaoIdModal
      });
      await carregarEstrutura();
      // Expandir cliente para mostrar nova seção
      setExpandedClientes(prev => new Set([...prev, clienteSelecionado.id]));
      setShowAddSecao(false);
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar seção");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSecao = async (empresa: CenarioEmpresa, cliente: CenarioCliente, secao: CenarioSecao) => {
    if (!token) return;
    if (!confirm(`Remover seção "${secao.secao?.nome}"?`)) {
      return;
    }
    try {
      await cenariosApi.deleteSecao(token, cenarioId, empresa.id, cliente.id, secao.id);
      await carregarEstrutura();
    } catch (err: any) {
      alert(err.message || "Erro ao remover seção");
    }
  };

  // ============================================
  // Cálculos de totais
  // ============================================

  const calcularTotaisEmpresa = (empresa: CenarioEmpresa) => {
    let totalClientes = empresa.clientes?.filter(c => c.ativo).length || 0;
    let totalSecoes = 0;
    empresa.clientes?.filter(c => c.ativo).forEach(cliente => {
      totalSecoes += cliente.secoes?.filter(s => s.ativo).length || 0;
    });
    return { totalClientes, totalSecoes };
  };

  const calcularTotaisCliente = (cliente: CenarioCliente) => {
    return cliente.secoes?.filter(s => s.ativo).length || 0;
  };

  // ============================================
  // Filtrar empresas não associadas
  // ============================================

  const empresasNaoAssociadas = empresasDisponiveis.filter(
    emp => !empresas.some(ce => ce.empresa_id === emp.id)
  );

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
                const clientes = empresa.clientes?.filter(c => c.ativo) || [];

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
                        {totais.totalClientes}C/{totais.totalSecoes}S
                      </Badge>
                      <div className="flex items-center gap-0.5">
                        <Button 
                          size="icon-xs" 
                          variant="ghost"
                          className="h-5 w-5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddCliente(empresa);
                          }}
                          title="Adicionar Cliente"
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

                    {/* Clientes da Empresa */}
                    {isExpanded && (
                      <div className="ml-4 border-l border-muted pl-1 mt-0.5 space-y-0.5">
                        {clientes.length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2 px-2 italic">
                            Nenhum cliente associado
                          </div>
                        ) : (
                          clientes.map(cliente => {
                            const isClienteExpanded = expandedClientes.has(cliente.id);
                            const totalSecoes = calcularTotaisCliente(cliente);
                            const secoes = cliente.secoes?.filter(s => s.ativo) || [];

                            return (
                              <div key={cliente.id}>
                                {/* Cliente */}
                                <div 
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group",
                                    "hover:bg-blue-50 hover:text-blue-700",
                                    "transition-colors"
                                  )}
                                >
                                  <button 
                                    onClick={() => toggleCliente(cliente.id)}
                                    className="p-0.5 hover:bg-blue-100 rounded"
                                  >
                                    {secoes.length > 0 ? (
                                      isClienteExpanded ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )
                                    ) : (
                                      <div className="w-3" />
                                    )}
                                  </button>
                                  <Users className="h-3 w-3 text-blue-600" />
                                  <span 
                                    className="flex-1 text-xs"
                                    title={cliente.nome_cliente || cliente.cliente_nw_codigo}
                                  >
                                    {truncateText(cliente.nome_cliente || cliente.cliente_nw_codigo)}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                                    {totalSecoes}S
                                  </Badge>
                                  <div className="flex items-center gap-0.5">
                                    <Button 
                                      size="icon-xs" 
                                      variant="ghost"
                                      className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAddSecao(empresa, cliente);
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
                                        handleDeleteCliente(empresa, cliente);
                                      }}
                                      title="Remover Cliente"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Indicação para adicionar seção quando não há nenhuma */}
                                {secoes.length === 0 && (
                                  <div 
                                    className="ml-10 py-2 px-3 text-xs text-muted-foreground italic cursor-pointer hover:text-green-600 hover:bg-green-50/50 rounded transition-colors"
                                    onClick={() => openAddSecao(empresa, cliente)}
                                  >
                                    + Clique aqui para adicionar uma seção
                                  </div>
                                )}

                                {/* Seções do Cliente */}
                                {isClienteExpanded && secoes.length > 0 && (
                                  <div className="ml-4 border-l border-muted pl-1 mt-0.5 space-y-0.5">
                                    {secoes.map(secao => (
                                      <div 
                                        key={secao.id}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer group",
                                          "hover:bg-green-50 hover:text-green-700",
                                          selectedSecaoId === secao.id && "bg-green-100 text-green-800",
                                          "transition-colors"
                                        )}
                                        onClick={() => onNodeSelect?.({
                                          type: 'secao',
                                          empresa,
                                          cliente,
                                          secao
                                        })}
                                      >
                                        <div className="w-3" />
                                        <FolderTree className="h-3 w-3 text-green-600" />
                                        <span 
                                          className="flex-1 text-xs"
                                          title={secao.secao?.nome || "Seção"}
                                        >
                                          {truncateText(secao.secao?.nome || "Seção")}
                                        </span>
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                          {secao.secao?.codigo}
                                        </Badge>
                                        <Button 
                                          size="icon-xs" 
                                          variant="ghost"
                                          className="h-5 w-5 text-red-500 hover:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSecao(empresa, cliente, secao);
                                          }}
                                          title="Remover Seção"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Empresa</DialogTitle>
            <DialogDescription>
              Selecione uma empresa para adicionar ao cenário
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
                    {emp.nome_fantasia || emp.razao_social} ({emp.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmpresa(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEmpresa} disabled={!selectedEmpresaId || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Cliente */}
      <Dialog open={showAddCliente} onOpenChange={setShowAddCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cliente</DialogTitle>
            <DialogDescription>
              Busque um cliente do NW para adicionar à empresa {empresaSelecionada?.empresa?.nome_fantasia}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar clientes..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {loadingClientesNW && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {!loadingClientesNW && clientesNW.length > 0 && (
              <Select value={selectedClienteNW} onValueChange={setSelectedClienteNW}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientesNW.map(cli => (
                    <SelectItem key={cli.codigo} value={cli.codigo}>
                      {cli.razao_social || cli.nome_fantasia} ({cli.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {!loadingClientesNW && buscaCliente.length >= 2 && clientesNW.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum cliente encontrado
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCliente(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCliente} disabled={!selectedClienteNW || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Seção */}
      <Dialog open={showAddSecao} onOpenChange={setShowAddSecao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Seção</DialogTitle>
            <DialogDescription>
              Selecione uma seção para o cliente {clienteSelecionado?.nome_cliente}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedSecaoIdModal} onValueChange={setSelectedSecaoIdModal}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma seção..." />
              </SelectTrigger>
              <SelectContent>
                {secoesDisponiveis
                  .filter(sec => !clienteSelecionado?.secoes?.some(s => s.secao_id === sec.id && s.ativo))
                  .map(sec => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.nome} ({sec.codigo})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSecao(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSecao} disabled={!selectedSecaoIdModal || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


