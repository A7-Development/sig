"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { centrosCustoApi, totvsApi, type CentroCusto, type CentroCustoTotvs } from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";

const TIPOS_CC = [
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "OVERHEAD", label: "Overhead" },
];

export default function CentrosCustoPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("ALL");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<CentroCusto | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    codigo_totvs: "",
    tipo: "OPERACIONAL" as "OPERACIONAL" | "ADMINISTRATIVO" | "OVERHEAD",
    cliente: "",
    contrato: "",
    uf: "",
    cidade: "",
    ativo: true,
  });
  
  const [ccsTotvs, setCcsTotvs] = useState<CentroCustoTotvs[]>([]);
  const [selectedTotvs, setSelectedTotvs] = useState<string[]>([]);
  const [loadingTotvs, setLoadingTotvs] = useState(false);
  const [importando, setImportando] = useState(false);
  const [tipoImport, setTipoImport] = useState("OPERACIONAL");

  useEffect(() => {
    if (token) carregarDados();
  }, [token, apenasAtivos, filtroTipo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) carregarDados();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await centrosCustoApi.listar(token, { 
        busca: busca || undefined, 
        tipo: filtroTipo !== "ALL" ? filtroTipo : undefined,
        ativo: apenasAtivos,
      });
      setCentrosCusto(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os centros de custo.",
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
      if (editando) {
        await centrosCustoApi.atualizar(token, editando.id, formData);
        toast({
          title: "Centro de custo atualizado",
          description: "Centro de custo atualizado com sucesso.",
        });
      } else {
        await centrosCustoApi.criar(token, formData);
        toast({
          title: "Centro de custo criado",
          description: "Centro de custo criado com sucesso.",
        });
      }
      setShowForm(false);
      resetForm();
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o centro de custo.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      codigo: "", nome: "", codigo_totvs: "", tipo: "OPERACIONAL",
      cliente: "", contrato: "", uf: "", cidade: "", ativo: true,
    });
  };

  const handleEdit = (cc: CentroCusto) => {
    setEditando(cc);
    setFormData({
      codigo: cc.codigo,
      nome: cc.nome,
      codigo_totvs: cc.codigo_totvs || "",
      tipo: cc.tipo,
      cliente: cc.cliente || "",
      contrato: cc.contrato || "",
      uf: cc.uf || "",
      cidade: cc.cidade || "",
      ativo: cc.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir este centro de custo?")) return;
    try {
      await centrosCustoApi.excluir(token, id);
      toast({
        title: "Centro de custo excluído",
        description: "Centro de custo excluído com sucesso.",
      });
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o centro de custo.",
        variant: "destructive",
      });
    }
  };

  const abrirImportacao = async () => {
    if (!token) return;
    setShowImport(true);
    setLoadingTotvs(true);
    try {
      const data = await totvsApi.getCentrosCusto(token);
      setCcsTotvs(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao carregar TOTVS",
        description: "Não foi possível carregar os centros de custo do TOTVS.",
        variant: "destructive",
      });
    } finally {
      setLoadingTotvs(false);
    }
  };

  const handleImportar = async () => {
    if (!token || selectedTotvs.length === 0) return;
    setImportando(true);
    try {
      const resultado = await centrosCustoApi.importarTotvs(token, selectedTotvs, tipoImport);
      toast({
        title: "Importação concluída",
        description: `Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`,
      });
      setShowImport(false);
      setSelectedTotvs([]);
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao importar",
        description: "Não foi possível importar os centros de custo.",
        variant: "destructive",
      });
    } finally {
      setImportando(false);
    }
  };

  const toggleSelectTotvs = (codigo: string) => {
    setSelectedTotvs(prev => 
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Centros de Custo</h1>
          <p className="text-sm text-muted-foreground">
            Objetos de custeio para alocação de custos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="size-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="size-4 mr-2" />
            Novo Centro de Custo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Centros de Custo</CardTitle>
              <CardDescription>
                {centrosCusto.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  {TIPOS_CC.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
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
                  placeholder="Buscar centro de custo..."
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
          ) : centrosCusto.length === 0 ? (
            <div className="empty-state">
              <CircleDollarSign className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca || filtroTipo !== "ALL" ? "Nenhum centro de custo encontrado" : "Nenhum centro de custo cadastrado"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centrosCusto.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-mono text-xs">{cc.codigo}</TableCell>
                    <TableCell className="font-semibold">{cc.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TIPOS_CC.find(t => t.value === cc.tipo)?.label || cc.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {cc.cliente || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cc.cidade && cc.uf ? `${cc.cidade}/${cc.uf}` : cc.uf || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {cc.ativo ? (
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
                          onClick={() => handleEdit(cc)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(cc.id)}
                        >
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Centro de Custo" : "Novo Centro de Custo"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do centro de custo
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as typeof formData.tipo })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CC.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contrato">Contrato</Label>
                <Input
                  id="contrato"
                  value={formData.contrato}
                  onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
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

      {/* Diálogo de Importação */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar do TOTVS</DialogTitle>
            <DialogDescription>
              Selecione os centros de custo para importar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div>
              <Label>Tipo do CC importado</Label>
              <Select value={tipoImport} onValueChange={setTipoImport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CC.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingTotvs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ccsTotvs.map((cc) => (
                      <TableRow 
                        key={cc.codigo}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelectTotvs(cc.codigo)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTotvs.includes(cc.codigo)}
                            onCheckedChange={() => toggleSelectTotvs(cc.codigo)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cc.codigo}</TableCell>
                        <TableCell>{cc.nome || cc.codigo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">{selectedTotvs.length} selecionados</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImportar} disabled={selectedTotvs.length === 0 || importando}>
                {importando && <Loader2 className="size-4 mr-2 animate-spin" />}
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
