"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departamentos</h1>
          <p className="text-muted-foreground">
            Gerencie a estrutura organizacional da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="h-4 w-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { setEditando(null); setFormData({ codigo: "", nome: "", codigo_totvs: "", ativo: true }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Departamento
          </Button>
        </div>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregarDepartamentos()}
              />
            </div>
            <Button variant="secondary" onClick={carregarDepartamentos}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Departamentos Cadastrados</CardTitle>
          <CardDescription>{departamentos.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : departamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum departamento cadastrado
            </div>
          ) : (
            <div className="space-y-2">
              {departamentos.map((depto) => (
                <div
                  key={depto.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      depto.ativo ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{depto.nome}</span>
                        {depto.ativo ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Código: {depto.codigo}
                        {depto.codigo_totvs && ` • TOTVS: ${depto.codigo_totvs}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(depto)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(depto.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editando ? "Editar Departamento" : "Novo Departamento"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Código *</label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Código TOTVS (opcional)</label>
                  <Input
                    value={formData.codigo_totvs}
                    onChange={(e) => setFormData({ ...formData, codigo_totvs: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label className="text-sm">Ativo</label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
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
            <CardContent className="flex-1 overflow-auto">
              {loadingTotvs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {deptosTotvs.map((depto) => (
                    <div
                      key={depto.codigo}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTotvs.includes(depto.codigo) ? "bg-blue-50 border-blue-300" : "hover:bg-accent/50"
                      }`}
                      onClick={() => toggleSelectTotvs(depto.codigo)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTotvs.includes(depto.codigo)}
                        onChange={() => toggleSelectTotvs(depto.codigo)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium">{depto.nome}</p>
                        <p className="text-sm text-muted-foreground">Código: {depto.codigo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedTotvs.length} selecionados
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImport(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleImportar} disabled={selectedTotvs.length === 0 || importando}>
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

