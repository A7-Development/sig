'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, Pencil, Trash2, DollarSign, TrendingUp, 
  Briefcase, Loader2, Save, X, ChevronRight, ChevronDown, User
} from 'lucide-react';
import { 
  ReceitaCenario, ReceitaCenarioCreate, ReceitaPremissaMes, 
  TipoReceita, Funcao, cenariosApi 
} from '@/lib/api/orcamento';
import { useAuthStore } from '@/stores/auth-store';

interface ReceitasPanelProps {
  cenarioId: string;
  centroCustoId: string;
  centroCustoNome: string;
  secaoNome: string;
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

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function ReceitasPanel({ 
  cenarioId, 
  centroCustoId,
  centroCustoNome,
  secaoNome,
  mesInicio,
  anoInicio,
  mesFim,
  anoFim
}: ReceitasPanelProps) {
  const { accessToken: token } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Estado do painel
  const [showForm, setShowForm] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaCenario | null>(null);
  const [selectedReceita, setSelectedReceita] = useState<ReceitaCenario | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ReceitaCenario | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPremissas, setSavingPremissas] = useState(false);
  
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
  
  // Estado para premissas variáveis (grid mensal) - separado do formulário
  const [premissasEdicao, setPremissasEdicao] = useState<Record<string, {
    vopdu: string;
    indice_conversao: string;
    ticket_medio: string;
    fator: string;
    indice_estorno: string;
  }>>({});

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
    if (selectedReceita?.tipo_calculo === 'VARIAVEL' && selectedReceita.premissas) {
      const premissasMap: typeof premissasEdicao = {};
      
      // Inicializar todos os meses com valores padrão
      mesesPeriodo.forEach(({ key }) => {
        premissasMap[key] = {
          vopdu: '0',
          indice_conversao: '0',
          ticket_medio: '0',
          fator: '1',
          indice_estorno: '0',
        };
      });
      
      // Preencher com valores existentes
      selectedReceita.premissas.forEach(p => {
        const key = `${p.ano}-${p.mes}`;
        if (premissasMap[key]) {
          premissasMap[key] = {
            vopdu: String(p.vopdu || 0),
            indice_conversao: String(p.indice_conversao || 0),
            ticket_medio: String(p.ticket_medio || 0),
            fator: String(p.fator || 1),
            indice_estorno: String(p.indice_estorno || 0),
          };
        }
      });
      
      setPremissasEdicao(premissasMap);
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
    setShowForm(false);
  };

