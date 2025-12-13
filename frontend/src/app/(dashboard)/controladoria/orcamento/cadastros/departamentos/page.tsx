"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  Building2,
  Loader2,
  FileX
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { departamentosApi, totvsApi, type Departamento, type DepartamentoTotvs } from "@/lib/api/orcamento";

export default function DepartamentosPage() {
  const { accessToken: token } = useAuthStore();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Departamento | null>(null);
  
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
  }, [token]);

  const carregarDepartamentos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await departamentosApi.listar(token, { busca: busca || undefined });
      setDepartamentos(data);
    } catch (error) {
      console.error("Erro ao carregar departamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      if (editando) {
        await departamentosApi.atualizar(token, editando.id, formData);
      } else {
        await departamentosApi.criar(token, formData);
      }
      setShowForm(false);
      setEditando(null);
      setFormData({ codigo: "", nome: "", codigo_totvs: "", ativo: true });
      carregarDepartamentos();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
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
      carregarDepartamentos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
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
    } finally {
      setLoadingTotvs(false);
    }
  };

  const handleImportar = async () => {
    if (!token || selectedTotvs.length === 0) return;
    setImportando(true);
    try {
      const resultado = await departamentosApi.importarTotvs(token, selectedTotvs);
      alert(`Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`);
      setShowImport(false);
      setSelectedTotvs([]);
      carregarDepartamentos();
    } catch (error) {
      console.error("Erro ao importar:", error);
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
      {/* Header da página */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title">Departamentos</h1>
            <Badge variant="info" className="text-[10px]">
              {departamentos.length} registros
            </Badge>
          </div>
          <p className="page-subtitle">
            Gerencie a estrutura organizacional da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={abrirImportacao}>
            <Download className="h-4 w-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button 
            variant="success" 
            size="sm"
            onClick={() => { 
              setEditando(null); 
              setFormData({ codigo: "", nome: "", codigo_totvs: "", ativo: true }); 
              setShowForm(true); 
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Departamento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="filter-container">
            <div className="filter-group flex-1">
              <label className="filter-label">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou nome..."
                  className="pl-9 h-8 text-xs"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && carregarDepartamentos()}
                />
              </div>
            </div>
            <div className="filter-divider" />
            <Button variant="secondary" size="sm" onClick={carregarDepartamentos}>
              <Search className="h-4 w-4 mr-1" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Departamentos Cadastrados</CardTitle>
          <CardDescription>{departamentos.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : departamentos.length === 0 ? (
            <div className="empty-state my-8 mx-4">
              <FileX className="empty-state-icon" />
              <p className="empty-state-title">Nenhum departamento cadastrado</p>
              <p className="empty-state-description">
                Clique em &quot;Novo Departamento&quot; para adicionar ou importe do TOTVS.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-32">Código TOTVS</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departamentos.map((depto) => (
                  <TableRow key={depto.id}>
                    <TableCell>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        depto.ativo ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{depto.codigo}</TableCell>
                    <TableCell className="font-medium">{depto.nome}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {depto.codigo_totvs || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={depto.ativo ? "success" : "secondary"} className="text-[10px]">
                        {depto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon-xs" 
                          onClick={() => handleEdit(depto)}
                          className="hover:bg-orange-50 hover:text-orange-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-xs" 
                          onClick={() => handleDelete(depto.id)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editando ? "Editar Departamento" : "Novo Departamento"}</CardTitle>
              <CardDescription>
                {editando ? "Atualize as informações do departamento" : "Preencha os dados do novo departamento"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-field">
                  <label className="filter-label">Código *</label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="h-8 text-sm"
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="filter-label">Nome *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-8 text-sm"
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="filter-label">Código TOTVS (opcional)</label>
                  <Input
                    value={formData.codigo_totvs}
                    onChange={(e) => setFormData({ ...formData, codigo_totvs: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="ativo" className="text-sm">Ativo</label>
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="success" size="sm">
                    {editando ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Importação TOTVS */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Importar do TOTVS</CardTitle>
              <CardDescription>
                Selecione os departamentos que deseja importar do CORPORERM
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {loadingTotvs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-32">Código</TableHead>
                      <TableHead>Nome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptosTotvs.map((depto) => (
                      <TableRow 
                        key={depto.codigo}
                        className={`cursor-pointer ${
                          selectedTotvs.includes(depto.codigo) ? "bg-orange-50" : ""
                        }`}
                        onClick={() => toggleSelectTotvs(depto.codigo)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTotvs.includes(depto.codigo)}
                            onChange={() => toggleSelectTotvs(depto.codigo)}
                            className="h-4 w-4 rounded border-border"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{depto.codigo}</TableCell>
                        <TableCell>{depto.nome}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <div className="p-4 border-t flex justify-between items-center bg-muted/5">
              <span className="text-xs text-muted-foreground">
                {selectedTotvs.length} selecionados
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowImport(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant="success" 
                  size="sm" 
                  onClick={handleImportar} 
                  disabled={selectedTotvs.length === 0 || importando}
                >
                  {importando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar Selecionados
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
