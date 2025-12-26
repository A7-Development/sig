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
import { departamentosApi, totvsApi, type Departamento, type DepartamentoTotvs } from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";

export default function DepartamentosPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Departamento | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    codigo_totvs: "",
    ativo: true,
  });
  
  // Import state
  const [deptosTotvs, setDeptosTotvs] = useState<DepartamentoTotvs[]>([]);
  const [selectedTotvs, setSelectedTotvs] = useState<string[]>([]);
  const [loadingTotvs, setLoadingTotvs] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (token) {
      carregarDepartamentos();
    }
  }, [token, apenasAtivos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) carregarDepartamentos();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarDepartamentos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await departamentosApi.listar(token, { 
        busca: busca || undefined,
        ativo: apenasAtivos,
      });
      setDepartamentos(data);
    } catch (error) {
      console.error("Erro ao carregar departamentos:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os departamentos.",
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
        await departamentosApi.atualizar(token, editando.id, formData);
        toast({
          title: "Departamento atualizado",
          description: "Departamento atualizado com sucesso.",
        });
      } else {
        await departamentosApi.criar(token, formData);
        toast({
          title: "Departamento criado",
          description: "Departamento criado com sucesso.",
        });
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarDepartamentos();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o departamento.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setFormData({ codigo: "", nome: "", codigo_totvs: "", ativo: true });
  };

  const handleEdit = (depto: Departamento) => {
    setEditando(depto);
    setFormData({
      codigo: depto.codigo,
      nome: depto.nome,
      codigo_totvs: depto.codigo_totvs || "",
      ativo: depto.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir este departamento?")) return;
    
    try {
      await departamentosApi.excluir(token, id);
      toast({
        title: "Departamento excluído",
        description: "Departamento excluído com sucesso.",
      });
      carregarDepartamentos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o departamento.",
        variant: "destructive",
      });
    }
  };

  const abrirImportacao = async () => {
    if (!token) return;
    setShowImport(true);
    setLoadingTotvs(true);
    try {
      const data = await totvsApi.getDepartamentos(token);
      setDeptosTotvs(data);
    } catch (error) {
      console.error("Erro ao carregar TOTVS:", error);
      toast({
        title: "Erro ao carregar TOTVS",
        description: "Não foi possível carregar os departamentos do TOTVS.",
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
      const resultado = await departamentosApi.importarTotvs(token, selectedTotvs);
      toast({
        title: "Importação concluída",
        description: `Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`,
      });
      setShowImport(false);
      setSelectedTotvs([]);
      carregarDepartamentos();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro ao importar",
        description: "Não foi possível importar os departamentos.",
        variant: "destructive",
      });
    } finally {
      setImportando(false);
    }
  };

  const toggleSelectTotvs = (codigo: string) => {
    setSelectedTotvs(prev => 
      prev.includes(codigo) 
        ? prev.filter(c => c !== codigo)
        : [...prev, codigo]
    );
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Departamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a estrutura organizacional da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="size-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
            <Plus className="size-4 mr-2" />
            Novo Departamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Departamentos</CardTitle>
              <CardDescription>
                {departamentos.length} registro(s) encontrado(s)
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
                  placeholder="Buscar departamento..."
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
          ) : departamentos.length === 0 ? (
            <div className="empty-state">
              <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca ? "Nenhum departamento encontrado" : "Nenhum departamento cadastrado"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código TOTVS</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departamentos.map((depto) => (
                  <TableRow key={depto.id}>
                    <TableCell className="font-mono text-xs">{depto.codigo}</TableCell>
                    <TableCell className="font-semibold">{depto.nome}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {depto.codigo_totvs || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {depto.ativo ? (
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
                          onClick={() => handleEdit(depto)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(depto.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Departamento" : "Novo Departamento"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do departamento
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="codigo_totvs">Código TOTVS (opcional)</Label>
              <Input
                id="codigo_totvs"
                value={formData.codigo_totvs}
                onChange={(e) => setFormData({ ...formData, codigo_totvs: e.target.value })}
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

      {/* Diálogo de Importação TOTVS */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Departamentos do TOTVS</DialogTitle>
            <DialogDescription>
              Selecione os departamentos que deseja importar do CORPORERM
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
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
                    {deptosTotvs.map((depto) => (
                      <TableRow 
                        key={depto.codigo}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelectTotvs(depto.codigo)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTotvs.includes(depto.codigo)}
                            onCheckedChange={() => toggleSelectTotvs(depto.codigo)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{depto.codigo}</TableCell>
                        <TableCell>{depto.nome}</TableCell>
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
