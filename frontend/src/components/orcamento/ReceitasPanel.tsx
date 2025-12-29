'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, Pencil, Trash2, DollarSign, TrendingUp, 
  Briefcase, Loader2, Save, Building2, FolderTree, Copy, User, Eye
} from 'lucide-react';
import { EditReceitasModal } from './EditReceitasModal';
import { ViewReceitasModal } from './ViewReceitasModal';
import { Sparkline } from './Sparkline';
import { 
  ReceitaCenario, ReceitaCenarioCreate, ReceitaPremissaMes, 
  TipoReceita, ReceitaCalculada, cenariosApi, receitasCenario
} from '@/lib/api/orcamento';
import { useAuthStore } from '@/stores/auth-store';

interface ReceitasPanelProps {
  cenarioId: string;
  centroCustoId: string;
  centroCustoNome: string;
  centroCustoCodigo?: string;
  secaoNome: string;
  empresaNome?: string;
  mesInicio: number;
  anoInicio: number;
  mesFim: number;
  anoFim: number;
  onScenarioChange?: () => void;
  selectedReceitaId?: string | null;
  onReceitaSelect?: (receitaId: string | null) => void;
  sidebarMode?: boolean; // true = mostra lista na sidebar, false = mostra visão sintética
}

const TIPOS_CALCULO = [
  { value: 'FIXA_CC', label: 'Fixa por CC', desc: 'Valor fixo mensal por Centro de Custo' },
  { value: 'FIXA_HC', label: 'Fixa por HC', desc: 'Valor fixo × Quantidade de HC (requer função)' },
  { value: 'FIXA_PA', label: 'Fixa por PA', desc: 'Valor fixo × Quantidade de PA (requer função)' },
  { value: 'VARIAVEL', label: 'Variável', desc: 'Cálculo com indicadores de vendas (requer função)' },
];

