"use client";

import { useState, useEffect, useCallback } from "react";
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

// ============================================
// Tipos
// ============================================

interface CapacityPlanningPanelProps {
  cenarioId: string;
  empresa: CenarioEmpresa;
  cliente: CenarioCliente;
  secao: CenarioSecao;
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
  const [selectedFuncaoId, setSelectedFuncaoId] = useState("");
  const [novoFatorPA, setNovoFatorPA] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Edição inline
  const [editingCell, setEditingCell] = useState<{id: string, mes: string} | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const handleAddFuncao = async () => {
    if (!token || !selectedFuncaoId) return;
    setSaving(true);
    try {
      await cenariosApi.addQuadro(token, cenarioId, {
        cenario_id: cenarioId,
        funcao_id: selectedFuncaoId,
        cenario_secao_id: secao.id,
        fator_pa: novoFatorPA,
        regime: "CLT",
        qtd_jan: 0, qtd_fev: 0, qtd_mar: 0, qtd_abr: 0,
        qtd_mai: 0, qtd_jun: 0, qtd_jul: 0, qtd_ago: 0,
        qtd_set: 0, qtd_out: 0, qtd_nov: 0, qtd_dez: 0,
      });
      await carregarDados();
      setShowAddFuncao(false);
      setSelectedFuncaoId("");
      setNovoFatorPA(1);
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar função");
    } finally {
      setSaving(false);
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

  const handleCellEdit = async (quadroItem: QuadroPessoal, mesKey: string, valor: number) => {
    if (!token) return;
    
    const updateData: any = {};
    updateData[`qtd_${mesKey}`] = valor;
    
    try {
      await cenariosApi.updateQuadro(token, cenarioId, quadroItem.id, updateData);
      // Atualizar local
      setQuadro(prev => prev.map(q => 
        q.id === quadroItem.id 
          ? { ...q, [`qtd_${mesKey}`]: valor }
          : q
      ));
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar");
    }
    setEditingCell(null);
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
                <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[180px]">Função</TableHead>
                <TableHead className="text-center w-20">Fator PA</TableHead>
                {meses.map(m => (
                  <TableHead key={`${m.ano}-${m.mes}`} className="text-center w-16 text-xs">
                    {m.label}
                  </TableHead>
                ))}
                <TableHead className="text-center w-16 bg-muted/30">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quadro.map(item => {
                const total = calcularTotalFuncao(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {item.funcao?.nome}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.funcao?.codigo})
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={item.fator_pa || 1}
                        onChange={(e) => handleFatorPAEdit(item, parseFloat(e.target.value) || 1)}
                        className="h-7 w-16 text-center text-xs mx-auto"
                      />
                    </TableCell>
                    {meses.map(m => {
                      const key = m.key;
                      const valor = item[`qtd_${key}` as keyof QuadroPessoal] as number || 0;
                      const isEditing = editingCell?.id === item.id && editingCell?.mes === key;
                      
                      return (
                        <TableCell key={`${item.id}-${key}`} className="text-center p-1">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellEdit(item, key, parseInt(editValue) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(item, key, parseInt(editValue) || 0);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="h-7 w-14 text-center text-xs"
                            />
                          ) : (
                            <button
                              className="w-full h-7 hover:bg-muted/50 rounded text-xs font-mono"
                              onClick={() => {
                                setEditingCell({ id: item.id, mes: key });
                                setEditValue(String(valor));
                              }}
                            >
                              {valor || '-'}
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-semibold bg-muted/20">
                      {total}
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
              
              {/* Linha de Totais */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="sticky left-0 bg-muted/30 z-10">Total HC</TableCell>
                <TableCell></TableCell>
                {meses.map(m => (
                  <TableCell key={`total-${m.key}`} className="text-center">
                    {calcularTotalMes(m.key)}
                  </TableCell>
                ))}
                <TableCell className="text-center bg-muted/50">
                  {quadro.reduce((sum, q) => sum + calcularTotalFuncao(q), 0)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
              
              {/* Linha de PAs */}
              <TableRow className="bg-orange-50 text-orange-700">
                <TableCell className="sticky left-0 bg-orange-50 z-10">Total PAs</TableCell>
                <TableCell></TableCell>
                {meses.map(m => (
                  <TableCell key={`pa-${m.key}`} className="text-center font-mono text-xs">
                    {calcularPAsMes(m.key).toFixed(1)}
                  </TableCell>
                ))}
                <TableCell className="text-center font-semibold bg-orange-100">
                  {meses.reduce((sum, m) => sum + calcularPAsMes(m.key), 0).toFixed(1)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Modal: Adicionar Função */}
      <Dialog open={showAddFuncao} onOpenChange={setShowAddFuncao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Função</DialogTitle>
            <DialogDescription>
              Selecione uma função para adicionar ao quadro de pessoal desta seção
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Função</label>
              <Select value={selectedFuncaoId} onValueChange={setSelectedFuncaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função..." />
                </SelectTrigger>
                <SelectContent>
                  {funcoesNaoUtilizadas.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome} ({f.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Fator PA</label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={novoFatorPA}
                onChange={(e) => setNovoFatorPA(parseFloat(e.target.value) || 1)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                HC / Fator = Posições de Atendimento
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFuncao(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddFuncao} disabled={!selectedFuncaoId || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

