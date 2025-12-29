"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Loader2,
  Briefcase,
  Calculator,
  Split,
  TrendingUp,
  Hash,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  custosDiretos,
  produtosTecnologia,
  type CustoDireto,
  type CustoDiretoCreate,
  type ProdutoTecnologia,
  type CentroCusto,
  type Funcao,
  type TipoValorCusto,
  type UnidadeMedidaCusto,
  type TipoMedidaCusto,
} from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/client";

interface CustoDiretoPanelProps {
  cenarioId: string;
  secaoId: string;
  secaoNome?: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  centrosCustoDisponiveis?: CentroCusto[];
}

const TIPOS_VALOR = [
  { value: "FIXO", label: "Fixo", icon: DollarSign, description: "Valor fixo mensal igual para todo o período" },
  { value: "VARIAVEL", label: "Variável", icon: TrendingUp, description: "Valor calculado por unidade (HC, PA)" },
  { value: "FIXO_VARIAVEL", label: "Fixo + Variável", icon: Calculator, description: "Componente fixo mais variável" },
] as const;

const UNIDADES_MEDIDA = [
  { value: "HC", label: "HC (Headcount)", description: "Quantidade de pessoas" },
  { value: "PA", label: "PA (Posição de Atendimento)", description: "Posições de atendimento" },
  { value: "UNIDADE", label: "Unidade", description: "Unidade genérica" },
] as const;

const TIPOS_MEDIDA = [
  { value: "HC_TOTAL", label: "HC Total do CC", description: "Soma de todas as funções" },
  { value: "HC_FUNCAO", label: "HC de Função Específica", description: "Apenas uma função selecionada" },
  { value: "PA_TOTAL", label: "PA Total do CC", description: "Soma de PAs de todas as funções" },
  { value: "PA_FUNCAO", label: "PA de Função Específica", description: "PA de uma função selecionada" },
] as const;

