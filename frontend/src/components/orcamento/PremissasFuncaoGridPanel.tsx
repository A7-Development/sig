"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Building2, Users, Briefcase, User, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import type { CenarioEmpresa, CenarioCliente, CenarioSecao, QuadroPessoal, Funcao, PremissaFuncaoMes } from "@/lib/api/orcamento";

// ============================================
// Tipos
// ============================================

interface PremissasFuncaoGridPanelProps {
  cenarioId: string;
  empresa: CenarioEmpresa;
  cliente: CenarioCliente;
  secao: CenarioSecao;
  funcao: Funcao;
  quadroItem: QuadroPessoal;
  anoInicio: number;
  mesInicio: number;
  anoFim: number;
  mesFim: number;
}

interface PremissaMes {
  mes: number;
  ano: number;
  absenteismo: number;
  abs_pct_justificado: number;
  turnover: number;
  ferias_indice: number;
  dias_treinamento: number;
  id?: string;
}

const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const INDICADORES = [
  { key: 'absenteismo', label: 'Absenteísmo (%)', step: 0.1, max: 100 },
  { key: 'abs_pct_justificado', label: '% Justificado', step: 1, max: 100 },
  { key: 'turnover', label: 'Turnover (%)', step: 0.1, max: 100 },
  { key: 'ferias_indice', label: 'Férias (%)', step: 0.01, max: 100 },
  { key: 'dias_treinamento', label: 'Dias Treinamento', step: 1, max: 180 },
] as const;

// ============================================
// Componente Principal
// ============================================

