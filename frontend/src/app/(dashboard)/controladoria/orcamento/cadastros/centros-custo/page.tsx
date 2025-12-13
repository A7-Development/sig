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
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { centrosCustoApi, totvsApi, type CentroCusto, type CentroCustoTotvs } from "@/lib/api/orcamento";

const TIPOS_CC = [
  { value: "OPERACIONAL", label: "Operacional", color: "bg-emerald-100 text-emerald-600" },
  { value: "ADMINISTRATIVO", label: "Administrativo", color: "bg-blue-100 text-blue-600" },
  { value: "OVERHEAD", label: "Overhead", color: "bg-orange-100 text-orange-600" },
];

export default function CentrosCustoPage() {
  const { accessToken: token } = useAuthStore();
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<CentroCusto | null>(null);
  
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    codigo_totvs: "",
    tipo: "OPERACIONAL" as const,
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
  }, [token]);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await centrosCustoApi.listar(token, { 
        busca: busca || undefined, 
        tipo: filtroTipo || undefined 
      });
      setCentrosCusto(data);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editando) {
        await centrosCustoApi.atualizar(token, editando.id, formData);
      } else {
        await centrosCustoApi.criar(token, formData);
      }
      setShowForm(false);
      resetForm();
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
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
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
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
    } finally {
      setLoadingTotvs(false);
    }
  };

  const handleImportar = async () => {
    if (!token || selectedTotvs.length === 0) return;
    setImportando(true);
    try {
      const resultado = await centrosCustoApi.importarTotvs(token, selectedTotvs, tipoImport);
      alert(`Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`);
      setShowImport(false);
      setSelectedTotvs([]);
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setImportando(false);
    }
  };

  const toggleSelectTotvs = (codigo: string) => {
    setSelectedTotvs(prev => 
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  };

  const getTipoInfo = (tipo: string) => TIPOS_CC.find(t => t.value === tipo) || TIPOS_CC[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centros de Custo</h1>
          <p className="text-muted-foreground">
            Objetos de custeio para alocação de custos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="h-4 w-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Centro de Custo
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nome ou cliente..."
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {TIPOS_CC.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={carregarDados}>Buscar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Centros de Custo Cadastrados</CardTitle>
          <CardDescription>{centrosCusto.length} registros</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : centrosCusto.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum centro de custo cadastrado
            </div>
          ) : (
            <div className="space-y-2">
              {centrosCusto.map((cc) => {
                const tipoInfo = getTipoInfo(cc.tipo);
                return (
                  <div
                    key={cc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tipoInfo.color}`}>
                        <CircleDollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cc.nome}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${tipoInfo.color}`}>
                            {tipoInfo.label}
                          </span>
                          {cc.ativo ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cc.codigo}
                          {cc.cliente && ` • Cliente: ${cc.cliente}`}
                          {cc.uf && ` • ${cc.cidade ? `${cc.cidade}/` : ""}${cc.uf}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cc)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cc.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>{editando ? "Editar Centro de Custo" : "Novo Centro de Custo"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo *</label>
                    <select
                      className="w-full border rounded-md px-3 py-2"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as typeof formData.tipo })}
                    >
                      {TIPOS_CC.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Cliente</label>
                    <Input
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contrato</label>
                    <Input
                      value={formData.contrato}
                      onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">UF</label>
                    <Input
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cidade</label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    />
                  </div>
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
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Import */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Importar do TOTVS</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo do CC importado</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={tipoImport}
                  onChange={(e) => setTipoImport(e.target.value)}
                >
                  {TIPOS_CC.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {loadingTotvs ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {ccsTotvs.map((cc) => (
                    <div
                      key={cc.codigo}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                        selectedTotvs.includes(cc.codigo) ? "bg-emerald-50 border-emerald-300" : "hover:bg-accent/50"
                      }`}
                      onClick={() => toggleSelectTotvs(cc.codigo)}
                    >
                      <input type="checkbox" checked={selectedTotvs.includes(cc.codigo)} onChange={() => {}} />
                      <div>
                        <p className="font-medium">{cc.nome || cc.codigo}</p>
                        <p className="text-sm text-muted-foreground">Código: {cc.codigo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t flex justify-between">
              <span className="text-sm text-muted-foreground">{selectedTotvs.length} selecionados</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImport(false)}>Cancelar</Button>
                <Button onClick={handleImportar} disabled={selectedTotvs.length === 0 || importando}>
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

