"use client";

import { useState, useEffect } from "react";
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
import {
  Plus,
  Edit2,
  Trash2,
  Server,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  alocacoesTecnologia,
  produtosTecnologia,
  type AlocacaoTecnologia,
  type ProdutoTecnologia,
} from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";

interface TecnologiaPanelProps {
  cenarioId: string;
  secaoId: string;
  secaoNome?: string;
}

const TIPOS_ALOCACAO = [
  { value: "FIXO", label: "Fixo", description: "Valor fixo mensal baseado no produto" },
  { value: "VARIAVEL", label: "Variável", description: "Quantidade variável por mês" },
  { value: "RATEIO", label: "Rateio", description: "Percentual de rateio sobre operação" },
];

export default function TecnologiaPanel({
  cenarioId,
  secaoId,
  secaoNome,
}: TecnologiaPanelProps) {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  
  const [alocacoes, setAlocacoes] = useState<AlocacaoTecnologia[]>([]);
  const [produtos, setProdutos] = useState<ProdutoTecnologia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<AlocacaoTecnologia | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    produto_id: "",
    tipo_alocacao: "FIXO" as "FIXO" | "VARIAVEL" | "RATEIO",
    valor_override: "",
    fator_multiplicador: "1.0",
    percentual_rateio: "",
    observacao: "",
  });

  useEffect(() => {
    if (token) {
      carregarAlocacoes();
      carregarProdutos();
    }
  }, [token, cenarioId, secaoId]);

  const carregarAlocacoes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await alocacoesTecnologia.listar(token, cenarioId, {
        cenario_secao_id: secaoId,
        ativo: true,
      });
      setAlocacoes(data);
    } catch (error) {
      console.error("Erro ao carregar alocações:", error);
      toast({
        title: "Erro ao carregar alocações",
        description: "Não foi possível carregar as alocações de tecnologia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarProdutos = async () => {
    if (!token) return;
    setLoadingProdutos(true);
    try {
      const data = await produtosTecnologia.listar(token, { apenas_ativos: true });
      setProdutos(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setSalvando(true);
    try {
      const payload = {
        cenario_id: cenarioId,
        cenario_secao_id: secaoId,
        produto_id: formData.produto_id,
        tipo_alocacao: formData.tipo_alocacao,
        valor_override: formData.valor_override ? parseFloat(formData.valor_override) : null,
        fator_multiplicador: formData.fator_multiplicador ? parseFloat(formData.fator_multiplicador) : 1.0,
        percentual_rateio: formData.percentual_rateio ? parseFloat(formData.percentual_rateio) : null,
        observacao: formData.observacao || null,
      };

      if (editando) {
        await alocacoesTecnologia.atualizar(token, editando.id, payload);
        toast({
          title: "Alocação atualizada",
          description: "Alocação de tecnologia atualizada com sucesso.",
        });
      } else {
        await alocacoesTecnologia.criar(token, payload);
        toast({
          title: "Alocação criada",
          description: "Alocação de tecnologia criada com sucesso.",
        });
      }
      
      setShowForm(false);
      resetForm();
      carregarAlocacoes();
    } catch (error: any) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao salvar alocação",
        description: error.response?.data?.detail || "Não foi possível salvar a alocação.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      produto_id: "",
      tipo_alocacao: "FIXO",
      valor_override: "",
      fator_multiplicador: "1.0",
      percentual_rateio: "",
      observacao: "",
    });
  };

  const handleEditar = (alocacao: AlocacaoTecnologia) => {
    setEditando(alocacao);
    setFormData({
      produto_id: alocacao.produto_id,
      tipo_alocacao: alocacao.tipo_alocacao as "FIXO" | "VARIAVEL" | "RATEIO",
      valor_override: alocacao.valor_override?.toString() || "",
      fator_multiplicador: alocacao.fator_multiplicador?.toString() || "1.0",
      percentual_rateio: alocacao.percentual_rateio?.toString() || "",
      observacao: alocacao.observacao || "",
    });
    setShowForm(true);
  };

  const handleExcluir = async (id: string) => {
    if (!token) return;
    if (!confirm("Deseja realmente excluir esta alocação?")) return;
    
    try {
      await alocacoesTecnologia.excluir(token, id, true);
      toast({
        title: "Alocação removida",
        description: "Alocação de tecnologia removida com sucesso.",
      });
      carregarAlocacoes();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao remover alocação",
        description: "Não foi possível remover a alocação.",
        variant: "destructive",
      });
    }
  };


  const formatarValor = (valor: number | null | undefined) => {
    if (!valor) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const mostrarCampoRateio = formData.tipo_alocacao === "RATEIO";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="section-title">Alocações de Tecnologia</CardTitle>
              <CardDescription>
                {secaoNome && `Seção: ${secaoNome} • `}
                {alocacoes.length} alocação(ões) cadastrada(s)
              </CardDescription>
            </div>
            <Button onClick={() => {
              resetForm();
              setShowForm(true);
            }}>
              <Plus className="size-4 mr-2" />
              Nova Alocação
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
          ) : alocacoes.length === 0 ? (
            <div className="empty-state">
              <Server className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma alocação de tecnologia cadastrada
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus className="size-4 mr-2" />
                Adicionar Primeira Alocação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor Override</TableHead>
                  <TableHead className="text-right">Fator</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alocacoes.map((alocacao) => {
                  return (
                    <TableRow key={alocacao.id}>
                      <TableCell className="font-semibold">
                        {alocacao.produto?.nome || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {alocacao.produto?.fornecedor?.nome || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TIPOS_ALOCACAO.find(t => t.value === alocacao.tipo_alocacao)?.label || alocacao.tipo_alocacao}
                        </Badge>
                        {alocacao.percentual_rateio && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({alocacao.percentual_rateio}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {alocacao.valor_override ? formatarValor(alocacao.valor_override) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {alocacao.fator_multiplicador ?? 1.0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEditar(alocacao)}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleExcluir(alocacao.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Alocação" : "Nova Alocação"}
            </DialogTitle>
            <DialogDescription>
              Configure a alocação de tecnologia para esta seção
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Produto e Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="produto_id">Produto *</Label>
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) => setFormData({ ...formData, produto_id: value })}
                  required
                  disabled={loadingProdutos}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProdutos ? "Carregando..." : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.nome} - {prod.fornecedor?.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tipo_alocacao">Tipo de Alocação *</Label>
                <Select
                  value={formData.tipo_alocacao}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo_alocacao: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ALOCACAO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div>
                          <div>{tipo.label}</div>
                          <div className="text-xs text-muted-foreground">{tipo.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valor Override e Fator */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor_override">Valor Override (R$)</Label>
                <Input
                  id="valor_override"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_override}
                  onChange={(e) => setFormData({ ...formData, valor_override: e.target.value })}
                  placeholder="Valor para sobrescrever cálculo automático"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe em branco para usar o valor do produto
                </p>
              </div>
              <div>
                <Label htmlFor="fator_multiplicador">Fator Multiplicador</Label>
                <Input
                  id="fator_multiplicador"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fator_multiplicador}
                  onChange={(e) => setFormData({ ...formData, fator_multiplicador: e.target.value })}
                  placeholder="1.0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Multiplicador para cálculo (padrão: 1.0)
                </p>
              </div>
            </div>

            {/* Percentual de Rateio */}
            {mostrarCampoRateio && (
              <div>
                <Label htmlFor="percentual_rateio">Percentual de Rateio (%)</Label>
                <Input
                  id="percentual_rateio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percentual_rateio}
                  onChange={(e) => setFormData({ ...formData, percentual_rateio: e.target.value })}
                  placeholder="0.00"
                  required={formData.tipo_alocacao === "RATEIO"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Percentual do custo a ser rateado para esta seção
                </p>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
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

