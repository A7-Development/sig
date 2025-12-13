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
  Layers,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  secoesApi, 
  departamentosApi, 
  totvsApi, 
  type Secao, 
  type Departamento,
  type SecaoTotvs 
} from "@/lib/api/orcamento";

export default function SecoesPage() {
  const { accessToken: token } = useAuthStore();
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Secao | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    departamento_id: "",
    codigo: "",
    nome: "",
    codigo_totvs: "",
    ativo: true,
  });
  
  // Import state
  const [secoesTotvs, setSecoesTotvs] = useState<SecaoTotvs[]>([]);
  const [selectedTotvs, setSelectedTotvs] = useState<string[]>([]);
  const [loadingTotvs, setLoadingTotvs] = useState(false);
  const [importando, setImportando] = useState(false);
  const [deptoImport, setDeptoImport] = useState("");

  useEffect(() => {
    if (token) {
      carregarDados();
    }
  }, [token]);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [secoesData, deptosData] = await Promise.all([
        secoesApi.listar(token, { busca: busca || undefined, departamento_id: filtroDepto || undefined }),
        departamentosApi.listar(token, { ativo: true }),
      ]);
      setSecoes(secoesData);
      setDepartamentos(deptosData);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      if (editando) {
        await secoesApi.atualizar(token, editando.id, formData);
      } else {
        await secoesApi.criar(token, formData);
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarDados();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const resetForm = () => {
    setFormData({ departamento_id: "", codigo: "", nome: "", codigo_totvs: "", ativo: true });
  };

  const handleEdit = (secao: Secao) => {
    setEditando(secao);
    setFormData({
      departamento_id: secao.departamento_id,
      codigo: secao.codigo,
      nome: secao.nome,
      codigo_totvs: secao.codigo_totvs || "",
      ativo: secao.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir esta seção?")) return;
    try {
      await secoesApi.excluir(token, id);
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const abrirImportacao = async () => {
    if (!token) return;
    setShowImport(true);
    setLoadingTotvs(true);
    try {
      const data = await totvsApi.getSecoes(token);
      setSecoesTotvs(data);
    } catch (error) {
      console.error("Erro ao carregar TOTVS:", error);
    } finally {
      setLoadingTotvs(false);
    }
  };

  const handleImportar = async () => {
    if (!token || selectedTotvs.length === 0 || !deptoImport) return;
    setImportando(true);
    try {
      const resultado = await secoesApi.importarTotvs(token, selectedTotvs, deptoImport);
      alert(`Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`);
      setShowImport(false);
      setSelectedTotvs([]);
      setDeptoImport("");
      carregarDados();
    } catch (error) {
      console.error("Erro ao importar:", error);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seções</h1>
          <p className="text-muted-foreground">
            Unidades operacionais dentro dos departamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="h-4 w-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Seção
          </Button>
        </div>
      </div>

      {/* Filtros */}
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
              />
            </div>
            <select
              className="border rounded-md px-3 py-2"
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value)}
            >
              <option value="">Todos os departamentos</option>
              {departamentos.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={carregarDados}>Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Seções Cadastradas</CardTitle>
          <CardDescription>{secoes.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : secoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma seção cadastrada
            </div>
          ) : (
            <div className="space-y-2">
              {secoes.map((secao) => (
                <div
                  key={secao.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      secao.ativo ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{secao.nome}</span>
                        {secao.ativo ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Código: {secao.codigo}
                        {secao.departamento && ` • Depto: ${secao.departamento.nome}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(secao)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(secao.id)}>
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
              <CardTitle>{editando ? "Editar Seção" : "Nova Seção"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Departamento *</label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.departamento_id}
                    onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
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
              <CardTitle>Importar Seções do TOTVS</CardTitle>
              <CardDescription>
                Selecione o departamento de destino e as seções a importar
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
              <div>
                <label className="text-sm font-medium">Departamento de destino *</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={deptoImport}
                  onChange={(e) => setDeptoImport(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {departamentos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>
              {loadingTotvs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {secoesTotvs.map((secao) => (
                    <div
                      key={secao.codigo}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                        selectedTotvs.includes(secao.codigo) ? "bg-purple-50 border-purple-300" : "hover:bg-accent/50"
                      }`}
                      onClick={() => toggleSelectTotvs(secao.codigo)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTotvs.includes(secao.codigo)}
                        onChange={() => {}}
                      />
                      <div>
                        <p className="font-medium">{secao.descricao}</p>
                        <p className="text-sm text-muted-foreground">Código: {secao.codigo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{selectedTotvs.length} selecionados</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImport(false)}>Cancelar</Button>
                <Button onClick={handleImportar} disabled={selectedTotvs.length === 0 || !deptoImport || importando}>
                  {importando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

