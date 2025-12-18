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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  Building2,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { fornecedores, type Fornecedor } from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";

export default function FornecedoresPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: "",
    codigo_nw: "",
    nome: "",
    nome_fantasia: "",
    cnpj: "",
    contato_nome: "",
    contato_email: "",
    contato_telefone: "",
    observacao: "",
    ativo: true,
  });
  
  const [fornecedoresNW, setFornecedoresNW] = useState<any[]>([]);
  const [selectedNW, setSelectedNW] = useState<string[]>([]);
  const [loadingNW, setLoadingNW] = useState(false);
  const [importando, setImportando] = useState(false);
  const [buscaNW, setBuscaNW] = useState("");

  useEffect(() => {
    if (token) carregarDados();
  }, [token, apenasAtivos]);

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
      const data = await fornecedores.listar(token, { 
        busca: busca || undefined,
        apenas_ativos: apenasAtivos
      });
      setFornecedoresList(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
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
        await fornecedores.atualizar(token, editando.id, formData);
        toast({
          title: "Fornecedor atualizado",
          description: "Fornecedor atualizado com sucesso.",
        });
      } else {
        await fornecedores.criar(token, formData);
        toast({
          title: "Fornecedor criado",
          description: "Fornecedor criado com sucesso.",
        });
      }
      setShowForm(false);
      resetForm();
      carregarDados();
    } catch (error: any) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao salvar fornecedor",
        description: error.response?.data?.detail || "Não foi possível salvar o fornecedor.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      codigo: "", codigo_nw: "", nome: "", nome_fantasia: "", cnpj: "",
      contato_nome: "", contato_email: "", contato_telefone: "", observacao: "", ativo: true,
    });
  };

  const handleEditar = (fornecedor: Fornecedor) => {
    setEditando(fornecedor);
    setFormData({
      codigo: fornecedor.codigo,
      codigo_nw: fornecedor.codigo_nw || "",
      nome: fornecedor.nome,
      nome_fantasia: fornecedor.nome_fantasia || "",
      cnpj: fornecedor.cnpj || "",
      contato_nome: fornecedor.contato_nome || "",
      contato_email: fornecedor.contato_email || "",
      contato_telefone: fornecedor.contato_telefone || "",
      observacao: fornecedor.observacao || "",
      ativo: fornecedor.ativo,
    });
    setShowForm(true);
  };

  const handleExcluir = async (id: string) => {
    if (!token) return;
    if (!confirm("Deseja realmente desativar este fornecedor?")) return;
    
    try {
      await fornecedores.excluir(token, id, true);
      toast({
        title: "Fornecedor desativado",
        description: "Fornecedor desativado com sucesso.",
      });
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao desativar fornecedor",
        description: "Não foi possível desativar o fornecedor.",
        variant: "destructive",
      });
    }
  };

  const carregarFornecedoresNW = async () => {
    if (!token) return;
    setLoadingNW(true);
    try {
      const data = await fornecedores.listarNW(token, { busca: buscaNW || undefined });
      setFornecedoresNW(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao carregar fornecedores do NW",
        description: "Não foi possível carregar a lista do NW.",
        variant: "destructive",
      });
    } finally {
      setLoadingNW(false);
    }
  };

  const handleImportar = async () => {
    if (!token || selectedNW.length === 0) return;
    
    setImportando(true);
    try {
      const resultado = await fornecedores.importarNW(token, selectedNW);
      toast({
        title: "Importação concluída",
        description: `${resultado.importados} fornecedor(es) importado(s) com sucesso.`,
      });
      setShowImport(false);
      setSelectedNW([]);
      carregarDados();
    } catch (error: any) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao importar",
        description: error.response?.data?.detail || "Não foi possível importar os fornecedores.",
        variant: "destructive",
      });
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de fornecedores de tecnologia
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowImport(true);
              carregarFornecedoresNW();
            }}
          >
            <Download className="size-4 mr-2" />
            Importar do NW
          </Button>
          <Button onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus className="size-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Fornecedores</CardTitle>
              <CardDescription>
                {fornecedoresList.length} fornecedor(es) cadastrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
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
                  placeholder="Buscar fornecedor..."
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
          ) : fornecedoresList.length === 0 ? (
            <div className="empty-state">
              <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedoresList.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="font-mono text-xs">{fornecedor.codigo}</TableCell>
                    <TableCell className="font-semibold">{fornecedor.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {fornecedor.nome_fantasia || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {fornecedor.cnpj || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fornecedor.contato_nome && (
                        <div>
                          <div className="font-medium">{fornecedor.contato_nome}</div>
                          {fornecedor.contato_email && (
                            <div className="text-xs text-muted-foreground">{fornecedor.contato_email}</div>
                          )}
                        </div>
                      )}
                      {!fornecedor.contato_nome && "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {fornecedor.ativo ? (
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
                          onClick={() => handleEditar(fornecedor)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        {fornecedor.ativo && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleExcluir(fornecedor.id)}
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
              {editando ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor
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
                  disabled={!!editando}
                />
              </div>
              <div>
                <Label htmlFor="codigo_nw">Código NW</Label>
                <Input
                  id="codigo_nw"
                  value={formData.codigo_nw}
                  onChange={(e) => setFormData({ ...formData, codigo_nw: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nome">Razão Social *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contato_nome">Nome do Contato</Label>
                <Input
                  id="contato_nome"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contato_email">E-mail</Label>
                <Input
                  id="contato_email"
                  type="email"
                  value={formData.contato_email}
                  onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contato_telefone">Telefone</Label>
                <Input
                  id="contato_telefone"
                  value={formData.contato_telefone}
                  onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
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

      {/* Diálogo de Importação */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Importar Fornecedores do NW</DialogTitle>
            <DialogDescription>
              Selecione os fornecedores que deseja importar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar no NW..."
                value={buscaNW}
                onChange={(e) => setBuscaNW(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && carregarFornecedoresNW()}
                className="pl-9"
              />
            </div>

            {loadingNW ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border rounded-lg max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Nome Fantasia</TableHead>
                      <TableHead>CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecedoresNW.map((forn) => (
                      <TableRow key={forn.codigo}>
                        <TableCell>
                          <Checkbox
                            checked={selectedNW.includes(forn.codigo)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedNW([...selectedNW, forn.codigo]);
                              } else {
                                setSelectedNW(selectedNW.filter(c => c !== forn.codigo));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{forn.codigo}</TableCell>
                        <TableCell>{forn.razao_social}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {forn.nome_fantasia || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{forn.cnpj || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-muted-foreground">
                {selectedNW.length} fornecedor(es) selecionado(s)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImport(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImportar}
                  disabled={selectedNW.length === 0 || importando}
                >
                  {importando && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Importar Selecionados
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

