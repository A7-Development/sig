"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  DollarSign,
  Settings2,
  Calculator
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  funcoesApi, 
  totvsApi, 
  politicasBeneficioApi,
  faixasSalariaisApi,
  tabelaSalarialApi,
  provisoesApi,
  type Funcao, 
  type FuncaoTotvs,
  type PoliticaBeneficio,
  type FaixaSalarial,
  type TabelaSalarial,
  type Provisao,
} from "@/lib/api/orcamento";

type TabType = "funcoes" | "tabela-salarial" | "beneficios" | "provisoes";

export default function CargosSalariosPage() {
  const [activeTab, setActiveTab] = useState<TabType>("funcoes");

  const tabs = [
    { id: "funcoes" as TabType, label: "Funções", icon: Briefcase, description: "Cargos importados do TOTVS" },
    { id: "tabela-salarial" as TabType, label: "Tabela Salarial", icon: DollarSign, description: "Salários por função e faixa" },
    { id: "beneficios" as TabType, label: "Benefícios", icon: Users, description: "VT, VR, Plano Saúde, etc." },
    { id: "provisoes" as TabType, label: "Provisões", icon: Calculator, description: "13º, Férias, Demandas" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cargos e Salários</h1>
        <p className="text-muted-foreground">
          Gerencie funções, tabela salarial, benefícios e encargos
        </p>
      </div>

      <Separator />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "funcoes" && <FuncoesTab />}
      {activeTab === "tabela-salarial" && <TabelaSalarialTab />}
      {activeTab === "beneficios" && <BeneficiosTab />}
      {activeTab === "provisoes" && <ProvisoesTab />}
    </div>
  );
}

