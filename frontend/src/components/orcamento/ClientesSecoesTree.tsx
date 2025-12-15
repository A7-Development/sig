"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Settings2,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi,
  nwApi,
  secoesApi,
  type CenarioCliente,
  type CenarioSecao,
  type ClienteNW,
  type Secao,
} from "@/lib/api/orcamento";

interface ClientesSecoesTreeProps {
  cenarioId: string;
  onSecaoSelect?: (cenarioSecao: CenarioSecao | null) => void;
  selectedSecaoId?: string | null;
}

export function ClientesSecoesTree({ 
  cenarioId, 
  onSecaoSelect,
  selectedSecaoId 
}: ClientesSecoesTreeProps) {
  const { accessToken: token } = useAuthStore();
  const [clientes, setClientes] = useState<CenarioCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set());
  
  // Modal Adicionar Cliente
  const [showAddCliente, setShowAddCliente] = useState(false);
  const [clientesNW, setClientesNW] = useState<ClienteNW[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [loadingClientesNW, setLoadingClientesNW] = useState(false);
  const [selectedClienteNW, setSelectedClienteNW] = useState<string | null>(null);
  
  // Modal Adicionar Seção
  const [showAddSecao, setShowAddSecao] = useState(false);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [clienteParaSecao, setClienteParaSecao] = useState<CenarioCliente | null>(null);
  const [selectedSecao, setSelectedSecao] = useState<string | null>(null);
  const [fatorPA, setFatorPA] = useState(3.0);
  
  // Carregar clientes do cenário
  useEffect(() => {
    if (token && cenarioId) {
      carregarClientes();
    }
  }, [token, cenarioId]);
  
  // Carregar seções disponíveis
  useEffect(() => {
    if (token) {
      secoesApi.listar(token, { ativo: true }).then(setSecoes).catch(console.error);
    }
  }, [token]);
  
  const carregarClientes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cenariosApi.getClientes(token, cenarioId);
      setClientes(data);
      // Expandir todos por padrão se poucos
      if (data.length <= 3) {
        setExpandedClientes(new Set(data.map(c => c.id)));
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const buscarClientesNW = async () => {
    if (!token) return;
    setLoadingClientesNW(true);
    try {
      const data = await nwApi.getClientes(token, buscaCliente, true);
      setClientesNW(data);
    } catch (error) {
      console.error("Erro ao buscar clientes NW:", error);
    } finally {
      setLoadingClientesNW(false);
    }
  };
  
  useEffect(() => {
    if (showAddCliente && token) {
      buscarClientesNW();
    }
  }, [showAddCliente]);
  
  const handleAddCliente = async () => {
    if (!token || !selectedClienteNW) return;
    try {
      const clienteNW = clientesNW.find(c => c.codigo === selectedClienteNW);
      await cenariosApi.addCliente(token, cenarioId, {
        cliente_nw_codigo: selectedClienteNW,
        nome_cliente: clienteNW?.razao_social || clienteNW?.nome_fantasia || undefined,
      });
      setShowAddCliente(false);
      setSelectedClienteNW(null);
      setBuscaCliente("");
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar cliente");
    }
  };
  
  const handleDeleteCliente = async (clienteId: string) => {
    if (!token || !confirm("Deseja remover este cliente do cenário? As seções associadas também serão removidas.")) return;
    try {
      await cenariosApi.deleteCliente(token, cenarioId, clienteId);
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao remover cliente");
    }
  };
  
  const handleAddSecao = async () => {
    if (!token || !clienteParaSecao || !selectedSecao) return;
    try {
      await cenariosApi.addClienteSecao(token, cenarioId, clienteParaSecao.id, {
        secao_id: selectedSecao,
        fator_pa: fatorPA,
      });
      setShowAddSecao(false);
      setClienteParaSecao(null);
      setSelectedSecao(null);
      setFatorPA(3.0);
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar seção");
    }
  };
  
  const handleDeleteSecao = async (clienteId: string, secaoId: string) => {
    if (!token || !confirm("Deseja remover esta seção do cliente?")) return;
    try {
      await cenariosApi.deleteClienteSecao(token, cenarioId, clienteId, secaoId);
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao remover seção");
    }
  };
  
  const toggleExpanded = (clienteId: string) => {
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
  
  // Seções já usadas no cenário
  const secoesUsadas = new Set(
    clientes.flatMap(c => c.secoes?.map(s => s.secao_id) || [])
  );
  
  // Seções disponíveis (não usadas ainda)
  const secoesDisponiveis = secoes.filter(s => !secoesUsadas.has(s.id));
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Estrutura Clientes &gt; Seções
              </CardTitle>
              <CardDescription>
                Organize as seções (operações) por cliente
              </CardDescription>
            </div>
            <Button size="sm" variant="success" onClick={() => setShowAddCliente(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum cliente adicionado</p>
              <p className="text-xs mt-1">Adicione clientes para começar a estruturar o cenário</p>
            </div>
          ) : (
            <div className="space-y-1">
              {clientes.map((cliente) => {
                const isExpanded = expandedClientes.has(cliente.id);
                const secoesCliente = cliente.secoes || [];
                
                return (
                  <div key={cliente.id} className="border rounded-lg overflow-hidden">
                    {/* Cliente Header */}
                    <div 
                      className="flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleExpanded(cliente.id)}
                    >
                      <button className="p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <Building2 className="h-4 w-4 text-orange-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {cliente.nome_cliente || cliente.cliente_nw_codigo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.cliente_nw_codigo}
                          {secoesCliente.length > 0 && (
                            <span className="ml-2">• {secoesCliente.length} seção(ões)</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClienteParaSecao(cliente);
                          setShowAddSecao(true);
                        }}
                        title="Adicionar seção"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCliente(cliente.id);
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Remover cliente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    {/* Seções do Cliente */}
                    {isExpanded && (
                      <div className="border-t">
                        {secoesCliente.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-xs">
                            Nenhuma seção adicionada
                          </div>
                        ) : (
                          <div className="divide-y">
                            {secoesCliente.map((cenarioSecao) => (
                              <div 
                                key={cenarioSecao.id}
                                className={`flex items-center gap-2 p-2 pl-8 hover:bg-muted/30 cursor-pointer ${
                                  selectedSecaoId === cenarioSecao.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''
                                }`}
                                onClick={() => onSecaoSelect?.(cenarioSecao)}
                              >
                                <FolderTree className="h-4 w-4 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">
                                    {cenarioSecao.secao?.nome || cenarioSecao.secao_id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {cenarioSecao.secao?.codigo}
                                    <span className="ml-2">• Fator PA: {cenarioSecao.fator_pa}</span>
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  <Users className="h-3 w-3 mr-1" />
                                  0 HC
                                </Badge>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSecao(cliente.id, cenarioSecao.id);
                                  }}
                                  className="text-destructive hover:text-destructive"
                                  title="Remover seção"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal Adicionar Cliente */}
      <Dialog open={showAddCliente} onOpenChange={setShowAddCliente}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Cliente ao Cenário</DialogTitle>
            <DialogDescription>
              Selecione um cliente do banco NW para adicionar ao cenário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar cliente por nome ou código..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarClientesNW()}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={buscarClientesNW} disabled={loadingClientesNW}>
                {loadingClientesNW ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {loadingClientesNW ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Buscando clientes...
                </div>
              ) : clientesNW.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhum cliente encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {clientesNW.map((cliente) => {
                    const jaAdicionado = clientes.some(c => c.cliente_nw_codigo === cliente.codigo);
                    return (
                      <label
                        key={cliente.codigo}
                        className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                          jaAdicionado ? 'opacity-50' : ''
                        } ${selectedClienteNW === cliente.codigo ? 'bg-orange-50' : ''}`}
                      >
                        <input
                          type="radio"
                          name="cliente_nw"
                          value={cliente.codigo}
                          checked={selectedClienteNW === cliente.codigo}
                          onChange={() => setSelectedClienteNW(cliente.codigo)}
                          disabled={jaAdicionado}
                          className="text-orange-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cliente.razao_social}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cliente.codigo}
                            {cliente.nome_fantasia && ` • ${cliente.nome_fantasia}`}
                          </p>
                        </div>
                        {jaAdicionado && (
                          <Badge variant="secondary" className="text-[10px]">Adicionado</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddCliente(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCliente} disabled={!selectedClienteNW}>
                Adicionar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal Adicionar Seção */}
      <Dialog open={showAddSecao} onOpenChange={setShowAddSecao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Seção ao Cliente</DialogTitle>
            <DialogDescription>
              Selecione uma seção (operação) para o cliente {clienteParaSecao?.nome_cliente || clienteParaSecao?.cliente_nw_codigo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seção</label>
              <Select value={selectedSecao || ""} onValueChange={setSelectedSecao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma seção..." />
                </SelectTrigger>
                <SelectContent>
                  {secoesDisponiveis.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Nenhuma seção disponível
                    </div>
                  ) : (
                    secoesDisponiveis.map((secao) => (
                      <SelectItem key={secao.id} value={secao.id}>
                        {secao.nome} ({secao.codigo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fator PA</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={fatorPA}
                onChange={(e) => setFatorPA(parseFloat(e.target.value) || 3.0)}
              />
              <p className="text-xs text-muted-foreground">
                Fator para calcular PAs (Posições de Atendimento): HC / Fator = PAs
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddSecao(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddSecao} disabled={!selectedSecao}>
                Adicionar Seção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Settings2,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi,
  nwApi,
  secoesApi,
  type CenarioCliente,
  type CenarioSecao,
  type ClienteNW,
  type Secao,
} from "@/lib/api/orcamento";

interface ClientesSecoesTreeProps {
  cenarioId: string;
  onSecaoSelect?: (cenarioSecao: CenarioSecao | null) => void;
  selectedSecaoId?: string | null;
}

export function ClientesSecoesTree({ 
  cenarioId, 
  onSecaoSelect,
  selectedSecaoId 
}: ClientesSecoesTreeProps) {
  const { accessToken: token } = useAuthStore();
  const [clientes, setClientes] = useState<CenarioCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set());
  
  // Modal Adicionar Cliente
  const [showAddCliente, setShowAddCliente] = useState(false);
  const [clientesNW, setClientesNW] = useState<ClienteNW[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [loadingClientesNW, setLoadingClientesNW] = useState(false);
  const [selectedClienteNW, setSelectedClienteNW] = useState<string | null>(null);
  
  // Modal Adicionar Seção
  const [showAddSecao, setShowAddSecao] = useState(false);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [clienteParaSecao, setClienteParaSecao] = useState<CenarioCliente | null>(null);
  const [selectedSecao, setSelectedSecao] = useState<string | null>(null);
  const [fatorPA, setFatorPA] = useState(3.0);
  
  // Carregar clientes do cenário
  useEffect(() => {
    if (token && cenarioId) {
      carregarClientes();
    }
  }, [token, cenarioId]);
  
  // Carregar seções disponíveis
  useEffect(() => {
    if (token) {
      secoesApi.listar(token, { ativo: true }).then(setSecoes).catch(console.error);
    }
  }, [token]);
  
  const carregarClientes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cenariosApi.getClientes(token, cenarioId);
      setClientes(data);
      // Expandir todos por padrão se poucos
      if (data.length <= 3) {
        setExpandedClientes(new Set(data.map(c => c.id)));
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const buscarClientesNW = async () => {
    if (!token) return;
    setLoadingClientesNW(true);
    try {
      const data = await nwApi.getClientes(token, buscaCliente, true);
      setClientesNW(data);
    } catch (error) {
      console.error("Erro ao buscar clientes NW:", error);
    } finally {
      setLoadingClientesNW(false);
    }
  };
  
  useEffect(() => {
    if (showAddCliente && token) {
      buscarClientesNW();
    }
  }, [showAddCliente]);
  
  const handleAddCliente = async () => {
    if (!token || !selectedClienteNW) return;
    try {
      const clienteNW = clientesNW.find(c => c.codigo === selectedClienteNW);
      await cenariosApi.addCliente(token, cenarioId, {
        cliente_nw_codigo: selectedClienteNW,
        nome_cliente: clienteNW?.razao_social || clienteNW?.nome_fantasia || undefined,
      });
      setShowAddCliente(false);
      setSelectedClienteNW(null);
      setBuscaCliente("");
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar cliente");
    }
  };
  
  const handleDeleteCliente = async (clienteId: string) => {
    if (!token || !confirm("Deseja remover este cliente do cenário? As seções associadas também serão removidas.")) return;
    try {
      await cenariosApi.deleteCliente(token, cenarioId, clienteId);
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao remover cliente");
    }
  };
  
  const handleAddSecao = async () => {
    if (!token || !clienteParaSecao || !selectedSecao) return;
    try {
      await cenariosApi.addClienteSecao(token, cenarioId, clienteParaSecao.id, {
        secao_id: selectedSecao,
        fator_pa: fatorPA,
      });
      setShowAddSecao(false);
      setClienteParaSecao(null);
      setSelectedSecao(null);
      setFatorPA(3.0);
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar seção");
    }
  };
  
  const handleDeleteSecao = async (clienteId: string, secaoId: string) => {
    if (!token || !confirm("Deseja remover esta seção do cliente?")) return;
    try {
      await cenariosApi.deleteClienteSecao(token, cenarioId, clienteId, secaoId);
      carregarClientes();
    } catch (error: any) {
      alert(error.message || "Erro ao remover seção");
    }
  };
  
  const toggleExpanded = (clienteId: string) => {
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
  
  // Seções já usadas no cenário
  const secoesUsadas = new Set(
    clientes.flatMap(c => c.secoes?.map(s => s.secao_id) || [])
  );
  
  // Seções disponíveis (não usadas ainda)
  const secoesDisponiveis = secoes.filter(s => !secoesUsadas.has(s.id));
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Estrutura Clientes &gt; Seções
              </CardTitle>
              <CardDescription>
                Organize as seções (operações) por cliente
              </CardDescription>
            </div>
            <Button size="sm" variant="success" onClick={() => setShowAddCliente(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum cliente adicionado</p>
              <p className="text-xs mt-1">Adicione clientes para começar a estruturar o cenário</p>
            </div>
          ) : (
            <div className="space-y-1">
              {clientes.map((cliente) => {
                const isExpanded = expandedClientes.has(cliente.id);
                const secoesCliente = cliente.secoes || [];
                
                return (
                  <div key={cliente.id} className="border rounded-lg overflow-hidden">
                    {/* Cliente Header */}
                    <div 
                      className="flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleExpanded(cliente.id)}
                    >
                      <button className="p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <Building2 className="h-4 w-4 text-orange-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {cliente.nome_cliente || cliente.cliente_nw_codigo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.cliente_nw_codigo}
                          {secoesCliente.length > 0 && (
                            <span className="ml-2">• {secoesCliente.length} seção(ões)</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClienteParaSecao(cliente);
                          setShowAddSecao(true);
                        }}
                        title="Adicionar seção"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCliente(cliente.id);
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Remover cliente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    {/* Seções do Cliente */}
                    {isExpanded && (
                      <div className="border-t">
                        {secoesCliente.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-xs">
                            Nenhuma seção adicionada
                          </div>
                        ) : (
                          <div className="divide-y">
                            {secoesCliente.map((cenarioSecao) => (
                              <div 
                                key={cenarioSecao.id}
                                className={`flex items-center gap-2 p-2 pl-8 hover:bg-muted/30 cursor-pointer ${
                                  selectedSecaoId === cenarioSecao.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''
                                }`}
                                onClick={() => onSecaoSelect?.(cenarioSecao)}
                              >
                                <FolderTree className="h-4 w-4 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">
                                    {cenarioSecao.secao?.nome || cenarioSecao.secao_id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {cenarioSecao.secao?.codigo}
                                    <span className="ml-2">• Fator PA: {cenarioSecao.fator_pa}</span>
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  <Users className="h-3 w-3 mr-1" />
                                  0 HC
                                </Badge>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSecao(cliente.id, cenarioSecao.id);
                                  }}
                                  className="text-destructive hover:text-destructive"
                                  title="Remover seção"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal Adicionar Cliente */}
      <Dialog open={showAddCliente} onOpenChange={setShowAddCliente}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Cliente ao Cenário</DialogTitle>
            <DialogDescription>
              Selecione um cliente do banco NW para adicionar ao cenário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar cliente por nome ou código..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarClientesNW()}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={buscarClientesNW} disabled={loadingClientesNW}>
                {loadingClientesNW ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {loadingClientesNW ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Buscando clientes...
                </div>
              ) : clientesNW.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhum cliente encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {clientesNW.map((cliente) => {
                    const jaAdicionado = clientes.some(c => c.cliente_nw_codigo === cliente.codigo);
                    return (
                      <label
                        key={cliente.codigo}
                        className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                          jaAdicionado ? 'opacity-50' : ''
                        } ${selectedClienteNW === cliente.codigo ? 'bg-orange-50' : ''}`}
                      >
                        <input
                          type="radio"
                          name="cliente_nw"
                          value={cliente.codigo}
                          checked={selectedClienteNW === cliente.codigo}
                          onChange={() => setSelectedClienteNW(cliente.codigo)}
                          disabled={jaAdicionado}
                          className="text-orange-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cliente.razao_social}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cliente.codigo}
                            {cliente.nome_fantasia && ` • ${cliente.nome_fantasia}`}
                          </p>
                        </div>
                        {jaAdicionado && (
                          <Badge variant="secondary" className="text-[10px]">Adicionado</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddCliente(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCliente} disabled={!selectedClienteNW}>
                Adicionar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal Adicionar Seção */}
      <Dialog open={showAddSecao} onOpenChange={setShowAddSecao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Seção ao Cliente</DialogTitle>
            <DialogDescription>
              Selecione uma seção (operação) para o cliente {clienteParaSecao?.nome_cliente || clienteParaSecao?.cliente_nw_codigo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seção</label>
              <Select value={selectedSecao || ""} onValueChange={setSelectedSecao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma seção..." />
                </SelectTrigger>
                <SelectContent>
                  {secoesDisponiveis.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Nenhuma seção disponível
                    </div>
                  ) : (
                    secoesDisponiveis.map((secao) => (
                      <SelectItem key={secao.id} value={secao.id}>
                        {secao.nome} ({secao.codigo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fator PA</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={fatorPA}
                onChange={(e) => setFatorPA(parseFloat(e.target.value) || 3.0)}
              />
              <p className="text-xs text-muted-foreground">
                Fator para calcular PAs (Posições de Atendimento): HC / Fator = PAs
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddSecao(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddSecao} disabled={!selectedSecao}>
                Adicionar Seção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}