  // Iniciar edição
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
    setSelectedReceita(null);
    setShowForm(true);
  };

  // Selecionar receita para editar premissas
  const handleSelectReceita = (receita: ReceitaCenario) => {
    if (selectedReceita?.id === receita.id) {
      setSelectedReceita(null);
    } else {
      setSelectedReceita(receita);
      setShowForm(false);
    }
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
          setSelectedReceita(novaReceita);
        }
      }
      
      await refetchReceitas();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar receita');
    } finally {
      setSaving(false);
    }
  };

  // Salvar premissas da receita variável
  const handleSavePremissas = async () => {
    if (!selectedReceita) return;
    
    setSavingPremissas(true);
    try {
      const premissasData = Object.entries(premissasEdicao).map(([key, values]) => {
        const [ano, mes] = key.split('-').map(Number);
        return {
          receita_cenario_id: selectedReceita.id,
          mes,
          ano,
          vopdu: parseFloat(values.vopdu) || 0,
          indice_conversao: parseFloat(values.indice_conversao) || 0,
          ticket_medio: parseFloat(values.ticket_medio) || 0,
          fator: parseFloat(values.fator) || 1,
          indice_estorno: parseFloat(values.indice_estorno) || 0,
        };
      });
      
      await api.post(`/api/v1/orcamento/receitas/${selectedReceita.id}/premissas/bulk`, premissasData, token || undefined);
      toast.success('Premissas salvas!');
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

  // Atualizar premissa individual
  const handlePremissaChange = (key: string, field: keyof typeof premissasEdicao[string], value: string) => {
    setPremissasEdicao(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { vopdu: '0', indice_conversao: '0', ticket_medio: '0', fator: '1', indice_estorno: '0' },
        [field]: value
      }
    }));
  };

  // Renderizar grid de premissas variáveis (igual às premissas de pessoal)
  const renderPremissasGrid = () => {
    if (!selectedReceita || selectedReceita.tipo_calculo !== 'VARIAVEL') {
      return null;
    }

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-green-600" />
              Premissas de Receita Variável
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedReceita.tipo_receita?.nome} • Função: {selectedReceita.funcao_pa?.nome || '-'}
            </p>
          </div>
          <Button onClick={handleSavePremissas} disabled={savingPremissas} size="sm">
            {savingPremissas ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Salvar Premissas
          </Button>
        </div>

        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px] sticky left-0 bg-muted/50 font-semibold">Mês/Ano</TableHead>
                <TableHead className="text-center min-w-[100px]">
                  <div className="text-xs">
                    <div className="font-semibold">VOPDU</div>
                    <div className="text-muted-foreground font-normal">Venda/Operador/Dia</div>
                  </div>
                </TableHead>
                <TableHead className="text-center min-w-[100px]">
                  <div className="text-xs">
                    <div className="font-semibold">Índice Conv.</div>
                    <div className="text-muted-foreground font-normal">% Conversão</div>
                  </div>
                </TableHead>
                <TableHead className="text-center min-w-[120px]">
                  <div className="text-xs">
                    <div className="font-semibold">Ticket Médio</div>
                    <div className="text-muted-foreground font-normal">R$ por venda</div>
                  </div>
                </TableHead>
                <TableHead className="text-center min-w-[100px]">
                  <div className="text-xs">
                    <div className="font-semibold">Fator</div>
                    <div className="text-muted-foreground font-normal">Multiplicador</div>
                  </div>
                </TableHead>
                <TableHead className="text-center min-w-[100px]">
                  <div className="text-xs">
                    <div className="font-semibold">% Estorno</div>
                    <div className="text-muted-foreground font-normal">Cancelamentos</div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mesesPeriodo.map(({ ano, mes, key }) => {
                const valores = premissasEdicao[key] || {
                  vopdu: '0', indice_conversao: '0', ticket_medio: '0', fator: '1', indice_estorno: '0'
                };
                
                return (
                  <TableRow key={key} className="hover:bg-muted/30">
                    <TableCell className="font-medium sticky left-0 bg-background border-r">
                      <span className="text-sm">{MESES_NOMES[mes - 1]}/{ano}</span>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={valores.vopdu}
                        onChange={(e) => handlePremissaChange(key, 'vopdu', e.target.value)}
                        className="h-8 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.0001"
                        value={valores.indice_conversao}
                        onChange={(e) => handlePremissaChange(key, 'indice_conversao', e.target.value)}
                        className="h-8 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={valores.ticket_medio}
                        onChange={(e) => handlePremissaChange(key, 'ticket_medio', e.target.value)}
                        className="h-8 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={valores.fator}
                        onChange={(e) => handlePremissaChange(key, 'fator', e.target.value)}
                        className="h-8 text-center"
                        placeholder="1"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={valores.indice_estorno}
                        onChange={(e) => handlePremissaChange(key, 'indice_estorno', e.target.value)}
                        className="h-8 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Info sobre o cálculo */}
        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
          <strong>Fórmula:</strong> PA × VOPDU × Índice Conversão × Ticket Médio × Fator × Dias Úteis × (1 - % Estorno)
          <br />
          <strong>Limites:</strong> Mínimo {formatCurrency(selectedReceita.valor_minimo_pa || 0)} / Máximo {formatCurrency(selectedReceita.valor_maximo_pa || 0)} por PA
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Painel Esquerdo: Lista de Receitas */}
      <div className="w-72 border-r bg-muted/5 flex flex-col">
        <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receitas</h3>
            <p className="text-[10px] text-muted-foreground">{centroCustoNome}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { resetForm(); setSelectedReceita(null); setShowForm(true); }}>
            <Plus className="size-3 mr-1" />
            Nova
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingReceitas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : receitas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                <TrendingUp className="size-6 mx-auto mb-2 opacity-30" />
                <p>Nenhuma receita</p>
              </div>
            ) : (
              receitas.map(receita => {
                const isSelected = selectedReceita?.id === receita.id;
                const isVariavel = receita.tipo_calculo === 'VARIAVEL';
                
                return (
                  <div
                    key={receita.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer group",
                      isSelected
                        ? "bg-green-100 text-green-800"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSelectReceita(receita)}
                  >
                    <DollarSign className={cn("size-4 shrink-0", isSelected ? "text-green-600" : "text-green-500")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {receita.tipo_receita?.nome || 'Receita'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {TIPOS_CALCULO.find(t => t.value === receita.tipo_calculo)?.label}
                        {receita.funcao_pa && ` • ${receita.funcao_pa.nome}`}
                      </p>
                    </div>
                    {isVariavel && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-200">
                        VAR
                      </Badge>
                    )}
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(e) => { e.stopPropagation(); handleEdit(receita); }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setSelectedForDelete(receita); setDeleteConfirmOpen(true); }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Painel Direito: Formulário ou Grid de Premissas */}
      <div className="flex-1 overflow-auto">
        {showForm ? (
          /* Formulário de cadastro/edição */
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-green-600" />
                {editingReceita ? 'Editar Receita' : 'Nova Receita'}
              </h3>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Tipo de Receita e Tipo de Cálculo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Receita *</Label>
                <Select
                  value={formData.tipo_receita_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_receita_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposReceita.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.codigo} - {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
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
            </div>

            {/* Função de referência */}
            {precisaFuncao && (
              <div>
                <Label>
                  Função de Referência * 
                  <span className="text-muted-foreground ml-1 font-normal">
                    (para calcular {formData.tipo_calculo === 'FIXA_HC' ? 'HC' : formData.tipo_calculo === 'FIXA_PA' ? 'PA' : 'produtividade'})
                  </span>
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
                          {f.codigo} - {f.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Valores */}
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
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição opcional..."
              />
            </div>

            {/* Info para variável */}
            {formData.tipo_calculo === 'VARIAVEL' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                <strong>Receita Variável:</strong> Após salvar, clique na receita à esquerda para preencher as premissas mensais (VOPDU, Índice, Ticket, etc.)
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetForm} disabled={saving}>
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
            </div>
          </div>
        ) : selectedReceita ? (
          /* Grid de Premissas ou Detalhes */
          selectedReceita.tipo_calculo === 'VARIAVEL' ? (
            renderPremissasGrid()
          ) : (
            /* Detalhes de receita fixa */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="size-4 text-green-600" />
                    {selectedReceita.tipo_receita?.nome || 'Receita'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {TIPOS_CALCULO.find(t => t.value === selectedReceita.tipo_calculo)?.label}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(selectedReceita)}>
                  <Pencil className="size-4 mr-2" />
                  Editar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Valor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedReceita.valor_fixo || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedReceita.tipo_calculo === 'FIXA_CC' ? 'por mês' : 
                       selectedReceita.tipo_calculo === 'FIXA_HC' ? 'por HC/mês' : 'por PA/mês'}
                    </p>
                  </CardContent>
                </Card>

                {selectedReceita.funcao_pa && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Função de Referência</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{selectedReceita.funcao_pa.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {selectedReceita.funcao_pa.codigo}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {selectedReceita.descricao && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm">{selectedReceita.descricao}</p>
                </div>
              )}
            </div>
          )
        ) : (
          /* Estado inicial - nada selecionado */
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="size-12 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Selecione uma Receita</h3>
            <p className="text-sm max-w-md text-center">
              Clique em uma receita à esquerda para ver os detalhes ou preencher as premissas mensais.
              <br />
              <span className="text-xs">Para receitas <strong>variáveis</strong>, você poderá preencher VOPDU, Índice, Ticket, etc. mês a mês.</span>
            </p>
          </div>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir esta receita? Esta ação não pode ser desfeita.
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
    </div>
  );
}
