"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Download,
  Receipt,
  Users,
  ChevronRight,
  AlertCircle,
  Settings
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  empresasApi, 
  tributosApi,
  encargosApi,
  nwApi,
  type Empresa,
  type Tributo,
  type Encargo,
  type EmpresaNW,
} from "@/lib/api/orcamento";

export default function EmpresasPage() {
  const { accessToken: token } = useAuthStore();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  const [tributos, setTributos] = useState<Tributo[]>([]);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  
  // Import NW states
  const [showImportNW, setShowImportNW] = useState(false);
  const [empresasNW, setEmpresasNW] = useState<EmpresaNW[]>([]);
  const [selectedNW, setSelectedNW] = useState<string[]>([]);
  const [loadingNW, setLoadingNW] = useState(false);
  const [importando, setImportando] = useState(false);
  
  // Form states
  const [showFormTributo, setShowFormTributo] = useState(false);
  const [editandoTributo, setEditandoTributo] = useState<Tributo | null>(null);
  const [formTributo, setFormTributo] = useState({
    codigo: "",
    nome: "",
    aliquota: 0,
    ordem: 0,
    ativo: true,
  });

  const [showFormEncargo, setShowFormEncargo] = useState(false);
  const [editandoEncargo, setEditandoEncargo] = useState<Encargo | null>(null);
  const [formEncargo, setFormEncargo] = useState({
    codigo: "",
    nome: "",
    categoria: "ENCARGO" as 'ENCARGO' | 'PROVISAO' | 'IMPOSTO',
    aliquota: 0,
    base_calculo: "SALARIO" as 'SALARIO' | 'TOTAL' | 'PROVISAO',
    ordem: 0,
    ativo: true,
  });

  useEffect(() => {
    if (token) {
      carregarEmpresas();
    }
  }, [token]);

  useEffect(() => {
    if (empresaSelecionada && token) {
      carregarDetalhes(empresaSelecionada.id);
    }
  }, [empresaSelecionada, token]);

  const carregarEmpresas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await empresasApi.listar(token);
      setEmpresas(data);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhes = async (empresaId: string) => {
    if (!token) return;
    setLoadingDetalhes(true);
    try {
      const [tributosData, encargosData] = await Promise.all([
        tributosApi.listar(token, empresaId),
        encargosApi.listar(token, empresaId),
      ]);
      setTributos(tributosData);
      setEncargos(encargosData);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const abrirImportacaoNW = async () => {
    if (!token) return;
    setShowImportNW(true);
    setLoadingNW(true);
    try {
      const data = await nwApi.getEmpresas(token);
      // Filtrar empresas já importadas
      const codigosExistentes = empresas.map(e => e.codigo);
      setEmpresasNW(data.filter(e => !codigosExistentes.includes(e.codigo)));
    } catch (error) {
      console.error("Erro ao carregar empresas do NW:", error);
    } finally {
      setLoadingNW(false);
    }
  };

  const handleImportarNW = async () => {
    if (!token || selectedNW.length === 0) return;
    setImportando(true);
    try {
      const resultado = await nwApi.importarEmpresas(token, selectedNW);
      alert(`Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`);
      setShowImportNW(false);
      setSelectedNW([]);
      carregarEmpresas();
    } catch (error) {
      console.error("Erro ao importar:", error);
    } finally {
      setImportando(false);
    }
  };

  const toggleSelectNW = (codigo: string) => {
    setSelectedNW(prev => 
      prev.includes(codigo) 
        ? prev.filter(c => c !== codigo)
        : [...prev, codigo]
    );
  };

  const handleGerarTributosPadrao = async () => {
    if (!token || !empresaSelecionada) return;
    try {
      await tributosApi.gerarPadrao(token, empresaSelecionada.id);
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      console.error("Erro ao gerar tributos:", error);
    }
  };

  const handleGerarEncargosPadrao = async () => {
    if (!token || !empresaSelecionada) return;
    try {
      await encargosApi.gerarPadrao(token, empresaSelecionada.id);
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      console.error("Erro ao gerar encargos:", error);
    }
  };

  const handleSubmitTributo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !empresaSelecionada) return;

    try {
      if (editandoTributo) {
        await tributosApi.atualizar(token, editandoTributo.id, formTributo);
      } else {
        await tributosApi.criar(token, {
          ...formTributo,
          empresa_id: empresaSelecionada.id,
        });
      }
      setShowFormTributo(false);
      setEditandoTributo(null);
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      console.error("Erro ao salvar tributo:", error);
    }
  };

  const handleSubmitEncargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !empresaSelecionada) return;

    try {
      if (editandoEncargo) {
        await encargosApi.atualizar(token, editandoEncargo.id, formEncargo);
      } else {
        await encargosApi.criar(token, {
          ...formEncargo,
          empresa_id: empresaSelecionada.id,
          regime: 'CLT',
        });
      }
      setShowFormEncargo(false);
      setEditandoEncargo(null);
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      console.error("Erro ao salvar encargo:", error);
    }
  };

  const handleDeleteTributo = async (id: string) => {
    if (!token || !empresaSelecionada || !confirm("Excluir este tributo?")) return;
    try {
      await tributosApi.excluir(token, id);
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleDeleteEncargo = async (id: string) => {
    if (!token || !empresaSelecionada || !confirm("Excluir este encargo?")) return;
    try {
      await encargosApi.excluir(token, id);
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  // Calcular totais
  const totalTributos = tributos.filter(t => t.ativo).reduce((sum, t) => sum + t.aliquota, 0);
  const totalEncargos = encargos.filter(e => e.ativo).reduce((sum, e) => sum + e.aliquota, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Empresas do Grupo
          </h1>
          <p className="text-muted-foreground">
            Configure tributos e encargos por empresa
          </p>
        </div>
        <Button onClick={abrirImportacaoNW}>
          <Download className="h-4 w-4 mr-2" />
          Importar do NW
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Lista de Empresas */}
        <div className="col-span-4">
          <Card className="h-[calc(100vh-220px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Empresas</CardTitle>
              <CardDescription>
                {empresas.length} empresa(s) cadastrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : empresas.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma empresa cadastrada</p>
                  <p className="text-sm">Importe do NW para começar</p>
                </div>
              ) : (
                <div className="divide-y max-h-[calc(100vh-340px)] overflow-auto">
                  {empresas.map((empresa) => (
                    <div
                      key={empresa.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between ${
                        empresaSelecionada?.id === empresa.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setEmpresaSelecionada(empresa)}
                    >
                      <div>
                        <p className="font-medium text-sm">{empresa.nome_fantasia || empresa.razao_social}</p>
                        <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalhes da Empresa */}
        <div className="col-span-8">
          {!empresaSelecionada ? (
            <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Selecione uma empresa para configurar</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Info da empresa */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
                  </CardTitle>
                  <CardDescription>
                    {empresaSelecionada.razao_social} • CNPJ: {empresaSelecionada.cnpj}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Tributos */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Tributos sobre Receita
                      </CardTitle>
                      <CardDescription>
                        Total: {totalTributos.toFixed(2)}%
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {tributos.length === 0 && (
                        <Button size="sm" variant="outline" onClick={handleGerarTributosPadrao}>
                          Gerar Padrão
                        </Button>
                      )}
                      <Button size="sm" onClick={() => {
                        setEditandoTributo(null);
                        setFormTributo({ codigo: "", nome: "", aliquota: 0, ordem: tributos.length, ativo: true });
                        setShowFormTributo(true);
                      }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Novo
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingDetalhes ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : tributos.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Nenhum tributo configurado
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Código</th>
                          <th className="text-left p-2 font-medium">Nome</th>
                          <th className="text-right p-2 font-medium">Alíquota</th>
                          <th className="w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {tributos.map((tributo) => (
                          <tr key={tributo.id} className={!tributo.ativo ? 'opacity-50' : ''}>
                            <td className="p-2 font-mono">{tributo.codigo}</td>
                            <td className="p-2">{tributo.nome}</td>
                            <td className="p-2 text-right font-mono">{tributo.aliquota.toFixed(2)}%</td>
                            <td className="p-2">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setEditandoTributo(tributo);
                                  setFormTributo({
                                    codigo: tributo.codigo,
                                    nome: tributo.nome,
                                    aliquota: tributo.aliquota,
                                    ordem: tributo.ordem,
                                    ativo: tributo.ativo,
                                  });
                                  setShowFormTributo(true);
                                }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteTributo(tributo.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Encargos */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Encargos Patronais (CLT)
                      </CardTitle>
                      <CardDescription>
                        Total: {totalEncargos.toFixed(2)}%
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {encargos.length === 0 && (
                        <Button size="sm" variant="outline" onClick={handleGerarEncargosPadrao}>
                          Gerar Padrão
                        </Button>
                      )}
                      <Button size="sm" onClick={() => {
                        setEditandoEncargo(null);
                        setFormEncargo({
                          codigo: "",
                          nome: "",
                          categoria: "ENCARGO",
                          aliquota: 0,
                          base_calculo: "SALARIO",
                          ordem: encargos.length,
                          ativo: true,
                        });
                        setShowFormEncargo(true);
                      }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Novo
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingDetalhes ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : encargos.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Nenhum encargo configurado
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Código</th>
                          <th className="text-left p-2 font-medium">Nome</th>
                          <th className="text-left p-2 font-medium">Categoria</th>
                          <th className="text-right p-2 font-medium">Alíquota</th>
                          <th className="w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {encargos.map((encargo) => (
                          <tr key={encargo.id} className={!encargo.ativo ? 'opacity-50' : ''}>
                            <td className="p-2 font-mono">{encargo.codigo}</td>
                            <td className="p-2">{encargo.nome}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                encargo.categoria === 'ENCARGO' ? 'bg-blue-100 text-blue-700' :
                                encargo.categoria === 'PROVISAO' ? 'bg-amber-100 text-amber-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {encargo.categoria}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono">{encargo.aliquota.toFixed(2)}%</td>
                            <td className="p-2">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setEditandoEncargo(encargo);
                                  setFormEncargo({
                                    codigo: encargo.codigo,
                                    nome: encargo.nome,
                                    categoria: encargo.categoria,
                                    aliquota: encargo.aliquota,
                                    base_calculo: encargo.base_calculo,
                                    ordem: encargo.ordem,
                                    ativo: encargo.ativo,
                                  });
                                  setShowFormEncargo(true);
                                }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteEncargo(encargo.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal Importar do NW */}
      {showImportNW && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>Importar Empresas do NW</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {loadingNW ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : empresasNW.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Todas as empresas do NW já foram importadas</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="w-10 p-2">
                        <input
                          type="checkbox"
                          checked={selectedNW.length === empresasNW.length}
                          onChange={(e) => setSelectedNW(e.target.checked ? empresasNW.map(emp => emp.codigo) : [])}
                          className="h-4 w-4"
                        />
                      </th>
                      <th className="text-left p-2 text-xs font-medium">Código</th>
                      <th className="text-left p-2 text-xs font-medium">Nome Fantasia</th>
                      <th className="text-left p-2 text-xs font-medium">CNPJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresasNW.map((empNw) => (
                      <tr 
                        key={empNw.codigo} 
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleSelectNW(empNw.codigo)}
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedNW.includes(empNw.codigo)}
                            onChange={() => toggleSelectNW(empNw.codigo)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="p-2 text-sm font-mono">{empNw.codigo}</td>
                        <td className="p-2 text-sm">{empNw.nome_fantasia || empNw.razao_social}</td>
                        <td className="p-2 text-sm font-mono">{empNw.cnpj}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
            <div className="border-t p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedNW.length} empresa(s) selecionada(s)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowImportNW(false); setSelectedNW([]); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImportarNW} 
                  disabled={selectedNW.length === 0 || importando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importando ? "Importando..." : "Importar Selecionados"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Tributo */}
      {showFormTributo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editandoTributo ? "Editar Tributo" : "Novo Tributo"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTributo} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input
                      value={formTributo.codigo}
                      onChange={(e) => setFormTributo({ ...formTributo, codigo: e.target.value.toUpperCase() })}
                      placeholder="PIS"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Alíquota (%) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formTributo.aliquota}
                      onChange={(e) => setFormTributo({ ...formTributo, aliquota: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={formTributo.nome}
                    onChange={(e) => setFormTributo({ ...formTributo, nome: e.target.value })}
                    placeholder="PIS - Programa de Integração Social"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formTributo.ativo}
                    onChange={(e) => setFormTributo({ ...formTributo, ativo: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label className="text-sm">Ativo</label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowFormTributo(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Encargo */}
      {showFormEncargo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editandoEncargo ? "Editar Encargo" : "Novo Encargo"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitEncargo} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input
                      value={formEncargo.codigo}
                      onChange={(e) => setFormEncargo({ ...formEncargo, codigo: e.target.value.toUpperCase() })}
                      placeholder="INSS_EMP"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Alíquota (%) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formEncargo.aliquota}
                      onChange={(e) => setFormEncargo({ ...formEncargo, aliquota: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={formEncargo.nome}
                    onChange={(e) => setFormEncargo({ ...formEncargo, nome: e.target.value })}
                    placeholder="INSS Patronal"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    value={formEncargo.categoria}
                    onChange={(e) => setFormEncargo({ ...formEncargo, categoria: e.target.value as 'ENCARGO' | 'PROVISAO' | 'IMPOSTO' })}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="ENCARGO">Encargo</option>
                    <option value="PROVISAO">Provisão</option>
                    <option value="IMPOSTO">Imposto</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formEncargo.ativo}
                    onChange={(e) => setFormEncargo({ ...formEncargo, ativo: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label className="text-sm">Ativo</label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowFormEncargo(false)}>
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