export default function CustoDiretoPanel({
  cenarioId,
  secaoId,
  secaoNome,
  centroCustoId,
  centroCustoNome,
  centrosCustoDisponiveis = [],
}: CustoDiretoPanelProps) {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  
  const [custos, setCustos] = useState<CustoDireto[]>([]);
  const [itensCusto, setItensCusto] = useState<ProdutoTecnologia[]>([]);
  const [funcoes, setFuncoes] = useState<{ id: string; codigo: string; nome: string; cbo: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<CustoDireto | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    centro_custo_id: centroCustoId || "",
    item_custo_id: "",
    tipo_valor: "FIXO" as TipoValorCusto,
    valor_fixo: "",
    valor_unitario_variavel: "",
    unidade_medida: "" as UnidadeMedidaCusto | "",
    funcao_base_id: "",
    tipo_medida: "" as TipoMedidaCusto | "",
    descricao: "",
    // Rateio
    tipo_calculo: "manual" as "manual" | "rateio",
    rateio_ccs: [] as { ccId: string; ccNome: string; percentual: number }[],
  });

  // Carregar dados
  useEffect(() => {
    if (token) {
      carregarCustos();
      carregarItensCusto();
      carregarFuncoes();
    }
  }, [token, cenarioId, secaoId, centroCustoId]);

  const carregarCustos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await custosDiretos.listar(token, cenarioId, {
        cenario_secao_id: secaoId,
        centro_custo_id: centroCustoId,
        apenas_ativos: true,
      });
      setCustos(data);
    } catch (error) {
      console.error("Erro ao carregar custos:", error);
      toast({
        title: "Erro ao carregar custos",
        description: "Não foi possível carregar os custos diretos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarItensCusto = async () => {
    if (!token) return;
    setLoadingItens(true);
    try {
      const data = await produtosTecnologia.listar(token, { apenas_ativos: true });
      setItensCusto(data);
    } catch (error) {
      console.error("Erro ao carregar itens de custo:", error);
    } finally {
      setLoadingItens(false);
    }
  };

  const carregarFuncoes = async () => {
    if (!token) return;
    try {
      const data = await custosDiretos.funcoesDisponiveis(token, cenarioId, centroCustoId);
      setFuncoes(data);
    } catch (error) {
      console.error("Erro ao carregar funções:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    // Validações
    if (!formData.centro_custo_id && formData.tipo_calculo !== "rateio") {
      toast({ title: "Erro", description: "Selecione um Centro de Custo", variant: "destructive" });
      return;
    }
    
    if (!formData.item_custo_id) {
      toast({ title: "Erro", description: "Selecione um Item de Custo", variant: "destructive" });
      return;
    }
    
    if (formData.tipo_valor === "FIXO" && !formData.valor_fixo) {
      toast({ title: "Erro", description: "Informe o valor fixo", variant: "destructive" });
      return;
    }
    
    if ((formData.tipo_valor === "VARIAVEL" || formData.tipo_valor === "FIXO_VARIAVEL") && 
        (!formData.valor_unitario_variavel || !formData.unidade_medida)) {
      toast({ title: "Erro", description: "Informe o valor unitário e a unidade de medida", variant: "destructive" });
      return;
    }
    
    setSalvando(true);
    try {
      if (formData.tipo_calculo === "rateio" && formData.rateio_ccs.length >= 2) {
        // Criar múltiplas entradas para rateio
        const grupoId = crypto.randomUUID();
        
        for (const rateioCC of formData.rateio_ccs) {
          const payload: CustoDiretoCreate = {
            cenario_id: cenarioId,
            cenario_secao_id: secaoId,
            centro_custo_id: rateioCC.ccId,
            item_custo_id: formData.item_custo_id,
            tipo_valor: formData.tipo_valor,
            valor_fixo: formData.valor_fixo ? parseFloat(formData.valor_fixo) * (rateioCC.percentual / 100) : null,
            valor_unitario_variavel: formData.valor_unitario_variavel ? parseFloat(formData.valor_unitario_variavel) : null,
            unidade_medida: formData.unidade_medida || null,
            funcao_base_id: formData.funcao_base_id || null,
            tipo_medida: formData.tipo_medida || null,
            tipo_calculo: "rateio",
            rateio_grupo_id: grupoId,
            rateio_percentual: rateioCC.percentual,
            descricao: formData.descricao || null,
          };
          await custosDiretos.criar(token, payload);
        }
        
        toast({
          title: "Custos criados",
          description: `Custo rateado entre ${formData.rateio_ccs.length} Centros de Custo.`,
        });
      } else {
        // Criar entrada única
        const payload: CustoDiretoCreate = {
          cenario_id: cenarioId,
          cenario_secao_id: secaoId,
          centro_custo_id: formData.centro_custo_id,
          item_custo_id: formData.item_custo_id,
          tipo_valor: formData.tipo_valor,
          valor_fixo: formData.valor_fixo ? parseFloat(formData.valor_fixo) : null,
          valor_unitario_variavel: formData.valor_unitario_variavel ? parseFloat(formData.valor_unitario_variavel) : null,
          unidade_medida: formData.unidade_medida || null,
          funcao_base_id: formData.funcao_base_id || null,
          tipo_medida: formData.tipo_medida || null,
          tipo_calculo: "manual",
          descricao: formData.descricao || null,
        };

        if (editando) {
          await custosDiretos.atualizar(token, editando.id, payload);
          toast({ title: "Custo atualizado", description: "Custo direto atualizado com sucesso." });
        } else {
          await custosDiretos.criar(token, payload);
          toast({ title: "Custo criado", description: "Custo direto criado com sucesso." });
        }
      }
      
      setShowForm(false);
      resetForm();
      carregarCustos();
    } catch (error: any) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao salvar",
        description: error.response?.data?.detail || "Não foi possível salvar o custo.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      centro_custo_id: centroCustoId || "",
      item_custo_id: "",
      tipo_valor: "FIXO",
      valor_fixo: "",
      valor_unitario_variavel: "",
      unidade_medida: "",
      funcao_base_id: "",
      tipo_medida: "",
      descricao: "",
      tipo_calculo: "manual",
      rateio_ccs: [],
    });
  };

  const handleEditar = (custo: CustoDireto) => {
    setEditando(custo);
    setFormData({
      centro_custo_id: custo.centro_custo_id,
      item_custo_id: custo.item_custo_id,
      tipo_valor: custo.tipo_valor,
      valor_fixo: custo.valor_fixo?.toString() || "",
      valor_unitario_variavel: custo.valor_unitario_variavel?.toString() || "",
      unidade_medida: custo.unidade_medida || "",
      funcao_base_id: custo.funcao_base_id || "",
      tipo_medida: custo.tipo_medida || "",
      descricao: custo.descricao || "",
      tipo_calculo: custo.tipo_calculo,
      rateio_ccs: [],
    });
    setShowForm(true);
  };

  const handleExcluir = async (id: string) => {
    if (!token) return;
    if (!confirm("Deseja realmente excluir este custo?")) return;
    
    try {
      await custosDiretos.excluir(token, id, true);
      toast({ title: "Custo removido", description: "Custo direto removido com sucesso." });
      carregarCustos();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o custo.",
        variant: "destructive",
      });
    }
  };

  const formatarValor = (valor: number | null | undefined) => {
    if (valor === null || valor === undefined) return "-";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const handleToggleRateioCC = (cc: CentroCusto, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        rateio_ccs: [...prev.rateio_ccs, { ccId: cc.id, ccNome: cc.nome, percentual: 0 }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        rateio_ccs: prev.rateio_ccs.filter(r => r.ccId !== cc.id)
      }));
    }
  };

  const handleChangePercentualRateio = (ccId: string, percentual: number) => {
    setFormData(prev => ({
      ...prev,
      rateio_ccs: prev.rateio_ccs.map(r => r.ccId === ccId ? { ...r, percentual } : r)
    }));
  };

  const totalPercentualRateio = formData.rateio_ccs.reduce((acc, r) => acc + r.percentual, 0);
  const rateioValido = Math.abs(totalPercentualRateio - 100) < 0.01;

  const mostrarCamposVariavel = formData.tipo_valor === "VARIAVEL" || formData.tipo_valor === "FIXO_VARIAVEL";
  const mostrarCampoFixo = formData.tipo_valor === "FIXO" || formData.tipo_valor === "FIXO_VARIAVEL";

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="section-title flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Custos Diretos
              </CardTitle>
              <CardDescription>
                {centroCustoNome ? (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {centroCustoNome}
                  </span>
                ) : secaoNome ? (
                  `Seção: ${secaoNome}`
                ) : null}
                {" • "}{custos.length} custo(s) cadastrado(s)
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="size-4 mr-2" />
              Novo Custo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : custos.length === 0 ? (
            <div className="empty-state py-12">
              <DollarSign className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum custo direto cadastrado</p>
              <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="size-4 mr-2" />
                Adicionar Primeiro Custo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item de Custo</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor Fixo</TableHead>
                  <TableHead className="text-right">Valor Unitário</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custos.map((custo) => (
                  <TableRow key={custo.id}>
                    <TableCell className="font-semibold">
                      {custo.item_custo?.nome || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-blue-500" />
                        {custo.centro_custo?.nome || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        custo.tipo_valor === "FIXO" ? "bg-blue-50 text-blue-700" :
                        custo.tipo_valor === "VARIAVEL" ? "bg-green-50 text-green-700" :
                        "bg-purple-50 text-purple-700"
                      }>
                        {TIPOS_VALOR.find(t => t.value === custo.tipo_valor)?.label || custo.tipo_valor}
                      </Badge>
                      {custo.tipo_calculo === "rateio" && (
                        <Badge variant="outline" className="ml-1 bg-orange-50 text-orange-700">
                          <Split className="h-2.5 w-2.5 mr-0.5" />
                          {custo.rateio_percentual}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatarValor(custo.valor_fixo)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {custo.valor_unitario_variavel ? (
                        <span>{formatarValor(custo.valor_unitario_variavel)}/{custo.unidade_medida}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {custo.funcao_base?.nome || (custo.tipo_medida ? TIPOS_MEDIDA.find(t => t.value === custo.tipo_medida)?.label : "-")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEditar(custo)}>
                          <Edit2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleExcluir(custo.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Custo Direto" : "Novo Custo Direto"}</DialogTitle>
            <DialogDescription>
              Configure o custo direto para alocação no Centro de Custo
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Centro de Custo e Item */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Centro de Custo *</Label>
                <Select
                  value={formData.centro_custo_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, centro_custo_id: v === "__none__" ? "" : v })}
                  disabled={formData.tipo_calculo === "rateio"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione um CC</SelectItem>
                    {centrosCustoDisponiveis.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.nome} ({cc.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.tipo_calculo === "rateio" && (
                  <p className="text-xs text-muted-foreground mt-1">Desabilitado no modo rateio</p>
                )}
              </div>
              <div>
                <Label>Item de Custo *</Label>
                <Select
                  value={formData.item_custo_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, item_custo_id: v === "__none__" ? "" : v })}
                  disabled={loadingItens}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingItens ? "Carregando..." : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione um item</SelectItem>
                    {itensCusto.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome} {item.fornecedor && `- ${item.fornecedor.nome}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de Valor */}
            <div>
              <Label className="mb-3 block">Tipo de Valor *</Label>
              <div className="grid grid-cols-3 gap-3">
                {TIPOS_VALOR.map((tipo) => {
                  const Icon = tipo.icon;
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_valor: tipo.value as TipoValorCusto })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        formData.tipo_valor === tipo.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-muted hover:border-green-200 hover:bg-green-50/50"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="font-medium text-sm">{tipo.label}</span>
                      <span className="text-xs text-center text-muted-foreground">{tipo.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Valor Fixo */}
            {mostrarCampoFixo && (
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                <Label htmlFor="valor_fixo" className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Valor Fixo Mensal (R$) *
                </Label>
                <Input
                  id="valor_fixo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_fixo}
                  onChange={(e) => setFormData({ ...formData, valor_fixo: e.target.value })}
                  placeholder="0,00"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este valor será aplicado igualmente em todos os meses do cenário
                </p>
              </div>
            )}

            {/* Componente Variável */}
            {mostrarCamposVariavel && (
              <div className="p-4 bg-green-50/50 rounded-lg border border-green-200 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <Label className="font-medium">Componente Variável</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor_unitario_variavel">Valor Unitário (R$) *</Label>
                    <Input
                      id="valor_unitario_variavel"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.valor_unitario_variavel}
                      onChange={(e) => setFormData({ ...formData, valor_unitario_variavel: e.target.value })}
                      placeholder="0,00"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>Unidade de Medida *</Label>
                    <Select
                      value={formData.unidade_medida || "__none__"}
                      onValueChange={(v) => setFormData({ ...formData, unidade_medida: v === "__none__" ? "" : v as UnidadeMedidaCusto })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione</SelectItem>
                        {UNIDADES_MEDIDA.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Base de Cálculo *</Label>
                  <Select
                    value={formData.tipo_medida || "__none__"}
                    onValueChange={(v) => setFormData({ ...formData, tipo_medida: v === "__none__" ? "" : v as TipoMedidaCusto })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione</SelectItem>
                      {TIPOS_MEDIDA.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <div>{t.label}</div>
                            <div className="text-xs text-muted-foreground">{t.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Função específica se necessário */}
                {(formData.tipo_medida === "HC_FUNCAO" || formData.tipo_medida === "PA_FUNCAO") && (
                  <div>
                    <Label>Função Base *</Label>
                    <Select
                      value={formData.funcao_base_id || "__none__"}
                      onValueChange={(v) => setFormData({ ...formData, funcao_base_id: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione</SelectItem>
                        {funcoes.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome} ({f.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      O cálculo será baseado na quantidade desta função
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rateio entre CCs */}
            {!editando && centrosCustoDisponiveis.length >= 2 && (
              <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    id="usar_rateio"
                    checked={formData.tipo_calculo === "rateio"}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      tipo_calculo: checked ? "rateio" : "manual",
                      rateio_ccs: checked ? [] : [],
                      centro_custo_id: checked ? "" : formData.centro_custo_id,
                    })}
                  />
                  <Label htmlFor="usar_rateio" className="flex items-center gap-2 cursor-pointer">
                    <Split className="h-4 w-4 text-orange-600" />
                    Ratear entre múltiplos Centros de Custo
                  </Label>
                </div>

                {formData.tipo_calculo === "rateio" && (
                  <div className="space-y-3 mt-4">
                    <Label className="text-xs font-medium">Distribuição por Centro de Custo *</Label>
                    <div className="space-y-2 p-3 bg-white rounded border max-h-48 overflow-y-auto">
                      {centrosCustoDisponiveis.map((cc) => {
                        const isSelected = formData.rateio_ccs.some(r => r.ccId === cc.id);
                        return (
                          <div key={cc.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleToggleRateioCC(cc, !!checked)}
                            />
                            <span className="flex-1 text-sm">{cc.nome}</span>
                            {isSelected && (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={formData.rateio_ccs.find(r => r.ccId === cc.id)?.percentual || 0}
                                  onChange={(e) => handleChangePercentualRateio(cc.id, parseFloat(e.target.value) || 0)}
                                  className="w-20 font-mono text-right h-8"
                                />
                                <span className="text-sm">%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className={`text-sm font-medium ${rateioValido ? "text-green-600" : "text-red-600"}`}>
                      Total: {totalPercentualRateio.toFixed(1)}% {rateioValido ? "✓" : "(deve ser 100%)"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Descrição */}
            <div>
              <Label htmlFor="descricao">Descrição / Observações</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
                placeholder="Detalhes adicionais sobre este custo..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={salvando || (formData.tipo_calculo === "rateio" && !rateioValido)}
              >
                {salvando && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editando ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