// ============================================
// Tab: Funções
// ============================================
function FuncoesTab() {
  const { accessToken: token } = useAuthStore();
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Funcao | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    codigo_totvs: "",
    cbo: "",
    jornada_mensal: 180,
    is_home_office: false,
    is_pj: false,
    ativo: true,
  });
  
  // Import state
  const [funcoesTotvs, setFuncoesTotvs] = useState<FuncaoTotvs[]>([]);
  const [selectedTotvs, setSelectedTotvs] = useState<string[]>([]);
  const [loadingTotvs, setLoadingTotvs] = useState(false);
  const [importando, setImportando] = useState(false);
  const [buscaTotvs, setBuscaTotvs] = useState("");

  useEffect(() => {
    if (token) {
      carregarFuncoes();
    }
  }, [token]);

  const carregarFuncoes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await funcoesApi.listar(token, { busca: busca || undefined });
      setFuncoes(data);
    } catch (error) {
      console.error("Erro ao carregar funções:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      if (editando) {
        await funcoesApi.atualizar(token, editando.id, formData);
      } else {
        await funcoesApi.criar(token, formData);
      }
      setShowForm(false);
      setEditando(null);
      setFormData({ codigo: "", nome: "", codigo_totvs: "", cbo: "", jornada_mensal: 180, is_home_office: false, is_pj: false, ativo: true });
      carregarFuncoes();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleEdit = (funcao: Funcao) => {
    setEditando(funcao);
    setFormData({
      codigo: funcao.codigo,
      nome: funcao.nome,
      codigo_totvs: funcao.codigo_totvs || "",
      cbo: funcao.cbo || "",
      jornada_mensal: funcao.jornada_mensal || 180,
      is_home_office: funcao.is_home_office || false,
      is_pj: funcao.is_pj || false,
      ativo: funcao.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir esta função?")) return;
    
    try {
      await funcoesApi.excluir(token, id);
      carregarFuncoes();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const abrirImportacao = async () => {
    if (!token) return;
    setShowImport(true);
    setLoadingTotvs(true);
    try {
      const data = await totvsApi.getFuncoes(token);
      setFuncoesTotvs(data);
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
      const resultado = await funcoesApi.importarTotvs(token, selectedTotvs);
      alert(`Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`);
      setShowImport(false);
      setSelectedTotvs([]);
      carregarFuncoes();
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

  const selectAllTotvs = () => {
    const filtered = funcoesTotvs.filter(f => 
      !buscaTotvs || 
      f.nome.toLowerCase().includes(buscaTotvs.toLowerCase()) ||
      f.codigo.toLowerCase().includes(buscaTotvs.toLowerCase())
    );
    setSelectedTotvs(filtered.map(f => f.codigo));
  };

  const filteredTotvs = funcoesTotvs.filter(f => 
    !buscaTotvs || 
    f.nome.toLowerCase().includes(buscaTotvs.toLowerCase()) ||
    f.codigo.toLowerCase().includes(buscaTotvs.toLowerCase()) ||
    (f.cbo && f.cbo.includes(buscaTotvs))
  );

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Funções/cargos que podem ser utilizados na tabela salarial e quadro de pessoal
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="h-4 w-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { setEditando(null); setFormData({ codigo: "", nome: "", codigo_totvs: "", cbo: "", ativo: true }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Função
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
                placeholder="Buscar por código, nome ou CBO..."
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregarFuncoes()}
              />
            </div>
            <Button variant="secondary" onClick={carregarFuncoes}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Funções Cadastradas</CardTitle>
          <CardDescription>{funcoes.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : funcoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma função cadastrada</p>
              <p className="text-sm">Importe do TOTVS ou cadastre manualmente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {funcoes.map((funcao) => (
                <div
                  key={funcao.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      funcao.ativo ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{funcao.nome}</span>
                        {funcao.ativo ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Código: {funcao.codigo}
                        {funcao.codigo_totvs && ` • TOTVS: ${funcao.codigo_totvs}`}
                        {funcao.cbo && ` • CBO: ${funcao.cbo}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(funcao)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(funcao.id)}>
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
              <CardTitle>{editando ? "Editar Função" : "Nova Função"}</CardTitle>
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
                  <label className="text-sm font-medium">CBO</label>
                  <Input
                    value={formData.cbo}
                    onChange={(e) => setFormData({ ...formData, cbo: e.target.value })}
                    placeholder="Ex: 4223-05"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Código TOTVS</label>
                  <Input
                    value={formData.codigo_totvs}
                    onChange={(e) => setFormData({ ...formData, codigo_totvs: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Jornada Mensal (horas)</label>
                  <Input
                    type="number"
                    value={formData.jornada_mensal}
                    onChange={(e) => setFormData({ ...formData, jornada_mensal: parseInt(e.target.value) || 180 })}
                    placeholder="180 ou 220"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_home_office}
                      onChange={(e) => setFormData({ ...formData, is_home_office: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label className="text-sm">Home Office</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_pj}
                      onChange={(e) => setFormData({ ...formData, is_pj: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label className="text-sm">PJ</label>
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
              <CardTitle>Importar Funções do TOTVS</CardTitle>
              <CardDescription>
                Selecione as funções que deseja importar do CORPORERM
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por nome, código ou CBO..."
                    className="pl-10"
                    value={buscaTotvs}
                    onChange={(e) => setBuscaTotvs(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAllTotvs}>
                  Selecionar Todos
                </Button>
              </div>
            </div>
            <CardContent className="flex-1 overflow-auto">
              {loadingTotvs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTotvs.map((funcao) => (
                    <div
                      key={funcao.codigo}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTotvs.includes(funcao.codigo) ? "bg-amber-50 border-amber-300" : "hover:bg-accent/50"
                      }`}
                      onClick={() => toggleSelectTotvs(funcao.codigo)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTotvs.includes(funcao.codigo)}
                        onChange={() => toggleSelectTotvs(funcao.codigo)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{funcao.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          Código: {funcao.codigo}
                          {funcao.cbo && ` • CBO: ${funcao.cbo}`}
                        </p>
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

// ============================================
// Tab: Tabela Salarial
// ============================================
function TabelaSalarialTab() {
  const { accessToken: token } = useAuthStore();
  const [itens, setItens] = useState<TabelaSalarial[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [faixas, setFaixas] = useState<FaixaSalarial[]>([]);
  const [politicas, setPoliticas] = useState<PoliticaBeneficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<TabelaSalarial | null>(null);
  
  const [formData, setFormData] = useState({
    funcao_id: "",
    faixa_id: "",
    politica_id: "",
    regime: "CLT" as 'CLT' | 'PJ',
    salario_base: 0,
    ativo: true,
  });

  useEffect(() => {
    if (token) {
      carregarDados();
    }
  }, [token]);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [itensData, funcoesData, faixasData, politicasData] = await Promise.all([
        tabelaSalarialApi.listar(token),
        funcoesApi.listar(token, { ativo: true }),
        faixasSalariaisApi.listar(token, { ativo: true }),
        politicasBeneficioApi.listar(token, { ativo: true }),
      ]);
      setItens(itensData);
      setFuncoes(funcoesData);
      setFaixas(faixasData);
      setPoliticas(politicasData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const data = {
        ...formData,
        faixa_id: formData.faixa_id || null,
        politica_id: formData.politica_id || null,
      };
      if (editando) {
        await tabelaSalarialApi.atualizar(token, editando.id, data);
      } else {
        await tabelaSalarialApi.criar(token, data);
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar");
    }
  };

  const resetForm = () => {
    setFormData({ funcao_id: "", faixa_id: "", politica_id: "", regime: "CLT", salario_base: 0, ativo: true });
  };

  const handleEdit = (item: TabelaSalarial) => {
    setEditando(item);
    setFormData({
      funcao_id: item.funcao_id,
      faixa_id: item.faixa_id || "",
      politica_id: item.politica_id || "",
      regime: item.regime,
      salario_base: item.salario_base,
      ativo: item.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir este item?")) return;
    try {
      await tabelaSalarialApi.excluir(token, id);
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleGerarFaixas = async () => {
    if (!token) return;
    try {
      await faixasSalariaisApi.gerarPadrao(token);
      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao gerar faixas");
    }
  };

  // Agrupar por função
  const itensPorFuncao = itens.reduce((acc, item) => {
    const funcaoNome = item.funcao?.nome || 'Sem função';
    if (!acc[funcaoNome]) acc[funcaoNome] = [];
    acc[funcaoNome].push(item);
    return acc;
  }, {} as Record<string, TabelaSalarial[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Vincule funções a faixas salariais e políticas de benefícios
        </p>
        <div className="flex gap-2">
          {faixas.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleGerarFaixas}>
              Criar Faixas (Jr/Pl/Sr)
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* Faixas disponíveis */}
      {faixas.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Faixas:</span>
          {faixas.map((f) => (
            <span key={f.id} className="px-2 py-0.5 bg-muted rounded text-xs">{f.nome}</span>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tabela Salarial</CardTitle>
          <CardDescription>{itens.length} registros</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : itens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item cadastrado</p>
              <p className="text-sm">Adicione funções com seus salários e políticas de benefícios</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(itensPorFuncao).map(([funcaoNome, funcaoItens]) => (
                <div key={funcaoNome} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 font-medium">{funcaoNome}</div>
                  <div className="divide-y">
                    {funcaoItens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30">
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.regime === 'CLT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.regime}
                          </span>
                          {item.faixa && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              {item.faixa.nome}
                            </span>
                          )}
                          <span className="font-mono text-lg font-semibold">
                            R$ {item.salario_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {item.politica && (
                            <span className="text-sm text-muted-foreground">
                              → {item.politica.nome}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
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
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>{editando ? "Editar Item" : "Novo Item da Tabela Salarial"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Função *</label>
                  <select 
                    value={formData.funcao_id} 
                    onChange={(e) => setFormData({ ...formData, funcao_id: e.target.value })} 
                    className="w-full h-10 px-3 border rounded-md"
                    required
                  >
                    <option value="">Selecione...</option>
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Regime</label>
                    <select 
                      value={formData.regime} 
                      onChange={(e) => setFormData({ ...formData, regime: e.target.value as 'CLT' | 'PJ' })} 
                      className="w-full h-10 px-3 border rounded-md"
                    >
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Faixa</label>
                    <select 
                      value={formData.faixa_id} 
                      onChange={(e) => setFormData({ ...formData, faixa_id: e.target.value })} 
                      className="w-full h-10 px-3 border rounded-md"
                    >
                      <option value="">Sem faixa</option>
                      {faixas.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Salário Base (R$) *</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.salario_base} 
                    onChange={(e) => setFormData({ ...formData, salario_base: parseFloat(e.target.value) || 0 })}
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Política de Benefícios</label>
                  <select 
                    value={formData.politica_id} 
                    onChange={(e) => setFormData({ ...formData, politica_id: e.target.value })} 
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="">Sem política</option>
                    {politicas.filter(p => p.regime === formData.regime).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.escala}, {p.jornada_mensal}h)</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas políticas do regime {formData.regime} são exibidas
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================
// Tab: Benefícios (Políticas de Benefícios)
// ============================================
function BeneficiosTab() {
  const { accessToken: token } = useAuthStore();
  const [politicas, setPoliticas] = useState<PoliticaBeneficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<PoliticaBeneficio | null>(null);
  
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    regime: "CLT" as 'CLT' | 'PJ',
    escala: "6x1" as '5x2' | '6x1' | '12x36',
    jornada_mensal: 180,
    vt_dia: 0,
    vt_desconto_6pct: true,
    vr_dia: 0,
    va_dia: 0,
    plano_saude: 0,
    plano_dental: 0,
    seguro_vida: 0,
    aux_creche: 0,
    aux_creche_percentual: 0,
    aux_home_office: 0,
    dias_treinamento: 15,
    ativo: true,
  });

  useEffect(() => {
    if (token) carregarPoliticas();
  }, [token]);

  const carregarPoliticas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await politicasBeneficioApi.listar(token);
      setPoliticas(data);
    } catch (error) {
      console.error("Erro ao carregar políticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editando) {
        await politicasBeneficioApi.atualizar(token, editando.id, formData);
      } else {
        await politicasBeneficioApi.criar(token, formData);
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarPoliticas();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: "", nome: "", descricao: "", regime: "CLT", escala: "6x1", jornada_mensal: 180,
      vt_dia: 0, vt_desconto_6pct: true, vr_dia: 0, va_dia: 0, plano_saude: 0, plano_dental: 0,
      seguro_vida: 0, aux_creche: 0, aux_creche_percentual: 0, aux_home_office: 0, dias_treinamento: 15, ativo: true,
    });
  };

  const handleEdit = (pol: PoliticaBeneficio) => {
    setEditando(pol);
    setFormData({
      codigo: pol.codigo, nome: pol.nome, descricao: pol.descricao || "", regime: pol.regime,
      escala: pol.escala, jornada_mensal: pol.jornada_mensal, vt_dia: pol.vt_dia,
      vt_desconto_6pct: pol.vt_desconto_6pct, vr_dia: pol.vr_dia, va_dia: pol.va_dia,
      plano_saude: pol.plano_saude, plano_dental: pol.plano_dental, seguro_vida: pol.seguro_vida,
      aux_creche: pol.aux_creche, aux_creche_percentual: pol.aux_creche_percentual,
      aux_home_office: pol.aux_home_office, dias_treinamento: pol.dias_treinamento, ativo: pol.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir esta política?")) return;
    try {
      await politicasBeneficioApi.excluir(token, id);
      carregarPoliticas();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleGerarPadrao = async () => {
    if (!token) return;
    if (!confirm("Deseja gerar as políticas padrão?")) return;
    try {
      await politicasBeneficioApi.gerarPadrao(token);
      carregarPoliticas();
    } catch (error: any) {
      alert(error.message || "Erro ao gerar políticas padrão");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates de benefícios reutilizáveis para vincular às funções
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGerarPadrao}>
            Gerar Padrão
          </Button>
          <Button size="sm" onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Política
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Políticas de Benefícios</CardTitle>
          <CardDescription>{politicas.length} políticas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : politicas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma política cadastrada</p>
              <p className="text-sm">Clique em &quot;Gerar Padrão&quot; para criar automaticamente</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {politicas.map((pol) => (
                <Card key={pol.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          pol.regime === 'CLT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {pol.regime}
                        </span>
                        <CardTitle className="text-base">{pol.nome}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(pol)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(pol.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{pol.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Escala:</span>
                        <span className="font-medium">{pol.escala}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jornada:</span>
                        <span className="font-medium">{pol.jornada_mensal}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VT/dia:</span>
                        <span className="font-medium">R$ {pol.vt_dia.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VR/dia:</span>
                        <span className="font-medium">R$ {pol.vr_dia.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plano Saúde:</span>
                        <span className="font-medium">R$ {pol.plano_saude.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Treinamento:</span>
                        <span className="font-medium">{pol.dias_treinamento}d</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>{editando ? "Editar Política" : "Nova Política de Benefícios"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Nome *</label>
                    <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Regime</label>
                    <select value={formData.regime} onChange={(e) => setFormData({ ...formData, regime: e.target.value as 'CLT' | 'PJ' })} className="w-full h-10 px-3 border rounded-md">
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Escala</label>
                    <select value={formData.escala} onChange={(e) => setFormData({ ...formData, escala: e.target.value as '5x2' | '6x1' | '12x36' })} className="w-full h-10 px-3 border rounded-md">
                      <option value="5x2">5x2</option>
                      <option value="6x1">6x1</option>
                      <option value="12x36">12x36</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Jornada (h/mês)</label>
                    <Input type="number" value={formData.jornada_mensal} onChange={(e) => setFormData({ ...formData, jornada_mensal: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Benefícios</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">VT/dia (R$)</label>
                    <Input type="number" step="0.01" value={formData.vt_dia} onChange={(e) => setFormData({ ...formData, vt_dia: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">VR/dia (R$)</label>
                    <Input type="number" step="0.01" value={formData.vr_dia} onChange={(e) => setFormData({ ...formData, vr_dia: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">VA/dia (R$)</label>
                    <Input type="number" step="0.01" value={formData.va_dia} onChange={(e) => setFormData({ ...formData, va_dia: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plano Saúde (R$/mês)</label>
                    <Input type="number" step="0.01" value={formData.plano_saude} onChange={(e) => setFormData({ ...formData, plano_saude: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plano Dental (R$/mês)</label>
                    <Input type="number" step="0.01" value={formData.plano_dental} onChange={(e) => setFormData({ ...formData, plano_dental: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Seguro Vida (R$/mês)</label>
                    <Input type="number" step="0.01" value={formData.seguro_vida} onChange={(e) => setFormData({ ...formData, seguro_vida: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Aux. Creche (R$)</label>
                    <Input type="number" step="0.01" value={formData.aux_creche} onChange={(e) => setFormData({ ...formData, aux_creche: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">% Creche</label>
                    <Input type="number" step="0.01" value={formData.aux_creche_percentual} onChange={(e) => setFormData({ ...formData, aux_creche_percentual: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Aux. Home Office</label>
                    <Input type="number" step="0.01" value={formData.aux_home_office} onChange={(e) => setFormData({ ...formData, aux_home_office: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Dias Treinamento</label>
                    <Input type="number" value={formData.dias_treinamento} onChange={(e) => setFormData({ ...formData, dias_treinamento: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={formData.vt_desconto_6pct} onChange={(e) => setFormData({ ...formData, vt_desconto_6pct: e.target.checked })} className="h-4 w-4" />
                    <label className="text-sm">Desconto 6% VT</label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================
// Tab: Provisões
// ============================================
function ProvisoesTab() {
  const { accessToken: token } = useAuthStore();
  const [provisoes, setProvisoes] = useState<Provisao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Provisao | null>(null);
  
  // Form states
  const [form, setForm] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    percentual: 0,
    incide_encargos: true,
    ordem: 0,
    ativo: true,
  });

  useEffect(() => {
    if (token) {
      carregarProvisoes();
    }
  }, [token]);

  const carregarProvisoes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await provisoesApi.listar(token);
      setProvisoes(data);
    } catch (error) {
      console.error("Erro ao carregar provisões:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      if (editando) {
        await provisoesApi.atualizar(token, editando.id, form);
      } else {
        await provisoesApi.criar(token, form);
      }
      setShowForm(false);
      setEditando(null);
      setForm({ codigo: "", nome: "", descricao: "", percentual: 0, incide_encargos: true, ordem: 0, ativo: true });
      carregarProvisoes();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleEdit = (provisao: Provisao) => {
    setEditando(provisao);
    setForm({
      codigo: provisao.codigo,
      nome: provisao.nome,
      descricao: provisao.descricao || "",
      percentual: provisao.percentual,
      incide_encargos: provisao.incide_encargos,
      ordem: provisao.ordem,
      ativo: provisao.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir esta provisão?")) return;
    try {
      await provisoesApi.excluir(token, id);
      carregarProvisoes();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleGerarPadrao = async () => {
    if (!token) return;
    if (!confirm("Deseja gerar as provisões padrão (13º, Férias, Demandas)?")) return;
    
    try {
      await provisoesApi.gerarPadrao(token);
      carregarProvisoes();
    } catch (error) {
      console.error("Erro ao gerar provisões:", error);
    }
  };

  const totalProvisoes = provisoes.filter(p => p.ativo).reduce((acc, p) => acc + p.percentual, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Provisões Trabalhistas</h2>
          <p className="text-sm text-muted-foreground">
            13º Salário, Férias, Demandas Trabalhistas
          </p>
        </div>
        <div className="flex gap-2">
          {provisoes.length === 0 && (
            <Button variant="outline" onClick={handleGerarPadrao}>
              Gerar Padrão
            </Button>
          )}
          <Button onClick={() => { 
            setEditando(null); 
            setForm({ codigo: "", nome: "", descricao: "", percentual: 0, incide_encargos: true, ordem: provisoes.length, ativo: true }); 
            setShowForm(true); 
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Provisão
          </Button>
        </div>
      </div>

      {/* Lista de Provisões */}
      <Card>
        <CardHeader>
          <CardTitle>Provisões</CardTitle>
          <CardDescription>
            Total: {totalProvisoes.toFixed(2)}% sobre o salário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : provisoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma provisão cadastrada</p>
              <p className="text-sm">Clique em &quot;Gerar Padrão&quot; para criar automaticamente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {provisoes.map((provisao) => (
                <div
                  key={provisao.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                      PROVISÃO
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provisao.nome}</span>
                        {!provisao.ativo && <XCircle className="h-4 w-4 text-gray-400" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {provisao.codigo} • {provisao.incide_encargos ? "Incide encargos" : "Não incide encargos"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg font-semibold">{provisao.percentual.toFixed(2)}%</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(provisao)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(provisao.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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
              <CardTitle>{editando ? "Editar Provisão" : "Nova Provisão"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                      placeholder="13_SALARIO"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Percentual (%) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.percentual}
                      onChange={(e) => setForm({ ...form, percentual: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="13º Salário"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Descrição opcional"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.incide_encargos}
                      onChange={(e) => setForm({ ...form, incide_encargos: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label className="text-sm">Incide encargos</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label className="text-sm">Ativo</label>
                  </div>
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
    </div>
  );
}

