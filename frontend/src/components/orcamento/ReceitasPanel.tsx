'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, Pencil, Trash2, DollarSign, TrendingUp, 
  Calculator, ChevronDown, ChevronRight, Briefcase,
  Building2, User, Loader2, Save, X
} from 'lucide-react';
import { 
  ReceitaCenario, ReceitaCenarioCreate, ReceitaPremissaMes, 
  TipoReceita, CentroCusto, Funcao, cenariosApi 
} from '@/lib/api/orcamento';
import { useAuthStore } from '@/stores/auth-store';

interface ReceitasPanelProps {
  cenarioId: string;
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

// Helpers
const truncateText = (text: string | undefined | null, maxLength: number = 20): string => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "…" : text;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// ============================================
// Componente Principal - Master-Detail Layout
// ============================================

export function ReceitasPanel({ 
  cenarioId, 
  mesInicio,
  anoInicio,
  mesFim,
  anoFim
}: ReceitasPanelProps) {
  const { accessToken: token } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Estado da árvore
  const [expandedSecoes, setExpandedSecoes] = useState<Set<string>>(new Set());
  const [selectedCC, setSelectedCC] = useState<{
    secaoId: string;
    secaoNome: string;
    ccId: string;
    ccNome: string;
  } | null>(null);
  
  // Estado do formulário
  const [showForm, setShowForm] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaCenario | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ReceitaCenario | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo_receita_id: '',
    tipo_calculo: 'FIXA_CC',
    funcao_pa_id: '',
    valor_fixo: '',
    valor_minimo_pa: '',
    valor_maximo_pa: '',
    descricao: '',
  });
  
  // Estado para premissas variáveis (grid mensal)
  const [premissasVariavel, setPremissasVariavel] = useState<Record<string, {
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

  // Buscar estrutura do cenário (seções e CCs)
  const { data: estrutura, isLoading: loadingEstrutura } = useQuery({
    queryKey: ['receitas-estrutura', cenarioId],
    queryFn: async () => {
      if (!token) return [];
      const empresas = await cenariosApi.getEmpresas(token, cenarioId);
      
      // Para cada empresa, buscar seções
      const secoesPromises = empresas.map(async (emp) => {
        try {
          const secoes = await api.get<any[]>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${emp.id}/secoes`, token || undefined);
          return { empresa: emp, secoes };
        } catch {
          return { empresa: emp, secoes: [] };
        }
      });
      
      const resultado = await Promise.all(secoesPromises);
      return resultado;
    },
    enabled: !!token && !!cenarioId,
  });

  // Buscar CCs de uma seção específica
  const fetchCCsSecao = useCallback(async (secaoId: string) => {
    if (!token) return [];
    try {
      const ccs = await api.get<any[]>(`/api/v1/orcamento/cenarios/${cenarioId}/secoes/${secaoId}/centros-custo`, token || undefined);
      return ccs;
    } catch {
      return [];
    }
  }, [token, cenarioId]);

  // Estado para CCs por seção
  const [ccsPorSecao, setCCsPorSecao] = useState<Record<string, any[]>>({});
  const [loadingCCs, setLoadingCCs] = useState<Set<string>>(new Set());

  // Buscar receitas do CC selecionado
  const { data: receitas = [], isLoading: loadingReceitas, refetch: refetchReceitas } = useQuery<ReceitaCenario[]>({
    queryKey: ['receitas-cenario', cenarioId, selectedCC?.ccId],
    queryFn: async () => {
      if (!selectedCC?.ccId) return [];
      const params = new URLSearchParams();
      params.append('centro_custo_id', selectedCC.ccId);
      return await api.get<ReceitaCenario[]>(`/api/v1/orcamento/receitas/cenarios/${cenarioId}?${params}`, token || undefined);
    },
    enabled: !!selectedCC?.ccId && !!token,
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
    queryKey: ['funcoes-cc', cenarioId, selectedCC?.ccId],
    queryFn: async () => {
      if (!selectedCC?.ccId || !token) return [];
      // Buscar funções do quadro de pessoal do CC
      const quadro = await cenariosApi.getQuadro(token, cenarioId, { centro_custo_id: selectedCC.ccId });
      // Extrair funções únicas
      const funcoesMap = new Map<string, any>();
      quadro.forEach(q => {
        if (q.funcao && !funcoesMap.has(q.funcao.id)) {
          funcoesMap.set(q.funcao.id, q.funcao);
        }
      });
      return Array.from(funcoesMap.values());
    },
    enabled: !!selectedCC?.ccId && !!token,
  });

  // Expandir seção e carregar CCs
  const toggleSecao = async (secaoId: string) => {
    const newExpanded = new Set(expandedSecoes);
    if (newExpanded.has(secaoId)) {
      newExpanded.delete(secaoId);
    } else {
      newExpanded.add(secaoId);
      // Carregar CCs se ainda não carregou
      if (!ccsPorSecao[secaoId]) {
        setLoadingCCs(prev => new Set(prev).add(secaoId));
        const ccs = await fetchCCsSecao(secaoId);
        setCCsPorSecao(prev => ({ ...prev, [secaoId]: ccs }));
        setLoadingCCs(prev => {
          const next = new Set(prev);
          next.delete(secaoId);
          return next;
        });
      }
    }
    setExpandedSecoes(newExpanded);
  };

  // Selecionar CC
  const handleSelectCC = (secaoId: string, secaoNome: string, ccId: string, ccNome: string) => {
    setSelectedCC({ secaoId, secaoNome, ccId, ccNome });
    setShowForm(false);
    setEditingReceita(null);
  };

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
    setPremissasVariavel({});
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
    
    // Carregar premissas variáveis
    if (receita.premissas) {
      const premissasMap: typeof premissasVariavel = {};
      receita.premissas.forEach(p => {
        premissasMap[`${p.ano}-${p.mes}`] = {
          vopdu: String(p.vopdu || 0),
          indice_conversao: String(p.indice_conversao || 0),
          ticket_medio: String(p.ticket_medio || 0),
          fator: String(p.fator || 1),
          indice_estorno: String(p.indice_estorno || 0),
        };
      });
      setPremissasVariavel(premissasMap);
    }
    
    setEditingReceita(receita);
    setShowForm(true);
  };

  // Verificar se precisa de função (HC, PA ou Variável)
  const precisaFuncao = formData.tipo_calculo === 'FIXA_HC' || 
                        formData.tipo_calculo === 'FIXA_PA' || 
                        formData.tipo_calculo === 'VARIAVEL';

  // Salvar receita
  const handleSave = async () => {
    if (!selectedCC) return;
    
    // Validações
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
        centro_custo_id: selectedCC.ccId,
        tipo_receita_id: formData.tipo_receita_id,
        tipo_calculo: formData.tipo_calculo as 'FIXA_CC' | 'FIXA_HC' | 'FIXA_PA' | 'VARIAVEL',
        funcao_pa_id: formData.funcao_pa_id || undefined,
        valor_fixo: formData.valor_fixo ? parseFloat(formData.valor_fixo) : undefined,
        valor_minimo_pa: formData.valor_minimo_pa ? parseFloat(formData.valor_minimo_pa) : undefined,
        valor_maximo_pa: formData.valor_maximo_pa ? parseFloat(formData.valor_maximo_pa) : undefined,
        descricao: formData.descricao || undefined,
      };
      
      let receitaId: string;
      
      if (editingReceita) {
        await api.put(`/api/v1/orcamento/receitas/${editingReceita.id}`, payload, token || undefined);
        receitaId = editingReceita.id;
        toast.success('Receita atualizada!');
      } else {
        const novaReceita = await api.post<ReceitaCenario>(`/api/v1/orcamento/receitas/cenarios/${cenarioId}`, payload, token || undefined);
        receitaId = novaReceita.id;
        toast.success('Receita criada!');
      }
      
      // Salvar premissas variáveis se aplicável
      if (formData.tipo_calculo === 'VARIAVEL') {
        const premissasData = Object.entries(premissasVariavel).map(([key, values]) => {
          const [ano, mes] = key.split('-').map(Number);
          return {
            receita_cenario_id: receitaId,
            mes,
            ano,
            vopdu: parseFloat(values.vopdu) || 0,
            indice_conversao: parseFloat(values.indice_conversao) || 0,
            ticket_medio: parseFloat(values.ticket_medio) || 0,
            fator: parseFloat(values.fator) || 1,
            indice_estorno: parseFloat(values.indice_estorno) || 0,
          };
        });
        
        if (premissasData.length > 0) {
          await api.post(`/api/v1/orcamento/receitas/${receitaId}/premissas/bulk`, premissasData, token || undefined);
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

  // Excluir receita
  const handleDelete = async () => {
    if (!selectedForDelete) return;
    
    try {
      await api.delete(`/api/v1/orcamento/receitas/${selectedForDelete.id}`, token || undefined);
      toast.success('Receita excluída!');
      await refetchReceitas();
      setDeleteConfirmOpen(false);
      setSelectedForDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir receita');
    }
  };

  // Atualizar premissa individual
  const handlePremissaChange = (key: string, field: keyof typeof premissasVariavel[string], value: string) => {
    setPremissasVariavel(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { vopdu: '0', indice_conversao: '0', ticket_medio: '0', fator: '1', indice_estorno: '0' },
        [field]: value
      }
    }));
  };

  // Renderizar árvore de seções e CCs
  const renderTree = () => {
    if (loadingEstrutura) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!estrutura || estrutura.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma estrutura encontrada.<br/>
          Configure empresas e seções no cenário.
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {estrutura.map(({ empresa, secoes }) => (
          <div key={empresa.id}>
            {/* Empresa */}
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4" />
              <span>{truncateText(empresa.empresa?.razao_social || empresa.empresa?.codigo, 25)}</span>
            </div>
            
            {/* Seções */}
            <div className="ml-4">
              {secoes.map((secao: any) => {
                const secaoId = secao.id;
                const isExpanded = expandedSecoes.has(secaoId);
                const ccs = ccsPorSecao[secaoId] || [];
                const isLoadingCC = loadingCCs.has(secaoId);
                
                return (
                  <div key={secaoId}>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted/50 text-sm",
                        isExpanded && "bg-muted/30"
                      )}
                      onClick={() => toggleSecao(secaoId)}
                    >
                      {isLoadingCC ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronRight className="size-3" />
                      )}
                      <Building2 className="size-3.5 text-orange-600" />
                      <span className="flex-1">{truncateText(secao.secao?.nome || 'Seção', 20)}</span>
                      {ccs.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {ccs.length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Centros de Custo */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {ccs.map((cc: any) => {
                          const ccData = cc.centro_custo || cc;
                          const ccId = ccData.id;
                          const isSelected = selectedCC?.ccId === ccId;
                          
                          return (
                            <div
                              key={ccId}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs",
                                isSelected 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => handleSelectCC(
                                secaoId, 
                                secao.secao?.nome || 'Seção',
                                ccId, 
                                ccData.nome || ccData.codigo
                              )}
                            >
                              <Briefcase className={cn("size-3", isSelected ? "text-primary-foreground" : "text-blue-600")} />
                              <span className="flex-1">{truncateText(ccData.nome || ccData.codigo, 18)}</span>
                              <span className={cn("font-mono text-[10px]", isSelected ? "" : "text-muted-foreground")}>
                                {ccData.codigo}
                              </span>
                            </div>
                          );
                        })}
                        {ccs.length === 0 && !isLoadingCC && (
                          <div className="text-xs text-muted-foreground italic px-2 py-1">
                            Nenhum CC cadastrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Renderizar grid de premissas variáveis (master-detail)
  const renderPremissasGrid = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[100px] sticky left-0 bg-muted/30">Mês/Ano</TableHead>
            <TableHead className="text-center min-w-[80px]">VOPDU</TableHead>
            <TableHead className="text-center min-w-[80px]">Índice Conv.</TableHead>
            <TableHead className="text-center min-w-[100px]">Ticket Médio</TableHead>
            <TableHead className="text-center min-w-[80px]">Fator</TableHead>
            <TableHead className="text-center min-w-[80px]">% Estorno</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mesesPeriodo.map(({ ano, mes, key }) => {
            const valores = premissasVariavel[key] || {
              vopdu: '0', indice_conversao: '0', ticket_medio: '0', fator: '1', indice_estorno: '0'
            };
            
            return (
              <TableRow key={key}>
                <TableCell className="font-medium sticky left-0 bg-background">
                  {MESES_NOMES[mes - 1]}/{ano}
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.vopdu}
                    onChange={(e) => handlePremissaChange(key, 'vopdu', e.target.value)}
                    className="h-7 text-xs text-center"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    step="0.0001"
                    value={valores.indice_conversao}
                    onChange={(e) => handlePremissaChange(key, 'indice_conversao', e.target.value)}
                    className="h-7 text-xs text-center"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.ticket_medio}
                    onChange={(e) => handlePremissaChange(key, 'ticket_medio', e.target.value)}
                    className="h-7 text-xs text-center"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.fator}
                    onChange={(e) => handlePremissaChange(key, 'fator', e.target.value)}
                    className="h-7 text-xs text-center"
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
                    className="h-7 text-xs text-center"
                    placeholder="0"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  // Renderizar painel de detalhe (direita)
  const renderDetail = () => {
    if (!selectedCC) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <DollarSign className="size-12 mb-4 opacity-30" />
          <p className="text-sm">Selecione um Centro de Custo</p>
          <p className="text-xs mt-1">para gerenciar suas receitas</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header do CC selecionado */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-blue-600" />
              <h3 className="font-semibold">{selectedCC.ccNome}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seção: {selectedCC.secaoNome}
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
            <Plus className="size-4 mr-1" />
            Nova Receita
          </Button>
        </div>

        {/* Formulário de cadastro/edição */}
        {showForm && (
          <Card className="mb-4 border-primary/20">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {editingReceita ? 'Editar Receita' : 'Nova Receita'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de Receita */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo de Receita *</Label>
                  <Select
                    value={formData.tipo_receita_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_receita_id: v }))}
                  >
                    <SelectTrigger className="h-9">
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
                  <Label className="text-xs">Tipo de Cálculo *</Label>
                  <Select
                    value={formData.tipo_calculo}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_calculo: v, funcao_pa_id: '' }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CALCULO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          <div>
                            <span className="font-medium">{tipo.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{tipo.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Função de referência (obrigatório para HC/PA/Variável) */}
              {precisaFuncao && (
                <div>
                  <Label className="text-xs">
                    Função de Referência * 
                    <span className="text-muted-foreground ml-1">
                      (para calcular {formData.tipo_calculo === 'FIXA_HC' ? 'HC' : formData.tipo_calculo === 'FIXA_PA' ? 'PA' : 'produtividade'})
                    </span>
                  </Label>
                  <Select
                    value={formData.funcao_pa_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, funcao_pa_id: v }))}
                  >
                    <SelectTrigger className="h-9">
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
                  <Label className="text-xs">
                    Valor {formData.tipo_calculo === 'FIXA_CC' ? 'Mensal Fixo' : 'por Unidade'} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_fixo}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_fixo: e.target.value }))}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
              )}

              {/* Mínimo/Máximo por PA (apenas variável) */}
              {formData.tipo_calculo === 'VARIAVEL' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Valor Mínimo por PA</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_minimo_pa}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_minimo_pa: e.target.value }))}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Máximo por PA</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_maximo_pa}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_maximo_pa: e.target.value }))}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              {/* Grid de Premissas Variáveis - Master-Detail */}
              {formData.tipo_calculo === 'VARIAVEL' && (
                <div>
                  <Label className="text-xs mb-2 block">
                    Premissas Mensais de Receita Variável
                  </Label>
                  <ScrollArea className="h-[200px]">
                    {renderPremissasGrid()}
                  </ScrollArea>
                </div>
              )}

              {/* Descrição */}
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição opcional..."
                  className="h-9"
                />
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetForm} disabled={saving}>
                  <X className="size-3 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="size-3 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de receitas cadastradas */}
        <div className="flex-1 overflow-auto">
          <h4 className="text-sm font-medium mb-2">Receitas Cadastradas</h4>
          
          {loadingReceitas ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : receitas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/10">
              <TrendingUp className="size-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma receita cadastrada</p>
              <p className="text-xs mt-1">Clique em "Nova Receita" para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receitas.map(receita => (
                <Card key={receita.id} className="hover:bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="size-4 text-green-600" />
                          <span className="font-medium text-sm">
                            {receita.tipo_receita?.nome || 'Receita'}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {TIPOS_CALCULO.find(t => t.value === receita.tipo_calculo)?.label}
                          </Badge>
                        </div>
                        
                        <div className="mt-1 text-xs text-muted-foreground space-x-3">
                          {receita.valor_fixo && (
                            <span>Valor: {formatCurrency(receita.valor_fixo)}</span>
                          )}
                          {receita.funcao_pa && (
                            <span>Função: {receita.funcao_pa.nome}</span>
                          )}
                          {receita.descricao && (
                            <span className="italic">"{receita.descricao}"</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleEdit(receita)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedForDelete(receita);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="master-detail-layout">
      {/* Painel esquerdo - Árvore */}
      <Card className="master-panel">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="size-4" />
            Estrutura
          </CardTitle>
          <CardDescription className="text-xs">
            Selecione um Centro de Custo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {renderTree()}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Painel direito - Detalhe */}
      <Card className="detail-panel">
        <CardContent className="p-4 h-full">
          {renderDetail()}
        </CardContent>
      </Card>

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
