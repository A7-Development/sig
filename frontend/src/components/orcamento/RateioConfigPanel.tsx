"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Settings2,
  Loader2,
  Building2,
  ArrowRight,
  Users,
  Ruler,
  Monitor,
  Percent,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  rateios,
  centrosCustoApi,
  type RateioGrupoComValidacao,
  type CentroCusto,
  type TipoRateio,
} from "@/lib/api/orcamento";
import { cn } from "@/lib/utils";

// ============================================
// Tipos
// ============================================

interface RateioConfigPanelProps {
  cenarioId: string;
  onScenarioChange?: () => void;
}

interface PoolComConfig {
  pool: CentroCusto;
  config: RateioGrupoComValidacao | null;
}

// ============================================
// Componente Principal
// ============================================

export function RateioConfigPanel({ cenarioId, onScenarioChange }: RateioConfigPanelProps) {
  const { accessToken: token } = useAuthStore();

  // Estado principal
  const [pools, setPools] = useState<PoolComConfig[]>([]);
  const [ccsOperacionais, setCcsOperacionais] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de configuração
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [poolSelecionado, setPoolSelecionado] = useState<PoolComConfig | null>(null);
  const [configForm, setConfigForm] = useState<{
    tipo_rateio: TipoRateio;
    destinos: { cc_id: string; percentual: number; selecionado: boolean }[];
  }>({ tipo_rateio: "MANUAL", destinos: [] });
  const [saving, setSaving] = useState(false);

  // ============================================
  // Carregar dados
  // ============================================

  const carregarDados = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Carregar todos os CCs
      const todosCCs = await centrosCustoApi.listar(token, { ativo: true });
      
      // Separar POOLs e operacionais
      const poolsCCs = todosCCs.filter(cc => cc.tipo === "POOL");
      const operacionais = todosCCs.filter(cc => cc.tipo !== "POOL");
      setCcsOperacionais(operacionais);

      // Carregar configurações de rateio existentes
      const configsExistentes = await rateios.listar(token, cenarioId, false);

      // Montar lista de pools com suas configs
      const poolsComConfig: PoolComConfig[] = poolsCCs.map(pool => {
        const config = configsExistentes.find(c => c.cc_origem_pool_id === pool.id) || null;
        return { pool, config };
      });

      setPools(poolsComConfig);
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

  const abrirConfiguracao = (poolItem: PoolComConfig) => {
    setPoolSelecionado(poolItem);
    
    // Preparar formulário com dados existentes ou padrão
    if (poolItem.config) {
      setConfigForm({
        tipo_rateio: poolItem.config.tipo_rateio || "MANUAL",
        destinos: ccsOperacionais.map(cc => {
          const destinoExistente = poolItem.config?.destinos.find(d => d.cc_destino_id === cc.id);
          return {
            cc_id: cc.id,
            percentual: destinoExistente ? destinoExistente.percentual : 0,
            selecionado: !!destinoExistente,
          };
        }),
      });
    } else {
      setConfigForm({
        tipo_rateio: "MANUAL",
        destinos: ccsOperacionais.map(cc => ({
          cc_id: cc.id,
          percentual: 0,
          selecionado: false,
        })),
      });
    }
    
    setShowConfigModal(true);
  };

  const salvarConfiguracao = async () => {
    if (!token || !poolSelecionado) return;

    const destinosSelecionados = configForm.destinos.filter(d => d.selecionado);
    if (destinosSelecionados.length === 0) {
      alert("Selecione pelo menos um CC destino");
      return;
    }

    // Para rateio manual, validar percentuais
    if (configForm.tipo_rateio === "MANUAL") {
      const totalPct = destinosSelecionados.reduce((sum, d) => sum + d.percentual, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        alert(`Os percentuais devem somar 100%. Atual: ${totalPct.toFixed(2)}%`);
        return;
      }
    }

    setSaving(true);
    try {
      if (poolSelecionado.config) {
        // Atualizar configuração existente
        await rateios.atualizar(token, poolSelecionado.config.id, {
          tipo_rateio: configForm.tipo_rateio,
        });
        
        // Remover destinos antigos e adicionar novos
        for (const destino of poolSelecionado.config.destinos) {
          await rateios.removerDestino(token, poolSelecionado.config.id, destino.id);
        }
        
        for (const destino of destinosSelecionados) {
          await rateios.adicionarDestino(token, poolSelecionado.config.id, {
            cc_destino_id: destino.cc_id,
            percentual: configForm.tipo_rateio === "MANUAL" ? destino.percentual : 0,
          });
        }
      } else {
        // Criar nova configuração
        await rateios.criar(token, cenarioId, {
          cc_origem_pool_id: poolSelecionado.pool.id,
          nome: `Rateio ${poolSelecionado.pool.nome}`,
          tipo_rateio: configForm.tipo_rateio,
          ativo: true,
          destinos: destinosSelecionados.map(d => ({
            cc_destino_id: d.cc_id,
            percentual: configForm.tipo_rateio === "MANUAL" ? d.percentual : 0,
          })),
        });
      }

      await carregarDados();
      setShowConfigModal(false);
      onScenarioChange?.();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const toggleDestino = (ccId: string) => {
    setConfigForm(prev => ({
      ...prev,
      destinos: prev.destinos.map(d =>
        d.cc_id === ccId ? { ...d, selecionado: !d.selecionado } : d
      ),
    }));
  };

  const setPercentual = (ccId: string, valor: number) => {
    setConfigForm(prev => ({
      ...prev,
      destinos: prev.destinos.map(d =>
        d.cc_id === ccId ? { ...d, percentual: valor } : d
      ),
    }));
  };

  const selecionarTodos = () => {
    setConfigForm(prev => ({
      ...prev,
      destinos: prev.destinos.map(d => ({ ...d, selecionado: true })),
    }));
  };

  const distribuirIgualmente = () => {
    const selecionados = configForm.destinos.filter(d => d.selecionado);
    if (selecionados.length === 0) return;
    const pctCada = 100 / selecionados.length;
    setConfigForm(prev => ({
      ...prev,
      destinos: prev.destinos.map(d =>
        d.selecionado ? { ...d, percentual: Math.round(pctCada * 100) / 100 } : d
      ),
    }));
  };

  // ============================================
  // Cálculos
  // ============================================

  const totalPercentual = useMemo(() => {
    return configForm.destinos
      .filter(d => d.selecionado)
      .reduce((sum, d) => sum + d.percentual, 0);
  }, [configForm.destinos]);

  const destinosSelecionadosCount = useMemo(() => {
    return configForm.destinos.filter(d => d.selecionado).length;
  }, [configForm.destinos]);

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTipoRateioIcon = (tipo: TipoRateio | undefined) => {
    switch (tipo) {
      case "HC": return <Users className="h-4 w-4" />;
      case "AREA": return <Ruler className="h-4 w-4" />;
      case "PA": return <Monitor className="h-4 w-4" />;
      default: return <Percent className="h-4 w-4" />;
    }
  };

  const getTipoRateioLabel = (tipo: TipoRateio | undefined) => {
    switch (tipo) {
      case "HC": return "Por HC";
      case "AREA": return "Por Área";
      case "PA": return "Por PA";
      default: return "Manual";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-purple-600" />
            Configuração de Rateio
          </CardTitle>
          <CardDescription>
            Configure como os custos de cada Centro de Custo POOL serão distribuídos para os CCs operacionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Nenhum CC POOL cadastrado</h3>
              <p className="text-sm max-w-md mx-auto">
                Crie um Centro de Custo do tipo POOL em Cadastros → Centros de Custo para configurar rateios
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map(({ pool, config }) => (
                <div
                  key={pool.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    config
                      ? config.is_valido
                        ? "border-green-200 bg-green-50/30"
                        : "border-orange-200 bg-orange-50/30"
                      : "border-gray-200 bg-gray-50/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{pool.nome}</h4>
                      <p className="text-xs text-muted-foreground">{pool.codigo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {config ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          {getTipoRateioIcon(config.tipo_rateio)}
                          <span className="text-muted-foreground">
                            {getTipoRateioLabel(config.tipo_rateio)}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {config.destinos.length} destino{config.destinos.length !== 1 ? "s" : ""}
                        </Badge>
                        {config.tipo_rateio === "MANUAL" && (
                          config.is_valido ? (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              100%
                            </Badge>
                          ) : (
                            <Badge variant="alert" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {config.percentual_total.toFixed(1)}%
                            </Badge>
                          )
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Não configurado
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirConfiguracao({ pool, config })}
                    >
                      <Settings2 className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Configuração */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar Rateio</DialogTitle>
            <DialogDescription>
              {poolSelecionado?.pool.nome} ({poolSelecionado?.pool.codigo})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-6 py-4">
            {/* Tipo de Rateio */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Critério de Distribuição
              </Label>
              <Select
                value={configForm.tipo_rateio}
                onValueChange={(v) => setConfigForm({ ...configForm, tipo_rateio: v as TipoRateio })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      <span>Manual (definir percentuais)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="HC">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Proporcional ao Headcount</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="AREA">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      <span>Proporcional à Área (m²)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PA">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Proporcional às PAs</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {configForm.tipo_rateio === "MANUAL" && "Você definirá os percentuais manualmente para cada CC destino."}
                {configForm.tipo_rateio === "HC" && "Distribuição automática baseada no headcount de cada CC."}
                {configForm.tipo_rateio === "AREA" && "Distribuição automática baseada na área (m²) de cada CC."}
                {configForm.tipo_rateio === "PA" && "Distribuição automática baseada nas posições de atendimento."}
              </p>
            </div>

            {/* Destinos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CCs Destino ({destinosSelecionadosCount} selecionado{destinosSelecionadosCount !== 1 ? "s" : ""})
                </Label>
                <div className="flex gap-2">
                  <Button size="xs" variant="outline" onClick={selecionarTodos}>
                    Selecionar Todos
                  </Button>
                  {configForm.tipo_rateio === "MANUAL" && destinosSelecionadosCount > 0 && (
                    <Button size="xs" variant="outline" onClick={distribuirIgualmente}>
                      Distribuir Igual
                    </Button>
                  )}
                </div>
              </div>

              <div className="border rounded-lg max-h-64 overflow-auto">
                {ccsOperacionais.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum CC operacional disponível
                  </div>
                ) : (
                  <div className="divide-y">
                    {ccsOperacionais.map(cc => {
                      const destino = configForm.destinos.find(d => d.cc_id === cc.id);
                      const selecionado = destino?.selecionado || false;
                      const percentual = destino?.percentual || 0;

                      return (
                        <div
                          key={cc.id}
                          className={cn(
                            "flex items-center gap-3 p-3 hover:bg-muted/50",
                            selecionado && "bg-orange-50/50"
                          )}
                        >
                          <Checkbox
                            checked={selecionado}
                            onCheckedChange={() => toggleDestino(cc.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cc.nome}</p>
                            <p className="text-xs text-muted-foreground">{cc.codigo}</p>
                          </div>
                          {configForm.tipo_rateio === "MANUAL" && selecionado && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={percentual}
                                onChange={(e) => setPercentual(cc.id, parseFloat(e.target.value) || 0)}
                                className="w-20 h-8 text-right"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {configForm.tipo_rateio === "MANUAL" && destinosSelecionadosCount > 0 && (
                <div className={cn(
                  "flex items-center justify-between p-2 rounded-lg text-sm",
                  Math.abs(totalPercentual - 100) <= 0.01
                    ? "bg-green-50 text-green-700"
                    : "bg-orange-50 text-orange-700"
                )}>
                  <span>Total:</span>
                  <span className="font-semibold">{totalPercentual.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarConfiguracao}
              disabled={saving || destinosSelecionadosCount === 0}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
