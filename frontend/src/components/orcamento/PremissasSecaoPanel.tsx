"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Building2, Users, Briefcase, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { CenarioEmpresa, CenarioCliente, CenarioSecao, Premissa } from "@/lib/api/orcamento";
import { useAuthStore } from "@/stores/auth-store";

// ============================================
// Tipos
// ============================================

interface PremissasSecaoPanelProps {
  cenarioId: string;
  empresa: CenarioEmpresa;
  cliente: CenarioCliente;
  secao: CenarioSecao;
  premissaGeral?: Premissa;
  onPremissaUpdate?: () => void;
  anoInicio: number;
  mesInicio: number;
  anoFim: number;
  mesFim: number;
}

// ============================================
// Componente Principal
// ============================================

export function PremissasSecaoPanel({
  cenarioId,
  empresa,
  cliente,
  secao,
  premissaGeral,
  onPremissaUpdate,
  anoInicio,
  mesInicio,
  anoFim,
  mesFim,
}: PremissasSecaoPanelProps) {
  const { accessToken: token } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [premissa, setPremissa] = useState<Partial<Premissa>>({
    absenteismo: premissaGeral?.absenteismo || 3.0,
    abs_pct_justificado: premissaGeral?.abs_pct_justificado || 75,
    turnover: premissaGeral?.turnover || 5.0,
    ferias_indice: premissaGeral?.ferias_indice || 8.33,
    dias_treinamento: premissaGeral?.dias_treinamento || 15,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Atualizar quando premissaGeral mudar
  useEffect(() => {
    if (premissaGeral) {
      setPremissa({
        absenteismo: premissaGeral.absenteismo,
        abs_pct_justificado: premissaGeral.abs_pct_justificado || 75,
        turnover: premissaGeral.turnover,
        ferias_indice: premissaGeral.ferias_indice,
        dias_treinamento: premissaGeral.dias_treinamento,
      });
      setHasChanges(false);
    }
  }, [premissaGeral]);

  // Atualizar campo de premissa
  const handleUpdateField = (field: keyof Premissa, value: number) => {
    setPremissa(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Salvar premissas (atualiza a premissa geral do cenário)
  const handleSave = async () => {
    if (!premissaGeral?.id) {
      toast.error("Premissa geral não encontrada");
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/api/v1/orcamento/cenarios/${cenarioId}/premissas/${premissaGeral.id}`, {
        absenteismo: premissa.absenteismo,
        abs_pct_justificado: premissa.abs_pct_justificado,
        turnover: premissa.turnover,
        ferias_indice: premissa.ferias_indice,
        dias_treinamento: premissa.dias_treinamento,
      }, token || undefined);

      toast.success("Premissas salvas com sucesso!");
      setHasChanges(false);
      onPremissaUpdate?.();
    } catch (error) {
      console.error("Erro ao salvar premissas:", error);
      toast.error("Erro ao salvar premissas");
    } finally {
      setSaving(false);
    }
  };

  // Calcular valores derivados
  const absJustificado = ((premissa.absenteismo || 0) * (premissa.abs_pct_justificado || 75) / 100).toFixed(2);
  const absInjustificado = ((premissa.absenteismo || 0) * (100 - (premissa.abs_pct_justificado || 75)) / 100).toFixed(2);

  // Calcular fatores
  const fatorAbs = 1 / Math.max(0.01, 1 - (premissa.absenteismo || 0) / 100);
  const fatorFerias = 1 / Math.max(0.01, 1 - (premissa.ferias_indice || 0) / 100);
  const fatorTO = 1 / Math.max(0.01, 1 - ((premissa.turnover || 0) / 100) * ((premissa.dias_treinamento || 15) / 30));
  const fatorTotal = fatorAbs * fatorFerias * fatorTO;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{empresa.empresa?.nome_fantasia || empresa.empresa?.razao_social || 'Empresa'}</span>
              <span className="text-muted-foreground/50">/</span>
              <Users className="h-3 w-3" />
              <span>{cliente.nome_cliente || cliente.cliente_nw_codigo}</span>
              <span className="text-muted-foreground/50">/</span>
              <Briefcase className="h-3 w-3" />
              <span className="font-medium text-foreground">{secao.secao?.nome || 'Seção'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Alterações não salvas
              </Badge>
            )}
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6 max-w-4xl">
          
          {/* Alerta informativo */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              As premissas definidas aqui são aplicadas a <strong>todo o cenário</strong>. 
              Os valores serão usados para calcular o <strong>HC na Folha</strong> no Capacity Planning de todas as seções.
            </AlertDescription>
          </Alert>

          {/* Card: Índices de Ineficiência */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Índices de Ineficiência</CardTitle>
              <CardDescription>
                Define os percentuais de absenteísmo, turnover e férias para cálculo do HC na Folha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Absenteísmo Total */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Absenteísmo Total (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={premissa.absenteismo || 0}
                    onChange={(e) => handleUpdateField('absenteismo', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>

                {/* % Justificado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    % Justificado (do ABS)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={premissa.abs_pct_justificado || 75}
                    onChange={(e) => handleUpdateField('abs_pct_justificado', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Just: {absJustificado}% | Injust: {absInjustificado}%
                  </p>
                </div>

                {/* Turnover */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Turnover (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={premissa.turnover || 0}
                    onChange={(e) => handleUpdateField('turnover', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>

                {/* Férias */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Férias (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={premissa.ferias_indice || 0}
                    onChange={(e) => handleUpdateField('ferias_indice', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Treinamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Treinamento</CardTitle>
              <CardDescription>
                Define os dias de treinamento para novos funcionários (impacta no cálculo de turnover)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Dias de Treinamento
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    value={premissa.dias_treinamento || 15}
                    onChange={(e) => handleUpdateField('dias_treinamento', parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Período médio para capacitação de novos colaboradores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Resumo do Cálculo */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-800">Resumo do Cálculo de HC na Folha</CardTitle>
              <CardDescription className="text-blue-600">
                Fórmula: HC_Folha = HC_Operando × Fator_ABS × Fator_Férias × Fator_TO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">Fator ABS</div>
                  <div className="text-lg font-mono font-semibold text-blue-800">
                    {fatorAbs.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-blue-500">1 / (1 - {premissa.absenteismo || 0}%)</div>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">Fator Férias</div>
                  <div className="text-lg font-mono font-semibold text-blue-800">
                    {fatorFerias.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-blue-500">1 / (1 - {premissa.ferias_indice || 0}%)</div>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">Fator TO</div>
                  <div className="text-lg font-mono font-semibold text-blue-800">
                    {fatorTO.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-blue-500">1 / (1 - {premissa.turnover || 0}% × {((premissa.dias_treinamento || 15) / 30).toFixed(2)})</div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-blue-300">
                  <div className="text-xs text-blue-600 mb-1">Fator Total</div>
                  <div className="text-lg font-mono font-bold text-blue-900">
                    {fatorTotal.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-blue-500">
                    Ex: Se HC Operando = 100, HC Folha = {(100 * fatorTotal).toFixed(0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
