'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Briefcase, Loader2, Save, Building2, FolderTree, Copy, User
} from 'lucide-react';
import { 
  ReceitaCenario, ReceitaCenarioCreate, ReceitaPremissaMes, 
  TipoReceita, cenariosApi 
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
  { key: 'indice_estorno', label: '% Estorno', desc: 'Cancelamentos', step: 0.01 },
] as const;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
  anoFim
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
  const [savingPremissas, setSavingPremissas] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estado para edição inline (igual às premissas)
  const [editingCell, setEditingCell] = useState<{ indicador: string; mesIndex: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
          indice_estorno: existente?.indice_estorno ?? 0,
        };
      });
      
      setPremissas(premissasIniciais);
      setHasChanges(false);
    }
  }, [selectedReceita, mesesPeriodo]);

  // Focus no input quando editando
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

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
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar receita');
    } finally {
      setSaving(false);
    }
  };

  // Atualizar valor da premissa
  const handleUpdateValue = (mesIndex: number, indicador: string, value: number) => {
    setPremissas(prev => {
      const newPremissas = [...prev];
      (newPremissas[mesIndex] as any)[indicador] = value;
      return newPremissas;
    });
    setHasChanges(true);
  };

  // Copiar primeiro mês para todos
  const handleCopiarPrimeiroMes = () => {
    if (premissas.length === 0) return;
    
    const primeiro = premissas[0];
    setPremissas(prev => prev.map(p => ({
      ...p,
      vopdu: primeiro.vopdu,
      indice_conversao: primeiro.indice_conversao,
      ticket_medio: primeiro.ticket_medio,
      fator: primeiro.fator,
      indice_estorno: primeiro.indice_estorno,
    })));
    setHasChanges(true);
    toast.info("Valores do primeiro mês copiados para todos");
  };

  // Salvar premissas da receita variável
  const handleSavePremissas = async () => {
    if (!selectedReceita) return;
    
    setSavingPremissas(true);
    try {
      const premissasData = premissas.map(p => ({
        receita_cenario_id: selectedReceita.id,
        mes: p.mes,
        ano: p.ano,
        vopdu: p.vopdu,
        indice_conversao: p.indice_conversao,
        ticket_medio: p.ticket_medio,
        fator: p.fator,
        indice_estorno: p.indice_estorno,
      }));
      
      await api.post(`/api/v1/orcamento/receitas/${selectedReceita.id}/premissas/bulk`, premissasData, token || undefined);
      toast.success('Premissas salvas!');
      setHasChanges(false);
      await refetchReceitas();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar premissas');
    } finally {
      setSavingPremissas(false);
    }
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
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir receita');
    }
  };

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
          <Button 
            size="sm" 
            onClick={() => { resetForm(); setShowAddReceita(true); }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Receita
          </Button>
        </div>
      </CardHeader>

      {/* Conteúdo */}
      <CardContent className="flex-1 overflow-auto p-0">
        {loadingReceitas ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : receitas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma receita cadastrada</p>
            <p className="text-xs mt-1">Clique em "+ Receita" para adicionar</p>
          </div>
        ) : (
          <div className="divide-y">
            {/* Lista de Receitas */}
            <Table className="corporate-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Tipo de Receita</TableHead>
                  <TableHead className="text-[10px]">Cálculo</TableHead>
                  <TableHead className="text-[10px]">Função</TableHead>
                  <TableHead className="text-right text-[10px]">Valor</TableHead>
                  <TableHead className="text-center w-[100px] text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.map(receita => {
                  const isVariavel = receita.tipo_calculo === 'VARIAVEL';
                  const isSelected = selectedReceita?.id === receita.id;
                  
                  return (
                    <TableRow 
                      key={receita.id}
                      className={cn(
                        "cursor-pointer",
                        isSelected && "bg-green-50"
                      )}
                      onClick={() => isVariavel && setSelectedReceita(isSelected ? null : receita)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="size-4 text-green-600" />
                          <span className="font-medium text-sm">{receita.tipo_receita?.nome || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          isVariavel && "bg-purple-50 text-purple-700 border-purple-200"
                        )}>
                          {TIPOS_CALCULO.find(t => t.value === receita.tipo_calculo)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {receita.funcao_pa?.nome || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {receita.valor_fixo ? formatCurrency(receita.valor_fixo) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => { e.stopPropagation(); handleEdit(receita); }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setSelectedForDelete(receita); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Grid de Premissas igual ao PremissasFuncaoGridPanel */}
            {selectedReceita?.tipo_calculo === 'VARIAVEL' && (
              <div className="h-full flex flex-col">
                {/* Header do grid */}
                <div className="shrink-0 p-4 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                        disabled={savingPremissas}
                        title="Copia os valores do primeiro mês para todos os outros"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Replicar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSavePremissas}
                        disabled={!hasChanges || savingPremissas}
                      >
                        {savingPremissas ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Grid igual às premissas */}
                <div className="flex-1 overflow-auto p-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Premissas de Receita por Mês</CardTitle>
                      <CardDescription className="text-xs">
                        Defina os indicadores de produtividade para cada mês do período
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
                              {mesesPeriodo.map((m, idx) => (
                                <TableHead key={idx} className="text-center text-[10px] w-16 px-1">
                                  {m.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {INDICADORES_RECEITA.map((indicador) => (
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
                                        value={(p as any)[indicador.key]}
                                        onChange={(e) => handleUpdateValue(idx, indicador.key, parseFloat(e.target.value) || 0)}
                                        onBlur={() => setEditingCell(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
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
                                        className="h-6 w-14 text-[10px] text-center p-0 mx-auto"
                                      />
                                    ) : (
                                      <button
                                        className="w-full h-6 text-[10px] font-mono hover:bg-muted/50 rounded"
                                        onClick={() => setEditingCell({ indicador: indicador.key, mesIndex: idx })}
                                      >
                                        {indicador.key === 'ticket_medio' 
                                          ? (p as any)[indicador.key].toFixed(2)
                                          : indicador.key === 'indice_conversao'
                                            ? (p as any)[indicador.key].toFixed(4)
                                            : (p as any)[indicador.key].toFixed(2)
                                        }
                                      </button>
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
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
                            Receita = PA × VOPDU × Índice × Ticket × Fator × Dias Úteis × (1 - Estorno%)
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

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
                <strong>Receita Variável:</strong> Após salvar, clique na linha da receita para preencher as premissas mensais
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
    </Card>
  );
}
