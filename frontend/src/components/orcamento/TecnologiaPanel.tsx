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
  { value: "FIXO", label: "Fixo", description: "Somente valor fixo mensal" },
  { value: "FIXO_VARIAVEL", label: "Fixo + Variável", description: "Valor fixo + variável (PA ou HC)" },
  { value: "VARIAVEL", label: "Variável", description: "Somente variável (PA ou HC)" },
];

const TIPOS_VARIAVEL = [
  { value: "POR_PA", label: "Por PA" },
  { value: "POR_HC", label: "Por HC" },
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
    tipo_alocacao: "FIXO" as "FIXO" | "FIXO_VARIAVEL" | "VARIAVEL",
    valor_fixo_mensal: "",
    tipo_variavel: "" as "POR_PA" | "POR_HC" | "",
    valor_unitario_variavel: "",
    fator_multiplicador: "1.0",
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
        valor_fixo_mensal: formData.valor_fixo_mensal ? parseFloat(formData.valor_fixo_mensal) : null,
        tipo_variavel: formData.tipo_variavel || null,
        valor_unitario_variavel: formData.valor_unitario_variavel ? parseFloat(formData.valor_unitario_variavel) : null,
        fator_multiplicador: parseFloat(formData.fator_multiplicador),
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
      valor_fixo_mensal: "",
      tipo_variavel: "",
      valor_unitario_variavel: "",
      fator_multiplicador: "1.0",
      observacao: "",
    });
  };

  const handleEditar = (alocacao: AlocacaoTecnologia) => {
    setEditando(alocacao);
    setFormData({
      produto_id: alocacao.produto_id,
      tipo_alocacao: alocacao.tipo_alocacao,
      valor_fixo_mensal: alocacao.valor_fixo_mensal?.toString() || "",
      tipo_variavel: (alocacao.tipo_variavel as "POR_PA" | "POR_HC") || "",
      valor_unitario_variavel: alocacao.valor_unitario_variavel?.toString() || "",
      fator_multiplicador: alocacao.fator_multiplicador.toString(),
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

  const mostrarCampoFixo = formData.tipo_alocacao === "FIXO" || formData.tipo_alocacao === "FIXO_VARIAVEL";
  const mostrarCampoVariavel = formData.tipo_alocacao === "VARIAVEL" || formData.tipo_alocacao === "FIXO_VARIAVEL";

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
                  <TableHead className="text-right">Fixo Mensal</TableHead>
                  <TableHead>Variável</TableHead>
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
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {alocacao.valor_fixo_mensal ? formatarValor(alocacao.valor_fixo_mensal) : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {alocacao.tipo_variavel ? (
                          <div className="space-y-1">
                            <div className="text-muted-foreground">
                              {TIPOS_VARIAVEL.find(t => t.value === alocacao.tipo_variavel)?.label}
                            </div>
                            <div className="font-mono">
                              {formatarValor(alocacao.valor_unitario_variavel)} × {alocacao.fator_multiplicador}
                            </div>
                          </div>
                        ) : "-"}
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

            {/* Componente FIXO */}
            {mostrarCampoFixo && (
              <div>
                <Label htmlFor="valor_fixo_mensal">Valor Fixo Mensal * {formData.tipo_alocacao === "FIXO" && "(R$)"}</Label>
                <Input
                  id="valor_fixo_mensal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_fixo_mensal}
                  onChange={(e) => setFormData({ ...formData, valor_fixo_mensal: e.target.value })}
                  placeholder="Valor fixo mensal"
                  required={formData.tipo_alocacao === "FIXO"}
                />
              </div>
            )}

            {/* Componente VARIÁVEL */}
            {mostrarCampoVariavel && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                <Label className="text-base font-semibold">Componente Variável</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_variavel">Tipo *</Label>
                    <Select
                      value={formData.tipo_variavel}
                      onValueChange={(value: any) => setFormData({ ...formData, tipo_variavel: value })}
                      required={formData.tipo_alocacao === "VARIAVEL"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_VARIAVEL.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="valor_unitario_variavel">Valor Unitário *</Label>
                    <Input
                      id="valor_unitario_variavel"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_unitario_variavel}
                      onChange={(e) => setFormData({ ...formData, valor_unitario_variavel: e.target.value })}
                      placeholder="R$ por PA/HC"
                      required={formData.tipo_alocacao === "VARIAVEL"}
                    />
                  </div>
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
                    Multiplica a quantidade base (ex: 1.5 = 150% do PA/HC)
                  </p>
                </div>
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

            {/* Alertas */}
            {mostrarCampoVariavel && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Info:</strong> Os valores variáveis serão calculados automaticamente com base nos PAs/HCs do cenário.
                </div>
              </div>
            )}

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

