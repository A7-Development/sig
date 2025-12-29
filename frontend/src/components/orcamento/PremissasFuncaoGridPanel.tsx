"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Building2, Briefcase, User, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import type { CenarioEmpresa, CenarioCliente, CenarioSecao, QuadroPessoal, Funcao, PremissaFuncaoMes, CentroCusto } from "@/lib/api/orcamento";
import { EditPremissasModal } from "./EditPremissasModal";
import { Sparkline } from "./Sparkline";

// ============================================
// Tipos
// ============================================

interface PremissasFuncaoGridPanelProps {
  cenarioId: string;
  empresa: CenarioEmpresa;
  cliente?: CenarioCliente; // Opcional - mantido para compatibilidade
  secao: CenarioSecao;
  centroCusto?: CentroCusto; // Centro de Custo (nova hierarquia)
  funcao: { id: string; codigo: string; nome: string }; // Tipo resumido do QuadroPessoal.funcao
  quadroItem: QuadroPessoal;
  anoInicio: number;
  mesInicio: number;
  anoFim: number;
  mesFim: number;
  onScenarioChange?: () => void;
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
  // cliente, // Removido - não usado na nova hierarquia
  secao,
  centroCusto,
  funcao,
  quadroItem,
  anoInicio,
  mesInicio,
  anoFim,
  mesFim,
  onScenarioChange,
}: PremissasFuncaoGridPanelProps) {
  const { accessToken: token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [premissas, setPremissas] = useState<PremissaMes[]>([]);
  const [editingPremissas, setEditingPremissas] = useState(false);

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
            dias_treinamento: Math.round(existente.dias_treinamento ?? 0), // Garantir que seja sempre um inteiro
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

  // Salvar premissas via modal
  const handleSaveFromModal = async (premissasSalvas: PremissaMes[]) => {
    if (!token) return;
    
    try {
      // Preparar dados para bulk update
      const premissasParaSalvar = premissasSalvas.map(p => ({
        cenario_id: cenarioId,
        cenario_secao_id: secao.id,
        funcao_id: funcao.id,
        mes: p.mes,
        ano: p.ano,
        absenteismo: p.absenteismo,
        abs_pct_justificado: p.abs_pct_justificado,
        turnover: p.turnover,
        ferias_indice: p.ferias_indice,
        dias_treinamento: Math.round(p.dias_treinamento),
      }));

      await api.post(
        `/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao/bulk`,
        premissasParaSalvar,
        token
      );

      toast.success("Premissas salvas com sucesso!");
      await carregarPremissas();
      onScenarioChange?.();
    } catch (error) {
      console.error("Erro ao salvar premissas:", error);
      toast.error("Erro ao salvar premissas");
      throw error;
    }
  };

  // Calcular estatísticas para um indicador
  const calcularStats = (indicadorKey: string) => {
    const valores = premissas.map(p => (p as any)[indicadorKey] || 0);
    if (valores.length === 0) return { media: 0, min: 0, max: 0, valores: [] };
    
    const total = valores.reduce((sum, v) => sum + v, 0);
    const media = total / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    return { media, min, max, valores };
  };

  // Calcular tendência
  const calcularTendencia = (valores: number[]) => {
    if (valores.length < 2) return "stable";
    const first = valores[0];
    const last = valores[valores.length - 1];
    if (first === 0) return "stable";
    const variation = ((last - first) / first) * 100;
    if (variation > 1) return "up";
    if (variation < -1) return "down";
    return "stable";
  };


  // Gerar meses do período para o modal
  const meses = mesesPeriodo();
  const mesesParaModal = meses.map(m => ({
    ano: m.ano,
    mes: m.mes,
    key: `${m.ano}-${m.mes}`,
    label: `${MESES_LABELS[m.mes - 1]}/${String(m.ano).slice(-2)}`
  }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-muted/10 py-3 px-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Building2 className="h-3 w-3" />
          <span>{empresa.empresa?.nome_fantasia || '...'}</span>
          <span>/</span>
          <Briefcase className="h-3 w-3 text-green-500" />
          <span>{secao.secao?.nome || '...'}</span>
          {centroCusto && (
            <>
              <span>/</span>
              <Briefcase className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-blue-700">{centroCusto.nome || centroCusto.codigo}</span>
            </>
          )}
          <span>/</span>
          <User className="h-3 w-3 text-purple-500" />
          <span className="font-medium text-foreground">{funcao.nome}</span>
        </div>
      </div>

      {/* Visão Sintética - Tabela Resumida */}
      <div className="flex-1 overflow-auto p-4">
        <Table className="corporate-table">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px] text-[10px]">Indicador</TableHead>
              <TableHead className="text-center w-16 text-[10px]">Média</TableHead>
              <TableHead className="text-center w-14 text-[10px]">Min</TableHead>
              <TableHead className="text-center w-14 text-[10px]">Max</TableHead>
              <TableHead className="text-center w-24 text-[10px]">Tendência</TableHead>
              <TableHead className="w-20 text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDICADORES.map((indicador) => {
              const stats = calcularStats(indicador.key);
              const tendencia = calcularTendencia(stats.valores);
              const decimal = indicador.key === 'dias_treinamento' ? 0 : (indicador.step < 1 ? 2 : 0);
              
              return (
                <TableRow key={indicador.key}>
                  <TableCell className="font-medium text-[10px]">
                    {indicador.label}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono">
                      {stats.media.toFixed(decimal)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {stats.min.toFixed(decimal)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {stats.max.toFixed(decimal)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Sparkline values={stats.valores} width={48} height={16} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon-xs"
                      variant="outline"
                      className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      onClick={() => setEditingPremissas(true)}
                      title="Editar premissas"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Edição */}
      {editingPremissas && (
        <EditPremissasModal
          open={editingPremissas}
          onClose={() => setEditingPremissas(false)}
          onSave={handleSaveFromModal}
          funcaoNome={funcao.nome}
          ccCodigo={centroCusto?.codigo || ""}
          ccNome={centroCusto?.nome || ""}
          mesesPeriodo={mesesParaModal}
          premissasIniciais={premissas}
        />
      )}
    </div>
  );
}
