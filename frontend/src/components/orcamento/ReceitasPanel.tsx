'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, Pencil, Trash2, DollarSign, TrendingUp, 
  Calculator, Info, ChevronDown, ChevronUp 
} from 'lucide-react';
import { 
  ReceitaCenario, ReceitaCenarioCreate, ReceitaPremissaMes, 
  TipoReceita, CentroCusto, Funcao, ReceitaCalculada 
} from '@/lib/api/orcamento';

interface ReceitasPanelProps {
  cenarioId: string;
  centroCustoId?: string;
  mesInicio: number;
  anoInicio: number;
  mesFim: number;
  anoFim: number;
}

const TIPOS_CALCULO = [
  { value: 'FIXA_CC', label: 'Fixa por CC', desc: 'Valor fixo mensal por Centro de Custo' },
  { value: 'FIXA_HC', label: 'Fixa por HC', desc: 'Valor fixo × Quantidade de HC' },
  { value: 'FIXA_PA', label: 'Fixa por PA', desc: 'Valor fixo × Quantidade de PA' },
  { value: 'VARIAVEL', label: 'Variável', desc: 'Cálculo com indicadores de vendas' },
];

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function ReceitasPanel({ 
  cenarioId, 
  centroCustoId,
  mesInicio,
  anoInicio,
  mesFim,
  anoFim
}: ReceitasPanelProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ReceitaCenario | null>(null);
  const [expandedReceita, setExpandedReceita] = useState<string | null>(null);
  const [premissasTab, setPremissasTab] = useState<'form' | 'grid'>('form');
  
  const [formData, setFormData] = useState<{
    centro_custo_id: string;
    tipo_receita_id: string;
    tipo_calculo: string;
    funcao_pa_id: string;
    valor_fixo: string;
    valor_minimo_pa: string;
    valor_maximo_pa: string;
    descricao: string;
    premissas: Record<string, {
      vopdu: string;
      indice_conversao: string;
      ticket_medio: string;
      fator: string;
      indice_estorno: string;
    }>;
  }>({
    centro_custo_id: centroCustoId || '',
    tipo_receita_id: '',
    tipo_calculo: 'FIXA_CC',
    funcao_pa_id: '',
    valor_fixo: '',
    valor_minimo_pa: '',
    valor_maximo_pa: '',
    descricao: '',
    premissas: {},
  });

  // Gerar lista de meses do cenário
  const mesesPeriodo = useMemo(() => {
    const meses: { ano: number; mes: number; key: string }[] = [];
    let ano = anoInicio;
    let mes = mesInicio;
    while ((ano < anoFim) || (ano === anoFim && mes <= mesFim)) {
      meses.push({ ano, mes, key: `${ano}-${mes}` });
      mes++;
      if (mes > 12) {
        mes = 1;
        ano++;
      }
    }
    return meses;
  }, [anoInicio, mesInicio, anoFim, mesFim]);

  // Buscar receitas do cenário
  const { data: receitas = [], isLoading } = useQuery<ReceitaCenario[]>({
    queryKey: ['receitas-cenario', cenarioId, centroCustoId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (centroCustoId) params.append('centro_custo_id', centroCustoId);
      return await api.get<ReceitaCenario[]>(`/api/v1/orcamento/receitas/cenarios/${cenarioId}?${params}`);
    },
  });

  // Buscar tipos de receita
  const { data: tiposReceita = [] } = useQuery<TipoReceita[]>({
    queryKey: ['tipos-receita-ativos'],
    queryFn: async () => {
      return await api.get<TipoReceita[]>('/api/v1/orcamento/tipos-receita?ativo=true');
    },
  });

  // Buscar centros de custo
  const { data: centrosCusto = [] } = useQuery<CentroCusto[]>({
    queryKey: ['centros-custo-ativos'],
    queryFn: async () => {
      return await api.get<CentroCusto[]>('/api/v1/orcamento/centros-custo?ativo=true');
    },
  });

  // Buscar funções (para PA)
  const { data: funcoes = [] } = useQuery<Funcao[]>({
    queryKey: ['funcoes-ativas'],
    queryFn: async () => {
      return await api.get<Funcao[]>('/api/v1/orcamento/funcoes?ativo=true');
    },
  });

  // Criar receita
  const createMutation = useMutation({
    mutationFn: async (data: ReceitaCenarioCreate) => {
      return await api.post<ReceitaCenario>(`/api/v1/orcamento/receitas/cenarios/${cenarioId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas-cenario', cenarioId] });
      toast.success('Receita criada com sucesso!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao criar receita');
    },
  });

  // Atualizar receita
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReceitaCenarioCreate> }) => {
      return await api.put<ReceitaCenario>(`/api/v1/orcamento/receitas/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas-cenario', cenarioId] });
      toast.success('Receita atualizada com sucesso!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar receita');
    },
  });

  // Excluir receita
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/orcamento/receitas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas-cenario', cenarioId] });
      toast.success('Receita excluída com sucesso!');
      setDeleteConfirmOpen(false);
      setSelectedForDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao excluir receita');
    },
  });

  // Atualizar centro de custo quando prop mudar
  useEffect(() => {
    if (centroCustoId) {
      setFormData(prev => ({ ...prev, centro_custo_id: centroCustoId }));
    }
  }, [centroCustoId]);

  const resetForm = () => {
    setFormData({
      centro_custo_id: centroCustoId || '',
      tipo_receita_id: '',
      tipo_calculo: 'FIXA_CC',
      funcao_pa_id: '',
      valor_fixo: '',
      valor_minimo_pa: '',
      valor_maximo_pa: '',
      descricao: '',
      premissas: {},
    });
    setEditingId(null);
    setPremissasTab('form');
  };

  const handleEditar = (receita: ReceitaCenario) => {
    // Montar premissas
    const premissasMap: typeof formData.premissas = {};
    receita.premissas?.forEach(p => {
      premissasMap[`${p.ano}-${p.mes}`] = {
        vopdu: String(p.vopdu || 0),
        indice_conversao: String(p.indice_conversao || 0),
        ticket_medio: String(p.ticket_medio || 0),
        fator: String(p.fator || 1),
        indice_estorno: String(p.indice_estorno || 0),
      };
    });

    setFormData({
      centro_custo_id: receita.centro_custo_id,
      tipo_receita_id: receita.tipo_receita_id,
      tipo_calculo: receita.tipo_calculo,
      funcao_pa_id: receita.funcao_pa_id || '',
      valor_fixo: receita.valor_fixo?.toString() || '',
      valor_minimo_pa: receita.valor_minimo_pa?.toString() || '',
      valor_maximo_pa: receita.valor_maximo_pa?.toString() || '',
      descricao: receita.descricao || '',
      premissas: premissasMap,
    });
    setEditingId(receita.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo_receita_id || !formData.centro_custo_id) {
      toast.error('Tipo de receita e Centro de Custo são obrigatórios');
      return;
    }

    if ((formData.tipo_calculo === 'FIXA_PA' || formData.tipo_calculo === 'VARIAVEL') && !formData.funcao_pa_id) {
      toast.error('Função PA é obrigatória para este tipo de cálculo');
      return;
    }

    // Montar dados
    const data: ReceitaCenarioCreate = {
      centro_custo_id: formData.centro_custo_id,
      tipo_receita_id: formData.tipo_receita_id,
      tipo_calculo: formData.tipo_calculo as any,
      funcao_pa_id: formData.funcao_pa_id || undefined,
      valor_fixo: formData.valor_fixo ? parseFloat(formData.valor_fixo) : undefined,
      valor_minimo_pa: formData.valor_minimo_pa ? parseFloat(formData.valor_minimo_pa) : undefined,
      valor_maximo_pa: formData.valor_maximo_pa ? parseFloat(formData.valor_maximo_pa) : undefined,
      descricao: formData.descricao || undefined,
    };

    // Adicionar premissas se for variável
    if (formData.tipo_calculo === 'VARIAVEL') {
      data.premissas = mesesPeriodo.map(({ ano, mes }) => {
        const p = formData.premissas[`${ano}-${mes}`] || {};
        return {
          mes,
          ano,
          vopdu: parseFloat(p.vopdu || '0'),
          indice_conversao: parseFloat(p.indice_conversao || '0'),
          ticket_medio: parseFloat(p.ticket_medio || '0'),
          fator: parseFloat(p.fator || '1'),
          indice_estorno: parseFloat(p.indice_estorno || '0'),
        };
      });
    }
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const updatePremissa = (key: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      premissas: {
        ...prev.premissas,
        [key]: {
          ...prev.premissas[key],
          [field]: value,
        },
      },
    }));
  };

  const getTipoCalculoLabel = (tipo: string) => {
    return TIPOS_CALCULO.find(t => t.value === tipo)?.label || tipo;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const needsFuncaoPA = formData.tipo_calculo === 'FIXA_PA' || formData.tipo_calculo === 'VARIAVEL';
  const needsValorFixo = formData.tipo_calculo !== 'VARIAVEL';
  const needsMinMax = formData.tipo_calculo === 'VARIAVEL';
  const needsPremissas = formData.tipo_calculo === 'VARIAVEL';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Receitas do Cenário</CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure receitas fixas ou variáveis por Centro de Custo
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Receita
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : receitas.length === 0 ? (
            <div className="empty-state p-12">
              <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma receita configurada.<br />
                <span className="text-sm">Clique em "Nova Receita" para começar.</span>
              </p>
            </div>
          ) : (
            <Table className="corporate-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Tipo de Receita</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Cálculo</TableHead>
                  <TableHead>Função PA</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.map((receita) => (
                  <>
                    <TableRow key={receita.id}>
                      <TableCell>
                        {receita.tipo_calculo === 'VARIAVEL' && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setExpandedReceita(expandedReceita === receita.id ? null : receita.id)}
                          >
                            {expandedReceita === receita.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{receita.tipo_receita?.nome || '-'}</span>
                          <p className="text-xs text-muted-foreground font-mono">
                            {receita.tipo_receita?.codigo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{receita.centro_custo?.nome || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTipoCalculoLabel(receita.tipo_calculo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {receita.funcao_pa?.nome || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {receita.tipo_calculo === 'VARIAVEL' ? (
                          <span className="text-xs text-muted-foreground">
                            Min: {formatCurrency(receita.valor_minimo_pa)} / Max: {formatCurrency(receita.valor_maximo_pa)}
                          </span>
                        ) : (
                          formatCurrency(receita.valor_fixo)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEditar(receita)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { setSelectedForDelete(receita); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Linha expandida para premissas */}
                    {expandedReceita === receita.id && receita.tipo_calculo === 'VARIAVEL' && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/20 p-4">
                          <div className="text-xs">
                            <h4 className="font-semibold mb-2">Premissas Mensais</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-1 px-2 w-24">Indicador</th>
                                    {mesesPeriodo.slice(0, 12).map(({ mes, ano }) => (
                                      <th key={`${ano}-${mes}`} className="text-center py-1 px-1 min-w-[60px]">
                                        {MESES_NOMES[mes - 1]}/{ano.toString().slice(2)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="py-1 px-2 font-medium">VOPDU</td>
                                    {mesesPeriodo.slice(0, 12).map(({ mes, ano }) => {
                                      const p = receita.premissas?.find(pr => pr.mes === mes && pr.ano === ano);
                                      return (
                                        <td key={`${ano}-${mes}`} className="text-center py-1 px-1 font-mono">
                                          {p?.vopdu?.toFixed(2) || '0.00'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                  <tr>
                                    <td className="py-1 px-2 font-medium">Conversão</td>
                                    {mesesPeriodo.slice(0, 12).map(({ mes, ano }) => {
                                      const p = receita.premissas?.find(pr => pr.mes === mes && pr.ano === ano);
                                      return (
                                        <td key={`${ano}-${mes}`} className="text-center py-1 px-1 font-mono">
                                          {((p?.indice_conversao || 0) * 100).toFixed(0)}%
                                        </td>
                                      );
                                    })}
                                  </tr>
                                  <tr>
                                    <td className="py-1 px-2 font-medium">Ticket</td>
                                    {mesesPeriodo.slice(0, 12).map(({ mes, ano }) => {
                                      const p = receita.premissas?.find(pr => pr.mes === mes && pr.ano === ano);
                                      return (
                                        <td key={`${ano}-${mes}`} className="text-center py-1 px-1 font-mono">
                                          {p?.ticket_medio?.toFixed(0) || '0'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
            <DialogDescription>
              Configure uma receita para o cenário de orçamento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Receita *</Label>
                <Select
                  value={formData.tipo_receita_id}
                  onValueChange={(value) => setFormData({ ...formData, tipo_receita_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposReceita.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.codigo} - {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Centro de Custo *</Label>
                <Select
                  value={formData.centro_custo_id}
                  onValueChange={(value) => setFormData({ ...formData, centro_custo_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.codigo} - {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cálculo *</Label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_CALCULO.map((tipo) => (
                  <Button
                    key={tipo.value}
                    type="button"
                    variant={formData.tipo_calculo === tipo.value ? 'default' : 'outline'}
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => setFormData({ ...formData, tipo_calculo: tipo.value })}
                  >
                    <div className="text-left">
                      <div className="font-medium">{tipo.label}</div>
                      <div className="text-xs opacity-70">{tipo.desc}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {needsFuncaoPA && (
              <div className="space-y-2">
                <Label>Função PA *</Label>
                <Select
                  value={formData.funcao_pa_id}
                  onValueChange={(value) => setFormData({ ...formData, funcao_pa_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função que representa o PA..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.codigo} - {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A quantidade de PA será calculada como HC / Fator PA da função.
                </p>
              </div>
            )}

            {needsValorFixo && (
              <div className="space-y-2">
                <Label>Valor Fixo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_fixo}
                  onChange={(e) => setFormData({ ...formData, valor_fixo: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            )}

            {needsMinMax && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Mínimo por PA (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_minimo_pa}
                    onChange={(e) => setFormData({ ...formData, valor_minimo_pa: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Máximo por PA (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_maximo_pa}
                    onChange={(e) => setFormData({ ...formData, valor_maximo_pa: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}

            {needsPremissas && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Premissas de Receita Variável
                </Label>
                <div className="border rounded-lg p-3 space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    Fórmula: HC_PA × VOPDU × Índice × Ticket × Fator × Dias × (1-Estorno)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 w-20">Mês</th>
                          <th className="text-center py-2 px-1">VOPDU</th>
                          <th className="text-center py-2 px-1">Conversão</th>
                          <th className="text-center py-2 px-1">Ticket (R$)</th>
                          <th className="text-center py-2 px-1">Fator</th>
                          <th className="text-center py-2 px-1">Estorno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mesesPeriodo.map(({ mes, ano, key }) => (
                          <tr key={key} className="border-b">
                            <td className="py-1 px-2 font-medium">
                              {MESES_NOMES[mes - 1]}/{ano.toString().slice(2)}
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-7 text-xs text-center"
                                value={formData.premissas[key]?.vopdu || ''}
                                onChange={(e) => updatePremissa(key, 'vopdu', e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                className="h-7 text-xs text-center"
                                value={formData.premissas[key]?.indice_conversao || ''}
                                onChange={(e) => updatePremissa(key, 'indice_conversao', e.target.value)}
                                placeholder="0.67"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-7 text-xs text-center"
                                value={formData.premissas[key]?.ticket_medio || ''}
                                onChange={(e) => updatePremissa(key, 'ticket_medio', e.target.value)}
                                placeholder="100"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-7 text-xs text-center"
                                value={formData.premissas[key]?.fator || ''}
                                onChange={(e) => updatePremissa(key, 'fator', e.target.value)}
                                placeholder="1"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                className="h-7 text-xs text-center"
                                value={formData.premissas[key]?.indice_estorno || ''}
                                onChange={(e) => updatePremissa(key, 'indice_estorno', e.target.value)}
                                placeholder="0.06"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta receita?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedForDelete && deleteMutation.mutate(selectedForDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