export function PremissasFuncaoGridPanel({
  cenarioId,
  empresa,
  cliente,
  secao,
  funcao,
  quadroItem,
  anoInicio,
  mesInicio,
  anoFim,
  mesFim,
}: PremissasFuncaoGridPanelProps) {
  const { accessToken: token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [premissas, setPremissas] = useState<PremissaMes[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<{ indicador: string; mesIndex: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gerar lista de meses do período
  const mesesPeriodo = useCallback(() => {
    const meses: { mes: number; ano: number; label: string }[] = [];
    let ano = anoInicio;
    let mes = mesInicio;
    
    while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
      meses.push({ 
        mes, 
        ano, 
        label: `${MESES_LABELS[mes - 1]}/${String(ano).slice(2)}`
      });
      mes++;
      if (mes > 12) {
        mes = 1;
        ano++;
      }
    }
    return meses;
  }, [anoInicio, mesInicio, anoFim, mesFim]);

  // Carregar premissas existentes
  const carregarPremissas = useCallback(async () => {
    if (!cenarioId || !token) return;
    
    setLoading(true);
    try {
      const res = await api.get<PremissaFuncaoMes[]>(
        `/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao?funcao_id=${funcao.id}&cenario_secao_id=${secao.id}`,
        token
      );
      
      const premissasExistentes = res || [];
      
      // Debug: Verificar se as premissas pertencem ao cenário correto
      if (premissasExistentes.length > 0) {
        const premissaErrada = premissasExistentes.find(p => p.cenario_id !== cenarioId);
        if (premissaErrada) {
          console.error('⚠️ PREMISSA DE OUTRO CENÁRIO DETECTADA!', {
            premissaCenarioId: premissaErrada.cenario_id,
            cenarioAtual: cenarioId,
            funcaoId: funcao.id,
            secaoId: secao.id
          });
        }
      }
      
      const meses = mesesPeriodo();
      
      // Mapear premissas existentes ou criar com valores padrão
      const premissasMapeadas: PremissaMes[] = meses.map(m => {
        const existente = premissasExistentes.find(p => p.mes === m.mes && p.ano === m.ano);
        if (existente) {
          return {
            mes: m.mes,
            ano: m.ano,
            absenteismo: existente.absenteismo ?? 0,
            abs_pct_justificado: existente.abs_pct_justificado ?? 0,
            turnover: existente.turnover ?? 0,
            ferias_indice: existente.ferias_indice ?? 0,
            dias_treinamento: existente.dias_treinamento ?? 0,
            id: existente.id,
          };
        }
        // Valores padrão zerados - usuário deve preencher
        return {
          mes: m.mes,
          ano: m.ano,
          absenteismo: 0,
          abs_pct_justificado: 0,
          turnover: 0,
          ferias_indice: 0,
          dias_treinamento: 0,
        };
      });
      
      setPremissas(premissasMapeadas);
      setHasChanges(false);
    } catch (error) {
      console.error("Erro ao carregar premissas:", error);
      toast.error("Erro ao carregar premissas da função");
    } finally {
      setLoading(false);
    }
  }, [cenarioId, token, funcao.id, secao.id, mesesPeriodo]);

  useEffect(() => {
    carregarPremissas();
  }, [carregarPremissas]);

  // Focus no input quando editando
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Atualizar valor
  const handleUpdateValue = (mesIndex: number, indicador: string, value: number) => {
    setPremissas(prev => {
      const newPremissas = [...prev];
      (newPremissas[mesIndex] as any)[indicador] = value;
      return newPremissas;
    });
    setHasChanges(true);
  };

  // Copiar valor do primeiro mês para todos
  const handleCopiarPrimeiroMes = () => {
    if (premissas.length === 0) return;
    
    const primeiro = premissas[0];
    setPremissas(prev => prev.map(p => ({
      ...p,
      absenteismo: primeiro.absenteismo,
      abs_pct_justificado: primeiro.abs_pct_justificado,
      turnover: primeiro.turnover,
      ferias_indice: primeiro.ferias_indice,
      dias_treinamento: primeiro.dias_treinamento,
    })));
    setHasChanges(true);
    toast.info("Valores do primeiro mês copiados para todos");
  };

  // Salvar premissas
  const handleSave = async () => {
    setSaving(true);
    try {
      // Preparar dados para bulk update
      const premissasParaSalvar = premissas.map(p => ({
        cenario_id: cenarioId,
        cenario_secao_id: secao.id,
        funcao_id: funcao.id,
        mes: p.mes,
        ano: p.ano,
        absenteismo: p.absenteismo,
        abs_pct_justificado: p.abs_pct_justificado,
        turnover: p.turnover,
        ferias_indice: p.ferias_indice,
        dias_treinamento: p.dias_treinamento,
      }));

      await api.post(
        `/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao/bulk`,
        premissasParaSalvar,
        token || undefined
      );

      toast.success("Premissas salvas com sucesso!");
      setHasChanges(false);
      carregarPremissas();
    } catch (error) {
      console.error("Erro ao salvar premissas:", error);
      toast.error("Erro ao salvar premissas");
    } finally {
      setSaving(false);
    }
  };

  // Calcular fator médio
  const calcularFatorMedio = () => {
    if (premissas.length === 0) return 1;
    
    const fatores = premissas.map(p => {
      const fatorAbs = 1 / Math.max(0.01, 1 - p.absenteismo / 100);
      const fatorFerias = 1 / Math.max(0.01, 1 - p.ferias_indice / 100);
      const fatorTO = 1 / Math.max(0.01, 1 - (p.turnover / 100) * (p.dias_treinamento / 30));
      return fatorAbs * fatorFerias * fatorTO;
    });
    
    return fatores.reduce((a, b) => a + b, 0) / fatores.length;
  };

  const meses = mesesPeriodo();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{empresa.empresa?.nome_fantasia?.slice(0, 10) || '...'}</span>
              <span>/</span>
              <Users className="h-3 w-3" />
              <span>{cliente.nome_cliente?.slice(0, 10) || '...'}</span>
              <span>/</span>
              <Briefcase className="h-3 w-3" />
              <span>{secao.secao?.nome?.slice(0, 10) || '...'}</span>
              <span>/</span>
              <User className="h-3 w-3 text-purple-500" />
              <span className="font-medium text-foreground">{funcao.nome}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Não salvo
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopiarPrimeiroMes}
              disabled={saving}
              title="Copia os valores do primeiro mês para todos os outros"
            >
              <Copy className="h-3 w-3 mr-1" />
              Replicar
            </Button>
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Premissas por Mês</CardTitle>
            <CardDescription className="text-xs">
              Defina os índices de ineficiência para cada mês do período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="sticky left-0 bg-muted/30 z-10 w-32 text-[10px]">
                      Indicador
                    </TableHead>
                    {meses.map((m, idx) => (
                      <TableHead key={idx} className="text-center text-[10px] w-16 px-1">
                        {m.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INDICADORES.map((indicador) => (
                    <TableRow key={indicador.key}>
                      <TableCell className="sticky left-0 bg-background z-10 text-[10px] font-medium">
                        {indicador.label}
                      </TableCell>
                      {premissas.map((p, idx) => (
                        <TableCell 
                          key={idx} 
                          className="text-center p-0.5"
                        >
                          {editingCell?.indicador === indicador.key && editingCell?.mesIndex === idx ? (
                            <Input
                              ref={inputRef}
                              type="number"
                              step={indicador.step}
                              min={0}
                              max={indicador.max}
                              value={(p as any)[indicador.key]}
                              onChange={(e) => handleUpdateValue(idx, indicador.key, parseFloat(e.target.value) || 0)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  // Mover para próxima célula
                                  if (e.key === 'Tab') {
                                    const nextIdx = idx + 1;
                                    if (nextIdx < premissas.length) {
                                      setEditingCell({ indicador: indicador.key, mesIndex: nextIdx });
                                    } else {
                                      setEditingCell(null);
                                    }
                                  } else {
                                    setEditingCell(null);
                                  }
                                }
                                if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="h-6 w-12 text-[10px] text-center p-0 mx-auto"
                            />
                          ) : (
                            <button
                              className="w-full h-6 text-[10px] font-mono hover:bg-muted/50 rounded"
                              onClick={() => setEditingCell({ indicador: indicador.key, mesIndex: idx })}
                            >
                              {indicador.key === 'dias_treinamento' 
                                ? (p as any)[indicador.key]
                                : (p as any)[indicador.key].toFixed(indicador.step < 1 ? 2 : 0)
                              }
                            </button>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Separador */}
                  <TableRow>
                    <TableCell colSpan={meses.length + 1} className="h-2 p-0 bg-muted/20" />
                  </TableRow>
                  
                  {/* Memória de Cálculo - HC por mês */}
                  <TableRow className="bg-blue-50/50">
                    <TableCell className="sticky left-0 bg-blue-50/50 z-10 text-[10px] font-semibold text-blue-700">
                      HC Capacity
                    </TableCell>
                    {premissas.map((p, idx) => {
                      const mesKey = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][p.mes - 1];
                      const hcCapacity = (quadroItem as any)[`qtd_${mesKey}`] || 0;
                      return (
                        <TableCell key={idx} className="text-center text-[10px] font-mono text-blue-700">
                          {hcCapacity.toFixed(0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  
                  <TableRow className="bg-orange-50/50">
                    <TableCell className="sticky left-0 bg-orange-50/50 z-10 text-[10px] font-medium text-orange-700">
                      + HC ABS
                    </TableCell>
                    {premissas.map((p, idx) => {
                      const mesKey = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][p.mes - 1];
                      const hcCapacity = (quadroItem as any)[`qtd_${mesKey}`] || 0;
                      const fatorAbs = 1 / Math.max(0.01, 1 - p.absenteismo / 100);
                      const hcAbs = hcCapacity * (fatorAbs - 1);
                      return (
                        <TableCell key={idx} className="text-center text-[10px] font-mono text-orange-600">
                          {hcAbs.toFixed(0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  
                  <TableRow className="bg-purple-50/50">
                    <TableCell className="sticky left-0 bg-purple-50/50 z-10 text-[10px] font-medium text-purple-700">
                      + HC Férias
                    </TableCell>
                    {premissas.map((p, idx) => {
                      const mesKey = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][p.mes - 1];
                      const hcCapacity = (quadroItem as any)[`qtd_${mesKey}`] || 0;
                      const fatorAbs = 1 / Math.max(0.01, 1 - p.absenteismo / 100);
                      const hcComAbs = hcCapacity * fatorAbs;
                      const fatorFerias = 1 / Math.max(0.01, 1 - p.ferias_indice / 100);
                      const hcFerias = hcComAbs * (fatorFerias - 1);
                      return (
                        <TableCell key={idx} className="text-center text-[10px] font-mono text-purple-600">
                          {hcFerias.toFixed(0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  
                  <TableRow className="bg-green-50/50">
                    <TableCell className="sticky left-0 bg-green-50/50 z-10 text-[10px] font-medium text-green-700">
                      + HC TO
                    </TableCell>
                    {premissas.map((p, idx) => {
                      const mesKey = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][p.mes - 1];
                      const hcCapacity = (quadroItem as any)[`qtd_${mesKey}`] || 0;
                      const fatorAbs = 1 / Math.max(0.01, 1 - p.absenteismo / 100);
                      const fatorFerias = 1 / Math.max(0.01, 1 - p.ferias_indice / 100);
                      const hcComAbsFerias = hcCapacity * fatorAbs * fatorFerias;
                      const fatorTO = 1 / Math.max(0.01, 1 - (p.turnover / 100) * (p.dias_treinamento / 30));
                      const hcTO = hcComAbsFerias * (fatorTO - 1);
                      return (
                        <TableCell key={idx} className="text-center text-[10px] font-mono text-green-600">
                          {hcTO.toFixed(0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  
                  {/* Total HC Folha */}
                  <TableRow className="bg-blue-100">
                    <TableCell className="sticky left-0 bg-blue-100 z-10 text-[10px] font-bold text-blue-800">
                      = HC Folha
                    </TableCell>
                    {premissas.map((p, idx) => {
                      const mesKey = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][p.mes - 1];
                      const hcCapacity = (quadroItem as any)[`qtd_${mesKey}`] || 0;
                      const fatorAbs = 1 / Math.max(0.01, 1 - p.absenteismo / 100);
                      const fatorFerias = 1 / Math.max(0.01, 1 - p.ferias_indice / 100);
                      const fatorTO = 1 / Math.max(0.01, 1 - (p.turnover / 100) * (p.dias_treinamento / 30));
                      const hcFolha = hcCapacity * fatorAbs * fatorFerias * fatorTO;
                      return (
                        <TableCell key={idx} className="text-center text-[10px] font-mono font-bold text-blue-800">
                          {hcFolha.toFixed(0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card className="mt-4 bg-muted/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Fórmula:</span>
                <code className="bg-background px-2 py-1 rounded text-[10px]">
                  HC Folha = HC Capacity ÷ (1-ABS%) ÷ (1-Férias%) ÷ (1-TO%×Fator_Trein)
                </code>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Fator Médio: </span>
                <span className="font-mono font-semibold">{calcularFatorMedio().toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

