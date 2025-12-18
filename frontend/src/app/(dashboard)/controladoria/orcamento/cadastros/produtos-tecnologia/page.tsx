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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Server,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { produtosTecnologia, fornecedores, type ProdutoTecnologia, type Fornecedor } from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";

const CATEGORIAS = [
  { value: "DISCADOR", label: "Discador" },
  { value: "URA", label: "URA" },
  { value: "AGENTE_VIRTUAL", label: "Agente Virtual" },
  { value: "QUALIDADE", label: "Sistema de Qualidade" },
  { value: "AUTOMACAO", label: "Automação" },
  { value: "CRM", label: "CRM" },
  { value: "ANALYTICS", label: "Analytics" },
  { value: "OUTROS", label: "Outros" },
];


export default function ProdutosTecnologiaPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<ProdutoTecnologia[]>([]);
  const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("ALL");
  const [filtroFornecedor, setFiltroFornecedor] = useState("ALL");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<ProdutoTecnologia | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    fornecedor_id: "",
    codigo: "",
    nome: "",
    categoria: "OUTROS",
    valor_base: "",
    unidade_medida: "",
    descricao: "",
    ativo: true,
  });

  useEffect(() => {
    if (token) {
      carregarFornecedores();
      carregarDados();
    }
  }, [token, apenasAtivos, filtroCategoria, filtroFornecedor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) carregarDados();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarFornecedores = async () => {
    if (!token) return;
    try {
      const data = await fornecedores.listar(token, { apenas_ativos: true });
      setFornecedoresList(data);
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
    }
  };

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await produtosTecnologia.listar(token, { 
        busca: busca || undefined,
        categoria: filtroCategoria !== "ALL" ? filtroCategoria : undefined,
        fornecedor_id: filtroFornecedor !== "ALL" ? filtroFornecedor : undefined,
        apenas_ativos: apenasAtivos
      });
      setProdutos(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setSalvando(true);
    try {
      const basePayload = {
        fornecedor_id: formData.fornecedor_id,
        nome: formData.nome,
        categoria: formData.categoria,
        valor_base: formData.valor_base ? parseFloat(formData.valor_base) : null,
        unidade_medida: formData.unidade_medida || null,
        descricao: formData.descricao || null,
        ativo: formData.ativo,
      };

      if (editando) {
        const payload = { ...basePayload, codigo: formData.codigo };
        console.log("Payload UPDATE:", payload);
        await produtosTecnologia.atualizar(token, editando.id, payload);
        toast({
          title: "Produto atualizado",
          description: "Produto atualizado com sucesso.",
        });
      } else {
        // Na criação, não envia o campo codigo - será gerado automaticamente pelo backend
        console.log("Payload CREATE:", basePayload);
        await produtosTecnologia.criar(token, basePayload);
        toast({
          title: "Produto criado",
          description: "Produto criado com sucesso. Código gerado automaticamente.",
        });
      }
      setShowForm(false);
      resetForm();
      carregarDados();
    } catch (error: any) {
      console.error("Erro completo:", error);
      console.error("Erro response:", error.response);
      console.error("Erro response data:", error.response?.data);
      
      let errorMessage = "Não foi possível salvar o produto.";
      const detail = error.response?.data?.detail;
      
      if (detail) {
        if (Array.isArray(detail)) {
          // Erro de validação do Pydantic
          errorMessage = detail.map((e: any) => {
            const field = e.loc?.slice(1).join('.') || 'campo';
            return `${field}: ${e.msg}`;
          }).join('; ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      
      toast({
        title: "Erro ao salvar produto",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      fornecedor_id: "",
      codigo: "",
      nome: "",
      categoria: "OUTROS",
      valor_base: "",
      unidade_medida: "",
      descricao: "",
      ativo: true,
    });
  };

  const handleEditar = (produto: ProdutoTecnologia) => {
    setEditando(produto);
    setFormData({
      fornecedor_id: produto.fornecedor_id,
      codigo: produto.codigo,
      nome: produto.nome,
      categoria: produto.categoria,
      valor_base: produto.valor_base?.toString() || "",
      unidade_medida: produto.unidade_medida || "",
      descricao: produto.descricao || "",
      ativo: produto.ativo,
    });
    setShowForm(true);
  };

  const handleExcluir = async (id: string) => {
    if (!token) return;
    if (!confirm("Deseja realmente desativar este produto?")) return;
    
    try {
      await produtosTecnologia.excluir(token, id, true);
      toast({
        title: "Produto desativado",
        description: "Produto desativado com sucesso.",
      });
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao desativar produto",
        description: "Não foi possível desativar o produto.",
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

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Produtos de Tecnologia</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de produtos e soluções de tecnologia
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowForm(true);
        }}>
          <Plus className="size-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Produtos</CardTitle>
              <CardDescription>
                {produtos.length} produto(s) cadastrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {fornecedoresList.map((forn) => (
                    <SelectItem key={forn.id} value={forn.id}>
                      {forn.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apenas-ativos"
                  checked={apenasAtivos}
                  onCheckedChange={(checked) => setApenasAtivos(checked === true)}
                />
                <Label htmlFor="apenas-ativos" className="text-sm cursor-pointer">
                  Apenas ativos
                </Label>
              </div>
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : produtos.length === 0 ? (
            <div className="empty-state">
              <Server className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca || filtroCategoria || filtroFornecedor ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor Base</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-mono text-xs">{produto.codigo}</TableCell>
                    <TableCell className="font-semibold">{produto.nome}</TableCell>
                    <TableCell className="text-sm">
                      {produto.fornecedor?.nome || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIAS.find(c => c.value === produto.categoria)?.label || produto.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatarValor(produto.valor_base)}
                    </TableCell>
                    <TableCell className="text-center">
                      {produto.ativo ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="size-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="size-3" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEditar(produto)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        {produto.ativo && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleExcluir(produto.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do produto de tecnologia
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Código - apenas visível na edição */}
            {editando && (
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código gerado automaticamente pelo sistema
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="fornecedor_id">Fornecedor *</Label>
              <Select
                value={formData.fornecedor_id}
                onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {fornecedoresList.map((forn) => (
                    <SelectItem key={forn.id} value={forn.id}>
                      {forn.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nome">Nome do Produto *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor_base">Valor Base/Referência</Label>
                <Input
                  id="valor_base"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_base}
                  onChange={(e) => setFormData({ ...formData, valor_base: e.target.value })}
                  placeholder="Valor tabela do fornecedor"
                />
              </div>
              <div>
                <Label htmlFor="unidade_medida">Unidade de Medida</Label>
                <Input
                  id="unidade_medida"
                  value={formData.unidade_medida}
                  onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                  placeholder="Ex: licença, unidade, PA, HC"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked === true })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
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

