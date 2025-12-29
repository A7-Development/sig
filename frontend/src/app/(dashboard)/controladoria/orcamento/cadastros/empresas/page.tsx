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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Plus, 
  Search,
  Edit2, 
  Trash2, 
  Download,
  Receipt,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  X
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { 
  empresasApi, 
  tributosApi,
  nwApi,
  type Empresa,
  type Tributo,
  type EmpresaNW,
  type ContaContabilNW,
} from "@/lib/api/orcamento";

export default function EmpresasPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  const [tributos, setTributos] = useState<Tributo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [busca, setBusca] = useState("");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  // Import NW states
  const [showImportNW, setShowImportNW] = useState(false);
  const [empresasNW, setEmpresasNW] = useState<EmpresaNW[]>([]);
  const [selectedNW, setSelectedNW] = useState<string[]>([]);
  const [loadingNW, setLoadingNW] = useState(false);
  const [importando, setImportando] = useState(false);
  
  // Form Empresa states
  const [showFormEmpresa, setShowFormEmpresa] = useState(false);
  const [editandoEmpresa, setEditandoEmpresa] = useState<Empresa | null>(null);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [formEmpresa, setFormEmpresa] = useState({
    codigo: "",
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    ativo: true,
  });
  
  // Form Tributo states
  const [showFormTributo, setShowFormTributo] = useState(false);
  const [editandoTributo, setEditandoTributo] = useState<Tributo | null>(null);
  const [salvandoTributo, setSalvandoTributo] = useState(false);
  const [formTributo, setFormTributo] = useState({
    codigo: "",
    nome: "",
    aliquota: 0,
    conta_contabil_codigo: "",
    conta_contabil_descricao: "",
    ordem: 0,
    ativo: true,
  });
  
  // Busca de conta contábil
  const [buscaContaContabil, setBuscaContaContabil] = useState("");
  const [contasContabeis, setContasContabeis] = useState<ContaContabilNW[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [showContasList, setShowContasList] = useState(false);


  useEffect(() => {
    if (token) {
      carregarEmpresas();
    }
  }, [token, apenasAtivos]);

  useEffect(() => {
    if (empresaSelecionada && token) {
      carregarDetalhes(empresaSelecionada.id);
    }
  }, [empresaSelecionada, token]);

  const carregarEmpresas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await empresasApi.listar(token, { 
        ativo: apenasAtivos,
        busca: busca || undefined,
      });
      setEmpresas(data);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      toast({ title: "Erro ao carregar", description: "Não foi possível carregar as empresas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhes = async (empresaId: string) => {
    if (!token) return;
    setLoadingDetalhes(true);
    try {
      const tributosData = await tributosApi.listar(token, empresaId);
      setTributos(tributosData);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      toast({ title: "Erro ao carregar detalhes", description: "Não foi possível carregar os tributos.", variant: "destructive" });
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
      const codigosExistentes = empresas.map(e => e.codigo);
      setEmpresasNW(data.filter(e => !codigosExistentes.includes(e.codigo)));
    } catch (error) {
      console.error("Erro ao carregar empresas do NW:", error);
      toast({ title: "Erro ao carregar NW", description: "Não foi possível carregar as empresas do NW.", variant: "destructive" });
    } finally {
      setLoadingNW(false);
    }
  };

  const handleImportarNW = async () => {
    if (!token || selectedNW.length === 0) return;
    setImportando(true);
    try {
      const resultado = await nwApi.importarEmpresas(token, selectedNW);
      toast({ title: "Importação concluída", description: `Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}` });
      setShowImportNW(false);
      setSelectedNW([]);
      carregarEmpresas();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({ title: "Erro ao importar", description: "Não foi possível importar as empresas.", variant: "destructive" });
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

  // Handlers para Empresa
  const handleSubmitEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSalvandoEmpresa(true);
    try {
      if (editandoEmpresa) {
        await empresasApi.atualizar(token, editandoEmpresa.id, formEmpresa);
        toast({ title: "Empresa atualizada", description: "Empresa atualizada com sucesso." });
      } else {
        await empresasApi.criar(token, formEmpresa);
        toast({ title: "Empresa criada", description: "Empresa criada com sucesso." });
      }
      setShowFormEmpresa(false);
      setEditandoEmpresa(null);
      resetFormEmpresa();
      carregarEmpresas();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar a empresa.", variant: "destructive" });
    } finally {
      setSalvandoEmpresa(false);
    }
  };

  const resetFormEmpresa = () => {
    setFormEmpresa({ codigo: "", razao_social: "", nome_fantasia: "", cnpj: "", ativo: true });
  };

  const handleEditEmpresa = (empresa: Empresa) => {
    setEditandoEmpresa(empresa);
    setFormEmpresa({
      codigo: empresa.codigo,
      razao_social: empresa.razao_social,
      nome_fantasia: empresa.nome_fantasia || "",
      cnpj: empresa.cnpj || "",
      ativo: empresa.ativo,
    });
    setShowFormEmpresa(true);
  };

  const handleDeleteEmpresa = async (id: string) => {
    if (!token || !confirm("Deseja excluir esta empresa?")) return;
    try {
      await empresasApi.excluir(token, id);
      toast({ title: "Empresa excluída", description: "Empresa excluída com sucesso." });
      if (empresaSelecionada?.id === id) {
        setEmpresaSelecionada(null);
      }
      carregarEmpresas();
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir a empresa.", variant: "destructive" });
    }
  };

  const handleGerarTributosPadrao = async () => {
    if (!token || !empresaSelecionada) return;
    try {
      await tributosApi.gerarPadrao(token, empresaSelecionada.id);
      toast({ title: "Tributos gerados", description: "Tributos padrão criados com sucesso." });
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível gerar tributos.", variant: "destructive" });
    }
  };

  const handleSubmitTributo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !empresaSelecionada) return;
    setSalvandoTributo(true);
    
    // Preparar dados para envio (converter strings vazias em null)
    const dadosTributo = {
      ...formTributo,
      conta_contabil_codigo: formTributo.conta_contabil_codigo || null,
      conta_contabil_descricao: formTributo.conta_contabil_descricao || null,
    };
    
    try {
      if (editandoTributo) {
        await tributosApi.atualizar(token, editandoTributo.id, dadosTributo);
        toast({ title: "Tributo atualizado", description: "Tributo atualizado com sucesso." });
      } else {
        await tributosApi.criar(token, { ...dadosTributo, empresa_id: empresaSelecionada.id });
        toast({ title: "Tributo criado", description: "Tributo criado com sucesso." });
      }
      setShowFormTributo(false);
      setEditandoTributo(null);
      setBuscaContaContabil("");
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar o tributo.", variant: "destructive" });
    } finally {
      setSalvandoTributo(false);
    }
  };

  const handleDeleteTributo = async (id: string) => {
    if (!token || !empresaSelecionada || !confirm("Excluir este tributo?")) return;
    try {
      await tributosApi.excluir(token, id);
      toast({ title: "Tributo excluído", description: "Tributo excluído com sucesso." });
      carregarDetalhes(empresaSelecionada.id);
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) carregarEmpresas();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  // Busca de contas contábeis com debounce
  useEffect(() => {
    if (!token || buscaContaContabil.length < 2) {
      setContasContabeis([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setLoadingContas(true);
      try {
        const contas = await nwApi.getContasContabeis(token, buscaContaContabil, 50);
        setContasContabeis(contas);
      } catch (error) {
        console.error("Erro ao buscar contas contábeis:", error);
      } finally {
        setLoadingContas(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [buscaContaContabil, token]);

  const handleSelectContaContabil = (conta: ContaContabilNW) => {
    setFormTributo({
      ...formTributo,
      conta_contabil_codigo: conta.codigo,
      conta_contabil_descricao: conta.descricao,
    });
    setBuscaContaContabil("");
    setContasContabeis([]);
    setShowContasList(false);
  };

  const handleClearContaContabil = () => {
    setFormTributo({
      ...formTributo,
      conta_contabil_codigo: "",
      conta_contabil_descricao: "",
    });
  };

  const totalTributos = tributos.filter(t => t.ativo).reduce((sum, t) => sum + t.aliquota, 0);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Empresas do Grupo</h1>
          <p className="text-sm text-muted-foreground">
            Configure tributos e encargos por empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacaoNW}>
            <Download className="size-4 mr-2" />
            Importar do NW
          </Button>
          <Button onClick={() => { setEditandoEmpresa(null); resetFormEmpresa(); setShowFormEmpresa(true); }}>
            <Plus className="size-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      <Tabs defaultValue="empresas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="empresas" className="gap-2">
            <Building2 className="size-4" />
            Empresas
          </TabsTrigger>
          {empresaSelecionada && (
            <TabsTrigger value="tributos" className="gap-2">
              <Receipt className="size-4" />
              Tributos
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab Empresas */}
        <TabsContent value="empresas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="section-title">Lista de Empresas</CardTitle>
                  <CardDescription>
                    {empresas.length} registro(s) encontrado(s)
                    {empresaSelecionada && (
                      <span className="ml-2 text-primary">
                        • Selecionada: {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="apenas-ativos-empresas"
                      checked={apenasAtivos}
                      onCheckedChange={(checked) => setApenasAtivos(checked === true)}
                    />
                    <Label htmlFor="apenas-ativos-empresas" className="text-sm cursor-pointer">
                      Apenas ativos
                    </Label>
                  </div>
                  <div className="relative w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empresa..."
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
              ) : empresas.length === 0 ? (
                <div className="empty-state">
                  <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {busca ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importe do NW para começar
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome Fantasia</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresas.map((empresa) => (
                      <TableRow 
                        key={empresa.id}
                        className={empresaSelecionada?.id === empresa.id ? "bg-muted/50" : ""}
                      >
                        <TableCell className="font-mono text-xs">{empresa.codigo}</TableCell>
                        <TableCell className="font-semibold">{empresa.nome_fantasia || "-"}</TableCell>
                        <TableCell className="text-sm">{empresa.razao_social}</TableCell>
                        <TableCell className="font-mono text-xs">{empresa.cnpj}</TableCell>
                        <TableCell className="text-center">
                          {empresa.ativo ? (
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
                              variant={empresaSelecionada?.id === empresa.id ? "default" : "outline"}
                              size="xs"
                              onClick={() => setEmpresaSelecionada(empresa)}
                            >
                              {empresaSelecionada?.id === empresa.id ? "Selecionada" : "Selecionar"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleEditEmpresa(empresa)}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDeleteEmpresa(empresa.id)}
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
        </TabsContent>

        {/* Tab Tributos */}
        <TabsContent value="tributos">
          {empresaSelecionada && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="section-title flex items-center gap-2">
                      <Receipt className="size-4" />
                      Tributos sobre Receita - {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
                    </CardTitle>
                    <CardDescription>
                      {tributos.length} tributo(s) • Total: {totalTributos.toFixed(2)}%
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {tributos.length === 0 && (
                      <Button variant="outline" onClick={handleGerarTributosPadrao}>
                        Gerar Padrão
                      </Button>
                    )}
                    <Button onClick={() => {
                      setEditandoTributo(null);
                      setFormTributo({ codigo: "", nome: "", aliquota: 0, conta_contabil_codigo: "", conta_contabil_descricao: "", ordem: tributos.length, ativo: true });
                      setBuscaContaContabil("");
                      setShowFormTributo(true);
                    }}>
                      <Plus className="size-4 mr-2" />
                      Novo Tributo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetalhes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tributos.length === 0 ? (
                  <div className="empty-state">
                    <Receipt className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum tributo configurado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Alíquota</TableHead>
                        <TableHead>Conta Contábil</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tributos.map((tributo) => (
                        <TableRow key={tributo.id}>
                          <TableCell className="font-mono text-xs">{tributo.codigo}</TableCell>
                          <TableCell className="font-semibold">{tributo.nome}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{tributo.aliquota.toFixed(2)}%</TableCell>
                          <TableCell>
                            {tributo.conta_contabil_codigo ? (
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs">{tributo.conta_contabil_codigo}</span>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={tributo.conta_contabil_descricao || ""}>
                                  {tributo.conta_contabil_descricao}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {tributo.ativo ? (
                              <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" />Ativo</Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1"><XCircle className="size-3" />Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon-xs" onClick={() => {
                                setEditandoTributo(tributo);
                                setFormTributo({
                                  codigo: tributo.codigo,
                                  nome: tributo.nome,
                                  aliquota: tributo.aliquota,
                                  conta_contabil_codigo: tributo.conta_contabil_codigo || "",
                                  conta_contabil_descricao: tributo.conta_contabil_descricao || "",
                                  ordem: tributo.ordem,
                                  ativo: tributo.ativo,
                                });
                                setShowFormTributo(true);
                              }}>
                                <Edit2 className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteTributo(tributo.id)}>
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
          )}
        </TabsContent>

      </Tabs>

      {/* Dialog Empresa */}
      <Dialog open={showFormEmpresa} onOpenChange={setShowFormEmpresa}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoEmpresa ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
            <DialogDescription>Preencha os dados da empresa</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitEmpresa} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formEmpresa.codigo}
                  onChange={(e) => setFormEmpresa({ ...formEmpresa, codigo: e.target.value.toUpperCase() })}
                  placeholder="001"
                  required
                />
              </div>
              <div>
                <Label>CNPJ *</Label>
                <Input
                  value={formEmpresa.cnpj}
                  onChange={(e) => setFormEmpresa({ ...formEmpresa, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Razão Social *</Label>
              <Input
                value={formEmpresa.razao_social}
                onChange={(e) => setFormEmpresa({ ...formEmpresa, razao_social: e.target.value })}
                placeholder="Razão Social da Empresa Ltda"
                required
              />
            </div>

            <div>
              <Label>Nome Fantasia</Label>
              <Input
                value={formEmpresa.nome_fantasia}
                onChange={(e) => setFormEmpresa({ ...formEmpresa, nome_fantasia: e.target.value })}
                placeholder="Nome Fantasia"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo_empresa"
                checked={formEmpresa.ativo}
                onCheckedChange={(c) => setFormEmpresa({ ...formEmpresa, ativo: c === true })}
              />
              <Label htmlFor="ativo_empresa" className="cursor-pointer">Ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowFormEmpresa(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoEmpresa}>
                {salvandoEmpresa && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editandoEmpresa ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Importar do NW */}
      <Dialog open={showImportNW} onOpenChange={setShowImportNW}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Empresas do NW</DialogTitle>
            <DialogDescription>Selecione as empresas que deseja importar</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {loadingNW ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : empresasNW.length === 0 ? (
              <div className="empty-state py-8">
                <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Todas as empresas do NW já foram importadas</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedNW.length === empresasNW.length && empresasNW.length > 0}
                          onCheckedChange={(checked) => setSelectedNW(checked ? empresasNW.map(e => e.codigo) : [])}
                        />
                      </TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome Fantasia</TableHead>
                      <TableHead>CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresasNW.map((empNw) => (
                      <TableRow 
                        key={empNw.codigo}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelectNW(empNw.codigo)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedNW.includes(empNw.codigo)}
                            onCheckedChange={() => toggleSelectNW(empNw.codigo)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{empNw.codigo}</TableCell>
                        <TableCell>{empNw.nome_fantasia || empNw.razao_social}</TableCell>
                        <TableCell className="font-mono text-xs">{empNw.cnpj}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">{selectedNW.length} selecionados</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowImportNW(false); setSelectedNW([]); }}>
                Cancelar
              </Button>
              <Button onClick={handleImportarNW} disabled={selectedNW.length === 0 || importando}>
                {importando && <Loader2 className="size-4 mr-2 animate-spin" />}
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Tributo */}
      <Dialog open={showFormTributo} onOpenChange={setShowFormTributo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editandoTributo ? "Editar Tributo" : "Novo Tributo"}</DialogTitle>
            <DialogDescription>Preencha os dados do tributo e defina a conta contábil para DRE</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitTributo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formTributo.codigo}
                  onChange={(e) => setFormTributo({ ...formTributo, codigo: e.target.value.toUpperCase() })}
                  placeholder="PIS"
                  required
                />
              </div>
              <div>
                <Label>Alíquota (%) *</Label>
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
              <Label>Nome *</Label>
              <Input
                value={formTributo.nome}
                onChange={(e) => setFormTributo({ ...formTributo, nome: e.target.value })}
                placeholder="PIS - Programa de Integração Social"
                required
              />
            </div>

            {/* Campo de Conta Contábil com autocomplete */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <BookOpen className="size-3" />
                Conta Contábil para DRE
              </Label>
              
              {formTributo.conta_contabil_codigo ? (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <span className="font-mono text-sm font-medium">{formTributo.conta_contabil_codigo}</span>
                    <p className="text-xs text-muted-foreground">{formTributo.conta_contabil_descricao}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleClearContaContabil}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={buscaContaContabil}
                    onChange={(e) => {
                      setBuscaContaContabil(e.target.value);
                      setShowContasList(true);
                    }}
                    onFocus={() => setShowContasList(true)}
                    placeholder="Buscar conta contábil (mín. 2 caracteres)..."
                    className="pl-9"
                  />
                  {loadingContas && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  )}
                  
                  {/* Lista de resultados */}
                  {showContasList && contasContabeis.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-auto">
                      {contasContabeis.map((conta) => (
                        <button
                          key={conta.codigo}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 border-b last:border-b-0"
                          onClick={() => handleSelectContaContabil(conta)}
                        >
                          <span className="font-mono text-xs font-medium">{conta.codigo}</span>
                          <p className="text-xs text-muted-foreground truncate">{conta.descricao}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {showContasList && buscaContaContabil.length >= 2 && contasContabeis.length === 0 && !loadingContas && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Nenhuma conta encontrada</p>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                A conta contábil define onde o valor calculado será lançado na DRE
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo_tributo"
                checked={formTributo.ativo}
                onCheckedChange={(c) => setFormTributo({ ...formTributo, ativo: c === true })}
              />
              <Label htmlFor="ativo_tributo" className="cursor-pointer">Ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowFormTributo(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoTributo}>
                {salvandoTributo && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editandoTributo ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