const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Indicadores de receita variável
const INDICADORES_RECEITA = [
  { key: 'vopdu', label: 'VOPDU', desc: 'Venda/Operador/Dia Útil', step: 0.01 },
  { key: 'indice_conversao', label: 'Índice Conversão', desc: '% Conversão', step: 0.0001 },
  { key: 'ticket_medio', label: 'Ticket Médio', desc: 'R$ por venda', step: 0.01 },
  { key: 'fator', label: 'Fator', desc: 'Multiplicador', step: 0.01 },
  { key: 'indice_estorno', label: '% Estorno', desc: 'Cancelamentos (0-100%)', step: 0.01 },
] as const;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatCurrencyNoCents = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export function ReceitasPanel({ 
  cenarioId, 
  centroCustoId,
  centroCustoNome,
  centroCustoCodigo,
  secaoNome,
  empresaNome,
  mesInicio,
  anoInicio,
  mesFim,
  anoFim,
  onScenarioChange,
  selectedReceitaId,
  onReceitaSelect,
  sidebarMode = false,
}: ReceitasPanelProps) {
  const { accessToken: token } = useAuthStore();
  
  // Estado do modal
  const [showAddReceita, setShowAddReceita] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaCenario | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ReceitaCenario | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Estado da receita selecionada para editar premissas
  const [selectedReceita, setSelectedReceita] = useState<ReceitaCenario | null>(null);
  const [editingPremissas, setEditingPremissas] = useState(false);
  const [viewingReceita, setViewingReceita] = useState(false);
  
  // Formulário de cadastro
  const [formData, setFormData] = useState({
    tipo_receita_id: '',
    tipo_calculo: 'FIXA_CC',
    funcao_pa_id: '',
    valor_fixo: '',
    valor_minimo_pa: '',
    valor_maximo_pa: '',
    descricao: '',
  });
  
  // Estado para premissas variáveis
  interface PremissaMes {
    mes: number;
    ano: number;
    vopdu: number;
    indice_conversao: number;
    ticket_medio: number;
    fator: number;
    indice_estorno: number;
  }
  const [premissas, setPremissas] = useState<PremissaMes[]>([]);
  

  // Gerar lista de meses do cenário
  const mesesPeriodo = useMemo(() => {
    const meses: { ano: number; mes: number; label: string }[] = [];
    let ano = anoInicio;
    let mes = mesInicio;
    while ((ano < anoFim) || (ano === anoFim && mes <= mesFim)) {
      meses.push({ 
        ano, 
        mes, 
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

  // Buscar receitas do CC selecionado
  const { data: receitas = [], isLoading: loadingReceitas, refetch: refetchReceitas } = useQuery<ReceitaCenario[]>({
    queryKey: ['receitas-cenario', cenarioId, centroCustoId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('centro_custo_id', centroCustoId);
      return await api.get<ReceitaCenario[]>(`/api/v1/orcamento/receitas/cenarios/${cenarioId}?${params}`, token || undefined);
    },
    enabled: !!centroCustoId && !!token,
  });

  // Sincronizar selectedReceita com selectedReceitaId (prop)
  useEffect(() => {
    if (selectedReceitaId) {
      const receita = receitas.find(r => r.id === selectedReceitaId);
      setSelectedReceita(receita || null);
    } else {
      setSelectedReceita(null);
    }
  }, [selectedReceitaId, receitas]);

  // Buscar tipos de receita
  const { data: tiposReceita = [] } = useQuery<TipoReceita[]>({
    queryKey: ['tipos-receita-ativos'],
    queryFn: async () => {
      return await api.get<TipoReceita[]>('/api/v1/orcamento/tipos-receita?ativo=true', token || undefined);
    },
    enabled: !!token,
  });

  // Buscar funções disponíveis no CC
  const { data: funcoes = [] } = useQuery<any[]>({
    queryKey: ['funcoes-cc', cenarioId, centroCustoId],
    queryFn: async () => {
      if (!centroCustoId || !token) return [];
      const quadro = await cenariosApi.getQuadro(token, cenarioId, { centro_custo_id: centroCustoId });
      const funcoesMap = new Map<string, any>();
      quadro.forEach(q => {
        if (q.funcao && !funcoesMap.has(q.funcao.id)) {
          funcoesMap.set(q.funcao.id, q.funcao);
        }
      });
      return Array.from(funcoesMap.values());
    },
    enabled: !!centroCustoId && !!token,
  });

  // Buscar dias úteis de cada mês do período
  const { data: diasUteisData = [] } = useQuery<{ ano: number; mes: number; dias_uteis: number }[]>({
    queryKey: ['dias-uteis', anoInicio, mesInicio, anoFim, mesFim],
    queryFn: async () => {
      return await api.get<{ ano: number; mes: number; dias_uteis: number }[]>(
        `/api/v1/orcamento/receitas/dias-uteis?ano_inicio=${anoInicio}&mes_inicio=${mesInicio}&ano_fim=${anoFim}&mes_fim=${mesFim}`, 
        token || undefined
      );
    },
    enabled: !!token && anoInicio > 0 && anoFim > 0,
    staleTime: 1000 * 60 * 60, // Cache por 1 hora (dias úteis não mudam frequentemente)
  });

  // Calcular dias úteis para exibição (memoizado para evitar loops)
  const diasUteisMapeados = useMemo(() => {
    return mesesPeriodo.map(m => {
      const du = diasUteisData.find(d => d.ano === m.ano && d.mes === m.mes);
      return du?.dias_uteis ?? 22; // Fallback para 22 dias úteis
    });
  }, [mesesPeriodo, diasUteisData]);

  // Buscar valores calculados da receita (apenas para receitas variáveis)
  const { data: receitasCalculadas = [] } = useQuery<ReceitaCalculada[]>({
    queryKey: ['receita-calculada', selectedReceita?.id],
    queryFn: async () => {
      if (!selectedReceita?.id || !token) return [];
      return await receitasCenario.calcular(token, selectedReceita.id);
    },
    enabled: !!selectedReceita?.id && selectedReceita?.tipo_calculo === 'VARIAVEL' && !!token,
  });

  // Carregar premissas quando selecionar uma receita variável
  useEffect(() => {
    if (selectedReceita?.tipo_calculo === 'VARIAVEL') {
      // Inicializar premissas para todos os meses
      const premissasIniciais: PremissaMes[] = mesesPeriodo.map(m => {
        // Buscar valor existente
        const existente = selectedReceita.premissas?.find(
          p => p.mes === m.mes && p.ano === m.ano
        );
        
        return {
          mes: m.mes,
          ano: m.ano,
          vopdu: existente?.vopdu ?? 0,
          indice_conversao: existente?.indice_conversao ?? 0,
          ticket_medio: existente?.ticket_medio ?? 0,
          fator: existente?.fator ?? 1,
          indice_estorno: Number(existente?.indice_estorno ?? 0), // Garantir que seja sempre um número
        };
      });
      
      setPremissas(premissasIniciais);
    }
  }, [selectedReceita, mesesPeriodo]);

  // Reset form
  const resetForm = () => {
    setFormData({
      tipo_receita_id: '',
      tipo_calculo: 'FIXA_CC',
      funcao_pa_id: '',
      valor_fixo: '',
      valor_minimo_pa: '',
      valor_maximo_pa: '',
      descricao: '',
    });
    setEditingReceita(null);
  };

  // Abrir modal para editar
  const handleEdit = (receita: ReceitaCenario) => {
    setFormData({
      tipo_receita_id: receita.tipo_receita_id,
      tipo_calculo: receita.tipo_calculo,
      funcao_pa_id: receita.funcao_pa_id || '',
      valor_fixo: receita.valor_fixo?.toString() || '',
      valor_minimo_pa: receita.valor_minimo_pa?.toString() || '',
      valor_maximo_pa: receita.valor_maximo_pa?.toString() || '',
      descricao: receita.descricao || '',
    });
    setEditingReceita(receita);
    setShowAddReceita(true);
  };

  // Verificar se precisa de função (HC, PA ou Variável)
  const precisaFuncao = formData.tipo_calculo === 'FIXA_HC' || 
                        formData.tipo_calculo === 'FIXA_PA' || 
                        formData.tipo_calculo === 'VARIAVEL';

  // Salvar receita
  const handleSave = async () => {
    if (!formData.tipo_receita_id) {
      toast.error('Selecione um tipo de receita');
      return;
    }
    
    if (precisaFuncao && !formData.funcao_pa_id) {
      toast.error('Selecione a função de referência para este tipo de cálculo');
      return;
    }
    
    if (formData.tipo_calculo !== 'VARIAVEL' && !formData.valor_fixo) {
      toast.error('Informe o valor fixo');
      return;
    }
    
    setSaving(true);
    try {
      const payload: ReceitaCenarioCreate = {
        centro_custo_id: centroCustoId,
        tipo_receita_id: formData.tipo_receita_id,
        tipo_calculo: formData.tipo_calculo as 'FIXA_CC' | 'FIXA_HC' | 'FIXA_PA' | 'VARIAVEL',
        funcao_pa_id: formData.funcao_pa_id || undefined,
        valor_fixo: formData.valor_fixo ? parseFloat(formData.valor_fixo) : undefined,
        valor_minimo_pa: formData.valor_minimo_pa ? parseFloat(formData.valor_minimo_pa) : undefined,
        valor_maximo_pa: formData.valor_maximo_pa ? parseFloat(formData.valor_maximo_pa) : undefined,
        descricao: formData.descricao || undefined,
      };
      
      if (editingReceita) {
        await api.put(`/api/v1/orcamento/receitas/${editingReceita.id}`, payload, token || undefined);
        toast.success('Receita atualizada!');
      } else {
        const novaReceita = await api.post<ReceitaCenario>(`/api/v1/orcamento/receitas/cenarios/${cenarioId}`, payload, token || undefined);
        toast.success('Receita criada!');
        
        // Se for variável, selecionar para editar premissas
        if (formData.tipo_calculo === 'VARIAVEL') {
          await refetchReceitas();
          setSelectedReceita(novaReceita);
        }
      }
      
      await refetchReceitas();
      setShowAddReceita(false);
      resetForm();
      onScenarioChange?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar receita');
    } finally {
      setSaving(false);
    }
  };

  // Salvar premissas via modal
  const handleSaveFromModal = async (premissasSalvas: PremissaMes[]) => {
    if (!selectedReceita || !token) return;
    
    try {
      const premissasData = premissasSalvas.map(p => ({
        mes: p.mes,
        ano: p.ano,
        vopdu: Number(p.vopdu) || 0,
        indice_conversao: Number(p.indice_conversao) || 0,
        ticket_medio: Number(p.ticket_medio) || 0,
        fator: Number(p.fator) || 1,
        indice_estorno: Number(p.indice_estorno) || 0,
      }));
      
      await api.put(`/api/v1/orcamento/receitas/${selectedReceita.id}/premissas`, { premissas: premissasData }, token);
      toast.success('Premissas salvas!');
      await refetchReceitas();
      onScenarioChange?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar premissas');
      throw error;
    }
  };

  // Calcular estatísticas para um indicador
  const calcularStats = (indicadorKey: string) => {
    const valores = premissas.map(p => {
      const valor = (p as any)[indicadorKey] || 0;
      // indice_estorno é armazenado como decimal (0-1), mas exibimos como percentual (0-100)
      return indicadorKey === 'indice_estorno' ? valor * 100 : valor;
    });
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

  // Calcular estatísticas da receita
  const calcularStatsReceita = () => {
    if (!selectedReceita || receitasCalculadas.length === 0) {
      return { media: 0, min: 0, max: 0, valores: [], mesesMin: 0, mesesMax: 0 };
    }
    
    const valores = receitasCalculadas.map(r => r.valor_calculado || 0);
    if (valores.length === 0) return { media: 0, min: 0, max: 0, valores: [], mesesMin: 0, mesesMax: 0 };
    
    const total = valores.reduce((sum, v) => sum + v, 0);
    const media = total / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    
    // Contar meses no mínimo e máximo
    // Se valor_bruto existe e é diferente de valor_calculado, foi limitado
    let mesesMin = 0;
    let mesesMax = 0;
    
    receitasCalculadas.forEach(r => {
      if (r.qtd_pa !== null && r.qtd_pa > 0) {
        const limiteMin = selectedReceita.valor_minimo_pa ? selectedReceita.valor_minimo_pa * r.qtd_pa : null;
        const limiteMax = selectedReceita.valor_maximo_pa ? selectedReceita.valor_maximo_pa * r.qtd_pa : null;
        
        if (r.valor_bruto !== null && r.valor_bruto !== undefined) {
          // Se valor_bruto foi limitado pelo mínimo
          if (limiteMin !== null && limiteMin > 0 && r.valor_bruto < limiteMin) {
            mesesMin++;
          }
          // Se valor_bruto foi limitado pelo máximo
          else if (limiteMax !== null && limiteMax > 0 && r.valor_bruto > limiteMax) {
            mesesMax++;
          }
        }
        // Fallback: verificar se valor_calculado é igual ao limite
        else if (r.valor_calculado > 0) {
          if (limiteMin !== null && limiteMin > 0 && Math.abs(r.valor_calculado - limiteMin) < 1) {
            mesesMin++;
          } else if (limiteMax !== null && limiteMax > 0 && Math.abs(r.valor_calculado - limiteMax) < 1) {
            mesesMax++;
          }
        }
      }
    });
    
    return { media, min, max, valores, mesesMin, mesesMax };
  };

  // Excluir receita
  const handleDelete = async () => {
    if (!selectedForDelete) return;
    
    try {
      await api.delete(`/api/v1/orcamento/receitas/${selectedForDelete.id}`, token || undefined);
      toast.success('Receita excluída!');
      await refetchReceitas();
      setDeleteConfirmOpen(false);
      setSelectedForDelete(null);
      if (selectedReceita?.id === selectedForDelete.id) {
        setSelectedReceita(null);
      }
      if (onReceitaSelect && selectedReceita?.id === selectedForDelete.id) {
        onReceitaSelect(null);
      }
      onScenarioChange?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir receita');
    }
  };

  // Função para renderizar modais (reutilizada em ambos os modos)
  const renderModals = () => (
    <>
      {/* Modal: Adicionar/Editar Receita */}
      <Dialog open={showAddReceita} onOpenChange={(open) => { if (!open) { setShowAddReceita(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-green-600" />
              {editingReceita ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da receita para o Centro de Custo {centroCustoNome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tipo de Receita */}
            <div>
              <Label>Tipo de Receita *</Label>
              <Select
                value={formData.tipo_receita_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_receita_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de receita..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposReceita.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      <span className="font-mono text-xs mr-2">{tipo.codigo}</span>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Cálculo */}
            <div>
              <Label>Tipo de Cálculo *</Label>
              <Select
                value={formData.tipo_calculo}
                onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_calculo: v, funcao_pa_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CALCULO.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {TIPOS_CALCULO.find(t => t.value === formData.tipo_calculo)?.desc}
              </p>
            </div>

            {/* Função de referência */}
            {precisaFuncao && (
              <div>
                <Label>
                  Função de Referência * 
                </Label>
                <Select
                  value={formData.funcao_pa_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, funcao_pa_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoes.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-2">
                        Nenhuma função cadastrada neste CC
                      </div>
                    ) : (
                      funcoes.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          <span className="font-mono text-xs mr-2">{f.codigo}</span>
                          {f.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Para calcular {formData.tipo_calculo === 'FIXA_HC' ? 'quantidade de HC' : formData.tipo_calculo === 'FIXA_PA' ? 'quantidade de PA' : 'produtividade e PA'}
                </p>
              </div>
            )}

            {/* Valor */}
            {formData.tipo_calculo !== 'VARIAVEL' && (
              <div>
                <Label>
                  Valor {formData.tipo_calculo === 'FIXA_CC' ? 'Mensal Fixo' : 'por Unidade'} *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_fixo}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor_fixo: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Mínimo/Máximo por PA (apenas variável) */}
            {formData.tipo_calculo === 'VARIAVEL' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Mínimo por PA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_minimo_pa}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_minimo_pa: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Valor Máximo por PA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_maximo_pa}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_maximo_pa: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Descrição */}
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição da receita..."
              />
            </div>

            {/* Info para variável */}
            {formData.tipo_calculo === 'VARIAVEL' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                <strong>Receita Variável:</strong> Após salvar, selecione a receita na sidebar para preencher as premissas mensais
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddReceita(false); resetForm(); }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir a receita "{selectedForDelete?.tipo_receita?.nome}"? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Modo Sidebar: mostra apenas lista de receitas
  if (sidebarMode) {
    return (
      <>
        <div className="flex flex-col h-full">
          {/* Botão adicionar no header da sidebar */}
          <div className="p-2 border-b">
            <Button 
              size="sm" 
              variant="outline"
              className="w-full"
              onClick={() => { resetForm(); setShowAddReceita(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Receita
            </Button>
          </div>
          
          {/* Lista de receitas */}
          <div className="flex-1 overflow-auto">
            {loadingReceitas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : receitas.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">
                Nenhuma receita cadastrada.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {receitas.map(receita => {
                  const isSelected = selectedReceitaId === receita.id;
                  const isVariavel = receita.tipo_calculo === 'VARIAVEL';
                  
                  return (
                    <div
                      key={receita.id}
                      className={cn(
                        "w-full px-2 py-2 rounded-md text-xs transition-colors",
                        isSelected
                          ? "bg-orange-100 text-orange-700"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <button
                        onClick={() => {
                          if (onReceitaSelect) {
                            onReceitaSelect(isSelected ? null : receita.id);
                          }
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{receita.tipo_receita?.nome || 'Receita'}</span>
                          {isVariavel && (
                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                              Var
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {TIPOS_CALCULO.find(t => t.value === receita.tipo_calculo)?.label}
                        </div>
                        {receita.funcao_pa && (
                          <div className="text-[10px] text-muted-foreground">
                            {receita.funcao_pa.nome}
                          </div>
                        )}
                      </button>
                      <div className="flex items-center justify-end gap-1 mt-1 pt-1 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleEdit(receita); }}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setSelectedForDelete(receita); setDeleteConfirmOpen(true); }}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Modais - renderizados também no modo sidebar */}
        {renderModals()}
      </>
    );
  }

  // Modo Painel Central: mostra apenas visão sintética
  return (
    <Card className="h-full flex flex-col">
      {/* Header igual ao Capacity */}
      <CardHeader className="py-4 px-6 border-b bg-muted/10 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-5 w-5 text-blue-600" />
              {centroCustoNome}
              {centroCustoCodigo && (
                <Badge variant="outline" className="font-mono text-xs">
                  {centroCustoCodigo}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                RECEITAS
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 flex-wrap mt-1">
              {empresaNome && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {empresaNome}
                </span>
              )}
              <span className="flex items-center gap-1 text-green-600">
                <FolderTree className="h-3 w-3" />
                {secaoNome}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Conteúdo: Visão Sintética */}
      <CardContent className="flex-1 overflow-auto p-0">
        {!selectedReceita ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma receita selecionada</p>
            <p className="text-xs mt-1">Selecione uma receita na sidebar para ver a visão sintética</p>
          </div>
        ) : selectedReceita.tipo_calculo !== 'VARIAVEL' ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">{selectedReceita.tipo_receita?.nome}</p>
            <p className="text-xs mt-1">
              Tipo: {TIPOS_CALCULO.find(t => t.value === selectedReceita.tipo_calculo)?.label}
            </p>
            {selectedReceita.valor_fixo && (
              <p className="text-sm font-mono mt-2 text-foreground">
                {formatCurrency(selectedReceita.valor_fixo)}
              </p>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="shrink-0 border-b border-border/50 bg-muted/10 py-3 px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="font-medium text-foreground">{selectedReceita.tipo_receita?.nome}</span>
                <span>/</span>
                <User className="h-3 w-3 text-purple-500" />
                <span className="font-medium text-foreground">{selectedReceita.funcao_pa?.nome || '-'}</span>
                <span className="text-muted-foreground ml-2">
                  (Mín: {formatCurrency(selectedReceita.valor_minimo_pa || 0)} / Máx: {formatCurrency(selectedReceita.valor_maximo_pa || 0)} por PA)
                </span>
              </div>
            </div>

            {/* Visão Sintética - Tabela Resumida */}
            <div className="flex-1 overflow-hidden p-4">
              <Table className="corporate-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px] text-[10px]">Indicador</TableHead>
                        <TableHead className="text-center w-[90px] text-[10px]">Média</TableHead>
                        <TableHead className="text-center w-[90px] text-[10px]">Min</TableHead>
                        <TableHead className="text-center w-[90px] text-[10px]">Max</TableHead>
                        <TableHead className="text-center w-[60px] text-[10px]">Tendência</TableHead>
                        <TableHead className="w-[50px] text-[10px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Linha de Dias Úteis (somente leitura) */}
                      <TableRow className="bg-blue-50/50">
                        <TableCell className="font-medium text-[10px] text-blue-700">
                          Dias Úteis (DU)
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-mono text-blue-700">
                            {(diasUteisMapeados.reduce((sum, du) => sum + du, 0) / diasUteisMapeados.length).toFixed(0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Math.min(...diasUteisMapeados)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Math.max(...diasUteisMapeados)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Sparkline values={diasUteisMapeados} width={40} height={14} />
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      
                      {/* Linha de Receita Calculada */}
                      {(() => {
                        const statsReceita = calcularStatsReceita();
                        const tendenciaReceita = calcularTendencia(statsReceita.valores);
                        return (
                          <TableRow className="bg-green-50/50">
                            <TableCell className="font-medium text-[10px] text-green-700">
                              <div className="flex flex-col gap-0.5">
                                <span>Receita</span>
                                {(statsReceita.mesesMin > 0 || statsReceita.mesesMax > 0) && (
                                  <span className="text-[9px] text-muted-foreground font-normal leading-tight">
                                    {statsReceita.mesesMin > 0 && `Min: ${statsReceita.mesesMin}`}
                                    {statsReceita.mesesMin > 0 && statsReceita.mesesMax > 0 && ' • '}
                                    {statsReceita.mesesMax > 0 && `Max: ${statsReceita.mesesMax}`}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-mono text-green-700 font-semibold">
                                {formatCurrencyNoCents(statsReceita.media)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {formatCurrencyNoCents(statsReceita.min)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {formatCurrencyNoCents(statsReceita.max)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sparkline values={statsReceita.valores} width={40} height={14} />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon-xs"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                                onClick={() => setViewingReceita(true)}
                                title="Visualizar detalhes da receita"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                      
                      {/* Indicadores editáveis */}
                      {INDICADORES_RECEITA.map((indicador) => {
                        const stats = calcularStats(indicador.key);
                        const tendencia = calcularTendencia(stats.valores);
                        const decimal = indicador.key === 'indice_conversao' ? 4 : 
                                       indicador.key === 'ticket_medio' ? 2 : 2;
                        
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
                              <Sparkline values={stats.valores} width={40} height={14} />
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
                {editingPremissas && selectedReceita && (
                  <EditReceitasModal
                    open={editingPremissas}
                    onClose={() => setEditingPremissas(false)}
                    onSave={handleSaveFromModal}
                    receitaNome={selectedReceita.tipo_receita?.nome || ''}
                    funcaoNome={selectedReceita.funcao_pa?.nome || ''}
                    ccCodigo={centroCustoCodigo || ''}
                    ccNome={centroCustoNome}
                    mesesPeriodo={mesesPeriodo.map(m => ({
                      ano: m.ano,
                      mes: m.mes,
                      key: `${m.ano}-${m.mes}`,
                      label: m.label
                    }))}
                    premissasIniciais={premissas}
                    diasUteis={diasUteisMapeados}
                  />
                )}

                {/* Modal de Visualização */}
                {viewingReceita && selectedReceita && (
                  <ViewReceitasModal
                    open={viewingReceita}
                    onClose={() => setViewingReceita(false)}
                    receitaNome={selectedReceita.tipo_receita?.nome || ''}
                    funcaoNome={selectedReceita.funcao_pa?.nome || ''}
                    ccCodigo={centroCustoCodigo || ''}
                    ccNome={centroCustoNome}
                    mesesPeriodo={mesesPeriodo.map(m => ({
                      ano: m.ano,
                      mes: m.mes,
                      key: `${m.ano}-${m.mes}`,
                      label: m.label
                    }))}
                    receitasCalculadas={receitasCalculadas}
                    valorMinimoPa={selectedReceita.valor_minimo_pa}
                    valorMaximoPa={selectedReceita.valor_maximo_pa}
                  />
                )}
              </div>
            )}
          </CardContent>

      {/* Modais - renderizados também no modo painel central */}
      {renderModals()}
    </Card>
  );
}
