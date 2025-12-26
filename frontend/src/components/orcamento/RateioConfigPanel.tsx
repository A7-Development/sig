"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  PieChart,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  rateios,
  type RateioGrupoComValidacao,
  type RateioGrupoCreate,
  type RateioDestinoCreate,
} from "@/lib/api/orcamento";
import { cn } from "@/lib/utils";

// ============================================
// Tipos
// ============================================

interface RateioConfigPanelProps {
  cenarioId: string;
}

interface CCDisponivel {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
}

// ============================================
// Componente Principal
// ============================================

export function RateioConfigPanel({ cenarioId }: RateioConfigPanelProps) {
  const { accessToken: token } = useAuthStore();

  // Estado principal
  const [grupos, setGrupos] = useState<RateioGrupoComValidacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CCs disponíveis
  const [poolsDisponiveis, setPoolsDisponiveis] = useState<CCDisponivel[]>([]);
  const [operacionaisDisponiveis, setOperacionaisDisponiveis] = useState<CCDisponivel[]>([]);

  // Modal criar grupo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState<{
    nome: string;
    cc_origem_pool_id: string;
    descricao: string;
  }>({ nome: "", cc_origem_pool_id: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  // Modal adicionar destino
  const [showAddDestinoModal, setShowAddDestinoModal] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<RateioGrupoComValidacao | null>(null);
  const [novoDestino, setNovoDestino] = useState<{
    cc_destino_id: string;
    percentual: number;
  }>({ cc_destino_id: "", percentual: 0 });

  // ============================================
  // Carregar dados
  // ============================================

  const carregarDados = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Carregar grupos de rateio
      const gruposData = await rateios.listar(token, cenarioId, false);
      setGrupos(gruposData);

      // Carregar CCs disponíveis
      const [pools, operacionais] = await Promise.all([
        rateios.listarPoolsDisponiveis(token, cenarioId),
        rateios.listarOperacionaisDisponiveis(token, cenarioId),
      ]);
      setPoolsDisponiveis(pools);
      setOperacionaisDisponiveis(operacionais);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [token, cenarioId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ============================================
  // Handlers
  // ============================================

  const handleCreateGrupo = async () => {
    if (!token || !novoGrupo.nome || !novoGrupo.cc_origem_pool_id) return;

    setSaving(true);
    try {
      await rateios.criar(token, cenarioId, {
        nome: novoGrupo.nome,
        cc_origem_pool_id: novoGrupo.cc_origem_pool_id,
        descricao: novoGrupo.descricao || undefined,
        ativo: true,
        destinos: [],
      });
      await carregarDados();
      setShowCreateModal(false);
      setNovoGrupo({ nome: "", cc_origem_pool_id: "", descricao: "" });
    } catch (err: any) {
      alert(err.message || "Erro ao criar grupo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrupo = async (grupo: RateioGrupoComValidacao) => {
    if (!token) return;
    if (!confirm(`Excluir grupo "${grupo.nome}" e todos os seus destinos?`)) return;

    try {
      await rateios.excluir(token, grupo.id);
      await carregarDados();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir grupo");
    }
  };

  const openAddDestino = (grupo: RateioGrupoComValidacao) => {
    setGrupoSelecionado(grupo);
    setNovoDestino({ cc_destino_id: "", percentual: 0 });
    setShowAddDestinoModal(true);
  };

  const handleAddDestino = async () => {
    if (!token || !grupoSelecionado || !novoDestino.cc_destino_id) return;

    setSaving(true);
    try {
      await rateios.adicionarDestino(token, grupoSelecionado.id, {
        cc_destino_id: novoDestino.cc_destino_id,
        percentual: novoDestino.percentual,
      });
      await carregarDados();
      setShowAddDestinoModal(false);
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar destino");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePercentual = async (grupoId: string, destinoId: string, percentual: number) => {
    if (!token) return;

    try {
      await rateios.atualizarDestino(token, grupoId, destinoId, percentual);
      await carregarDados();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar percentual");
    }
  };

  const handleDeleteDestino = async (grupoId: string, destinoId: string) => {
    if (!token) return;

    try {
      await rateios.removerDestino(token, grupoId, destinoId);
      await carregarDados();
    } catch (err: any) {
      alert(err.message || "Erro ao remover destino");
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-orange-600" />
              Configuração de Rateios
            </CardTitle>
            <CardDescription>
              Distribua custos de CCs POOL para CCs OPERACIONAIS
            </CardDescription>
          </div>
          <Button
            size="xs"
            onClick={() => setShowCreateModal(true)}
            disabled={poolsDisponiveis.length === 0}
          >
            <Plus className="h-3 w-3 mr-1" />
            Novo Grupo
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {grupos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum grupo de rateio configurado</p>
            <p className="text-xs mt-1">
              Crie grupos para distribuir custos de CCs POOL para CCs OPERACIONAIS
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className={cn(
                  "border rounded-lg p-4",
                  grupo.is_valido ? "border-green-200 bg-green-50/30" : "border-orange-200 bg-orange-50/30"
                )}
              >
                {/* Header do Grupo */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-sm">{grupo.nome}</h4>
                      <p className="text-xs text-muted-foreground">
                        Origem: {grupo.cc_origem?.codigo} - {grupo.cc_origem?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {grupo.is_valido ? (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        100%
                      </Badge>
                    ) : (
                      <Badge variant="alert" className="text-[10px]">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {grupo.percentual_total.toFixed(1)}%
                      </Badge>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteGrupo(grupo)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Destinos */}
                <div className="ml-6 space-y-2">
                  {grupo.destinos.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhum destino configurado
                    </p>
                  ) : (
                    grupo.destinos.map((destino) => (
                      <div
                        key={destino.id}
                        className="flex items-center gap-2 text-xs bg-white/50 rounded px-2 py-1"
                      >
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1">
                          {destino.cc_destino?.codigo} - {destino.cc_destino?.nome}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={destino.percentual}
                          onChange={(e) =>
                            handleUpdatePercentual(grupo.id, destino.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 h-6 text-xs text-right"
                        />
                        <span className="text-muted-foreground">%</span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="h-5 w-5 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteDestino(grupo.id, destino.id)}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    className="text-xs mt-2"
                    onClick={() => openAddDestino(grupo)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Destino
                  </Button>
                </div>

                {/* Mensagem de validação */}
                {!grupo.is_valido && grupo.mensagem_validacao && (
                  <p className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {grupo.mensagem_validacao}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal: Criar Grupo */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Grupo de Rateio</DialogTitle>
            <DialogDescription>
              Crie um grupo para distribuir custos de um CC POOL para CCs OPERACIONAIS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do Grupo *
              </Label>
              <Input
                value={novoGrupo.nome}
                onChange={(e) => setNovoGrupo({ ...novoGrupo, nome: e.target.value })}
                placeholder="Ex: Rateio Financeiro"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CC Origem (POOL) *
              </Label>
              <Select
                value={novoGrupo.cc_origem_pool_id}
                onValueChange={(v) => setNovoGrupo({ ...novoGrupo, cc_origem_pool_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um CC POOL..." />
                </SelectTrigger>
                <SelectContent>
                  {poolsDisponiveis.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.codigo} - {cc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descrição
              </Label>
              <Input
                value={novoGrupo.descricao}
                onChange={(e) => setNovoGrupo({ ...novoGrupo, descricao: e.target.value })}
                placeholder="Descrição opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateGrupo}
              disabled={!novoGrupo.nome || !novoGrupo.cc_origem_pool_id || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Destino */}
      <Dialog open={showAddDestinoModal} onOpenChange={setShowAddDestinoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Destino</DialogTitle>
            <DialogDescription>
              Adicione um CC OPERACIONAL como destino do rateio "{grupoSelecionado?.nome}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CC Destino (OPERACIONAL) *
              </Label>
              <Select
                value={novoDestino.cc_destino_id}
                onValueChange={(v) => setNovoDestino({ ...novoDestino, cc_destino_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um CC OPERACIONAL..." />
                </SelectTrigger>
                <SelectContent>
                  {operacionaisDisponiveis
                    .filter(
                      (cc) =>
                        !grupoSelecionado?.destinos.some((d) => d.cc_destino_id === cc.id)
                    )
                    .map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.codigo} - {cc.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Percentual (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={novoDestino.percentual}
                onChange={(e) =>
                  setNovoDestino({ ...novoDestino, percentual: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Restante disponível:{" "}
                {(100 - (grupoSelecionado?.percentual_total || 0)).toFixed(1)}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDestinoModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddDestino}
              disabled={!novoDestino.cc_destino_id || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

