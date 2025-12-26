"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  Calculator
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
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

export default function CargosSalariosPage() {
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Cargos e Salários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie funções, tabela salarial, benefícios e encargos
          </p>
        </div>
      </div>

      <Tabs defaultValue="funcoes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="funcoes" className="gap-2">
            <Briefcase className="size-4" />
            Funções
          </TabsTrigger>
          <TabsTrigger value="tabela-salarial" className="gap-2">
            <DollarSign className="size-4" />
            Tabela Salarial
          </TabsTrigger>
          <TabsTrigger value="beneficios" className="gap-2">
            <Users className="size-4" />
            Benefícios
          </TabsTrigger>
          <TabsTrigger value="provisoes" className="gap-2">
            <Calculator className="size-4" />
            Provisões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcoes">
          <FuncoesTab />
        </TabsContent>
        <TabsContent value="tabela-salarial">
          <TabelaSalarialTab />
        </TabsContent>
        <TabsContent value="beneficios">
          <BeneficiosTab />
        </TabsContent>
        <TabsContent value="provisoes">
          <ProvisoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Tab: Funções
// ============================================
function FuncoesTab() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Funcao | null>(null);
  const [salvando, setSalvando] = useState(false);
  
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
  
  const [funcoesTotvs, setFuncoesTotvs] = useState<FuncaoTotvs[]>([]);
  const [selectedTotvs, setSelectedTotvs] = useState<string[]>([]);
  const [loadingTotvs, setLoadingTotvs] = useState(false);
  const [importando, setImportando] = useState(false);
  const [buscaTotvs, setBuscaTotvs] = useState("");

  useEffect(() => {
    if (token) carregarFuncoes();
  }, [token, apenasAtivos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) carregarFuncoes();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarFuncoes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await funcoesApi.listar(token, { 
        busca: busca || undefined,
        ativo: apenasAtivos,
      });
      setFuncoes(data);
    } catch (error) {
      console.error("Erro ao carregar funções:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as funções.",
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
        await funcoesApi.atualizar(token, editando.id, formData);
        toast({
          title: "Função atualizada",
          description: "Função atualizada com sucesso.",
        });
      } else {
        await funcoesApi.criar(token, formData);
        toast({
          title: "Função criada",
          description: "Função criada com sucesso.",
        });
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarFuncoes();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a função.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setFormData({ codigo: "", nome: "", codigo_totvs: "", cbo: "", jornada_mensal: 180, is_home_office: false, is_pj: false, ativo: true });
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
      toast({
        title: "Função excluída",
        description: "Função excluída com sucesso.",
      });
      carregarFuncoes();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a função.",
        variant: "destructive",
      });
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
      toast({
        title: "Erro ao carregar TOTVS",
        description: "Não foi possível carregar as funções do TOTVS.",
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
      const resultado = await funcoesApi.importarTotvs(token, selectedTotvs);
      toast({
        title: "Importação concluída",
        description: `Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`,
      });
      setShowImport(false);
      setSelectedTotvs([]);
      carregarFuncoes();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro ao importar",
        description: "Não foi possível importar as funções.",
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Funções</CardTitle>
              <CardDescription>
                {funcoes.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apenas-ativos-funcoes"
                  checked={apenasAtivos}
                  onCheckedChange={(checked) => setApenasAtivos(checked === true)}
                />
                <Label htmlFor="apenas-ativos-funcoes" className="text-sm cursor-pointer">
                  Apenas ativos
                </Label>
              </div>
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar função..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={abrirImportacao}>
                <Download className="size-4 mr-2" />
                Importar do TOTVS
              </Button>
              <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
                <Plus className="size-4 mr-2" />
                Nova Função
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : funcoes.length === 0 ? (
            <div className="empty-state">
              <Briefcase className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca ? "Nenhuma função encontrada" : "Nenhuma função cadastrada"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CBO</TableHead>
                  <TableHead>Código TOTVS</TableHead>
                  <TableHead className="text-center">Jornada</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcoes.map((funcao) => (
                  <TableRow key={funcao.id}>
                    <TableCell className="font-mono text-xs">{funcao.codigo}</TableCell>
                    <TableCell className="font-semibold">{funcao.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{funcao.cbo || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{funcao.codigo_totvs || "-"}</TableCell>
                    <TableCell className="text-center text-sm">{funcao.jornada_mensal || 180}h</TableCell>
                    <TableCell className="text-center">
                      {funcao.ativo ? (
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
                          onClick={() => handleEdit(funcao)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(funcao.id)}
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
              {editando ? "Editar Função" : "Nova Função"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da função
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cbo">CBO</Label>
                <Input
                  id="cbo"
                  value={formData.cbo}
                  onChange={(e) => setFormData({ ...formData, cbo: e.target.value })}
                  placeholder="Ex: 4223-05"
                />
              </div>
              <div>
                <Label htmlFor="jornada_mensal">Jornada (h/mês)</Label>
                <Input
                  id="jornada_mensal"
                  type="number"
                  value={formData.jornada_mensal}
                  onChange={(e) => setFormData({ ...formData, jornada_mensal: parseInt(e.target.value) || 180 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_home_office"
                  checked={formData.is_home_office}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_home_office: checked === true })}
                />
                <Label htmlFor="is_home_office" className="cursor-pointer">Home Office</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_pj"
                  checked={formData.is_pj}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pj: checked === true })}
                />
                <Label htmlFor="is_pj" className="cursor-pointer">PJ</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ativo_funcao"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked === true })}
                />
                <Label htmlFor="ativo_funcao" className="cursor-pointer">Ativo</Label>
              </div>
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
            <DialogTitle>Importar Funções do TOTVS</DialogTitle>
            <DialogDescription>
              Selecione as funções que deseja importar do CORPORERM
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-2 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome, código ou CBO..."
                value={buscaTotvs}
                onChange={(e) => setBuscaTotvs(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={selectAllTotvs}>
              Selecionar Todos
            </Button>
          </div>

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
                      <TableHead>CBO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTotvs.map((funcao) => (
                      <TableRow 
                        key={funcao.codigo}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelectTotvs(funcao.codigo)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTotvs.includes(funcao.codigo)}
                            onCheckedChange={() => toggleSelectTotvs(funcao.codigo)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{funcao.codigo}</TableCell>
                        <TableCell>{funcao.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{funcao.cbo || "-"}</TableCell>
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
    </>
  );
}

// ============================================
// Tab: Tabela Salarial
// ============================================
function TabelaSalarialTab() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [itens, setItens] = useState<TabelaSalarial[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [faixas, setFaixas] = useState<FaixaSalarial[]>([]);
  const [politicas, setPoliticas] = useState<PoliticaBeneficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<TabelaSalarial | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    funcao_id: "",
    faixa_id: "",
    politica_id: "",
    regime: "CLT" as 'CLT' | 'PJ',
    salario_base: 0,
    ativo: true,
  });

  useEffect(() => {
    if (token) carregarDados();
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
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os dados.",
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
      const data = {
        ...formData,
        faixa_id: formData.faixa_id || null,
        politica_id: formData.politica_id || null,
        override_vt_dia: null,
        override_vr_dia: null,
        override_plano_saude: null,
      };
      if (editando) {
        await tabelaSalarialApi.atualizar(token, editando.id, data);
        toast({ title: "Item atualizado", description: "Item atualizado com sucesso." });
      } else {
        await tabelaSalarialApi.criar(token, data);
        toast({ title: "Item criado", description: "Item criado com sucesso." });
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarDados();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
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
      toast({ title: "Item excluído", description: "Item excluído com sucesso." });
      carregarDados();
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  const handleGerarFaixas = async () => {
    if (!token) return;
    try {
      await faixasSalariaisApi.gerarPadrao(token);
      toast({ title: "Faixas criadas", description: "Faixas salariais padrão criadas." });
      carregarDados();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao gerar faixas", variant: "destructive" });
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Tabela Salarial</CardTitle>
              <CardDescription>
                {itens.length} registro(s) encontrado(s)
                {faixas.length > 0 && (
                  <span className="ml-2">
                    • Faixas: {faixas.map(f => f.nome).join(", ")}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {faixas.length === 0 && (
                <Button variant="outline" onClick={handleGerarFaixas}>
                  Criar Faixas (Jr/Pl/Sr)
                </Button>
              )}
              <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
                <Plus className="size-4 mr-2" />
                Novo Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : itens.length === 0 ? (
            <div className="empty-state">
              <DollarSign className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum item cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">Salário Base</TableHead>
                  <TableHead>Política</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.funcao?.nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.regime === 'CLT' ? 'info' : 'outline'}>
                        {item.regime}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.faixa ? (
                        <Badge variant="alert">{item.faixa.nome}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatarValor(item.salario_base)}
                    </TableCell>
                    <TableCell className="text-sm">{item.politica?.nome || "-"}</TableCell>
                    <TableCell className="text-center">
                      {item.ativo ? (
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
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(item)}>
                          <Edit2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(item.id)}>
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
            <DialogTitle>{editando ? "Editar Item" : "Novo Item da Tabela Salarial"}</DialogTitle>
            <DialogDescription>Vincule função, faixa e política de benefícios</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Função *</Label>
              <Select value={formData.funcao_id} onValueChange={(v) => setFormData({ ...formData, funcao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {funcoes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Regime</Label>
                <Select value={formData.regime} onValueChange={(v) => setFormData({ ...formData, regime: v as 'CLT' | 'PJ' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Faixa</Label>
                <Select value={formData.faixa_id || "__none__"} onValueChange={(v) => setFormData({ ...formData, faixa_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sem faixa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem faixa</SelectItem>
                    {faixas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Salário Base (R$) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={formData.salario_base} 
                onChange={(e) => setFormData({ ...formData, salario_base: parseFloat(e.target.value) || 0 })}
                required 
              />
            </div>

            <div>
              <Label>Política de Benefícios</Label>
              <Select value={formData.politica_id || "__none__"} onValueChange={(v) => setFormData({ ...formData, politica_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sem política" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem política</SelectItem>
                  {politicas.filter(p => p.regime === formData.regime).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} ({p.escala}, {p.jornada_mensal}h)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Apenas políticas do regime {formData.regime} são exibidas
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editando ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// Tab: Benefícios (Políticas de Benefícios)
// ============================================
function BeneficiosTab() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [politicas, setPoliticas] = useState<PoliticaBeneficio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<PoliticaBeneficio | null>(null);
  const [salvando, setSalvando] = useState(false);
  
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
      toast({ title: "Erro ao carregar", description: "Não foi possível carregar.", variant: "destructive" });
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
        await politicasBeneficioApi.atualizar(token, editando.id, formData);
        toast({ title: "Política atualizada", description: "Política atualizada com sucesso." });
      } else {
        await politicasBeneficioApi.criar(token, formData);
        toast({ title: "Política criada", description: "Política criada com sucesso." });
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarPoliticas();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSalvando(false);
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
      toast({ title: "Política excluída", description: "Política excluída com sucesso." });
      carregarPoliticas();
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  const handleGerarPadrao = async () => {
    if (!token || !confirm("Deseja gerar as políticas padrão?")) return;
    try {
      await politicasBeneficioApi.gerarPadrao(token);
      toast({ title: "Políticas criadas", description: "Políticas padrão criadas." });
      carregarPoliticas();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao gerar.", variant: "destructive" });
    }
  };

  const formatarValor = (valor: number) => `R$ ${valor.toFixed(2)}`;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Políticas de Benefícios</CardTitle>
              <CardDescription>
                {politicas.length} política(s) cadastrada(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleGerarPadrao}>
                Gerar Padrão
              </Button>
              <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
                <Plus className="size-4 mr-2" />
                Nova Política
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : politicas.length === 0 ? (
            <div className="empty-state">
              <Users className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma política cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Escala</TableHead>
                  <TableHead className="text-right">VT/dia</TableHead>
                  <TableHead className="text-right">VR/dia</TableHead>
                  <TableHead className="text-right">Plano Saúde</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {politicas.map((pol) => (
                  <TableRow key={pol.id}>
                    <TableCell className="font-mono text-xs">{pol.codigo}</TableCell>
                    <TableCell className="font-semibold">{pol.nome}</TableCell>
                    <TableCell>
                      <Badge variant={pol.regime === 'CLT' ? 'info' : 'outline'}>{pol.regime}</Badge>
                    </TableCell>
                    <TableCell>{pol.escala}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatarValor(pol.vt_dia)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatarValor(pol.vr_dia)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatarValor(pol.plano_saude)}</TableCell>
                    <TableCell className="text-center">
                      {pol.ativo ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" />Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><XCircle className="size-3" />Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(pol)}>
                          <Edit2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(pol.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Política" : "Nova Política de Benefícios"}</DialogTitle>
            <DialogDescription>Configure os benefícios desta política</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Código *</Label>
                <Input value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Regime</Label>
                <Select value={formData.regime} onValueChange={(v) => setFormData({ ...formData, regime: v as 'CLT' | 'PJ' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Escala</Label>
                <Select value={formData.escala} onValueChange={(v) => setFormData({ ...formData, escala: v as '5x2' | '6x1' | '12x36' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5x2">5x2</SelectItem>
                    <SelectItem value="6x1">6x1</SelectItem>
                    <SelectItem value="12x36">12x36</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jornada (h/mês)</Label>
                <Input type="number" value={formData.jornada_mensal} onChange={(e) => setFormData({ ...formData, jornada_mensal: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Benefícios</p>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>VT/dia (R$)</Label>
                <Input type="number" step="0.01" value={formData.vt_dia} onChange={(e) => setFormData({ ...formData, vt_dia: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>VR/dia (R$)</Label>
                <Input type="number" step="0.01" value={formData.vr_dia} onChange={(e) => setFormData({ ...formData, vr_dia: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>VA/dia (R$)</Label>
                <Input type="number" step="0.01" value={formData.va_dia} onChange={(e) => setFormData({ ...formData, va_dia: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Plano Saúde (R$/mês)</Label>
                <Input type="number" step="0.01" value={formData.plano_saude} onChange={(e) => setFormData({ ...formData, plano_saude: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Plano Dental (R$/mês)</Label>
                <Input type="number" step="0.01" value={formData.plano_dental} onChange={(e) => setFormData({ ...formData, plano_dental: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Seguro Vida (R$/mês)</Label>
                <Input type="number" step="0.01" value={formData.seguro_vida} onChange={(e) => setFormData({ ...formData, seguro_vida: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Auxílio Home Office (R$/mês)</Label>
                <Input type="number" step="0.01" value={formData.aux_home_office} onChange={(e) => setFormData({ ...formData, aux_home_office: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vt_desconto"
                  checked={formData.vt_desconto_6pct}
                  onCheckedChange={(c) => setFormData({ ...formData, vt_desconto_6pct: c === true })}
                />
                <Label htmlFor="vt_desconto" className="cursor-pointer">Desconto 6% VT</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ativo_pol"
                  checked={formData.ativo}
                  onCheckedChange={(c) => setFormData({ ...formData, ativo: c === true })}
                />
                <Label htmlFor="ativo_pol" className="cursor-pointer">Ativo</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editando ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// Tab: Provisões
// ============================================
function ProvisoesTab() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [provisoes, setProvisoes] = useState<Provisao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Provisao | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    percentual: 0,
    incide_encargos: true,
    ordem: 0,
    ativo: true,
  });

  useEffect(() => {
    if (token) carregarProvisoes();
  }, [token]);

  const carregarProvisoes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await provisoesApi.listar(token);
      setProvisoes(data);
    } catch (error) {
      console.error("Erro ao carregar provisões:", error);
      toast({ title: "Erro ao carregar", description: "Não foi possível carregar.", variant: "destructive" });
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
        await provisoesApi.atualizar(token, editando.id, formData);
        toast({ title: "Provisão atualizada", description: "Provisão atualizada com sucesso." });
      } else {
        await provisoesApi.criar(token, formData);
        toast({ title: "Provisão criada", description: "Provisão criada com sucesso." });
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarProvisoes();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setFormData({ codigo: "", nome: "", descricao: "", percentual: 0, incide_encargos: true, ordem: 0, ativo: true });
  };

  const handleEdit = (provisao: Provisao) => {
    setEditando(provisao);
    setFormData({
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
      toast({ title: "Provisão excluída", description: "Provisão excluída com sucesso." });
      carregarProvisoes();
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  const handleGerarPadrao = async () => {
    if (!token || !confirm("Deseja gerar as provisões padrão (13º, Férias, Demandas)?")) return;
    try {
      await provisoesApi.gerarPadrao(token);
      toast({ title: "Provisões criadas", description: "Provisões padrão criadas." });
      carregarProvisoes();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao gerar provisões.", variant: "destructive" });
    }
  };

  const totalProvisoes = provisoes.filter(p => p.ativo).reduce((acc, p) => acc + p.percentual, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Provisões Trabalhistas</CardTitle>
              <CardDescription>
                {provisoes.length} provisão(ões) • Total: {totalProvisoes.toFixed(2)}% sobre o salário
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {provisoes.length === 0 && (
                <Button variant="outline" onClick={handleGerarPadrao}>
                  Gerar Padrão
                </Button>
              )}
              <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
                <Plus className="size-4 mr-2" />
                Nova Provisão
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : provisoes.length === 0 ? (
            <div className="empty-state">
              <Calculator className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma provisão cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Percentual</TableHead>
                  <TableHead className="text-center">Incide Encargos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provisoes.map((provisao) => (
                  <TableRow key={provisao.id}>
                    <TableCell className="font-mono text-xs">{provisao.codigo}</TableCell>
                    <TableCell className="font-semibold">{provisao.nome}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{provisao.percentual.toFixed(2)}%</TableCell>
                    <TableCell className="text-center">
                      {provisao.incide_encargos ? (
                        <CheckCircle2 className="size-4 mx-auto text-green-600" />
                      ) : (
                        <XCircle className="size-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {provisao.ativo ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" />Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><XCircle className="size-3" />Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(provisao)}>
                          <Edit2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(provisao.id)}>
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
            <DialogTitle>{editando ? "Editar Provisão" : "Nova Provisão"}</DialogTitle>
            <DialogDescription>Configure os dados da provisão</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="13_SALARIO"
                  required
                />
              </div>
              <div>
                <Label>Percentual (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.percentual}
                  onChange={(e) => setFormData({ ...formData, percentual: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="13º Salário"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incide_encargos"
                  checked={formData.incide_encargos}
                  onCheckedChange={(c) => setFormData({ ...formData, incide_encargos: c === true })}
                />
                <Label htmlFor="incide_encargos" className="cursor-pointer">Incide encargos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ativo_prov"
                  checked={formData.ativo}
                  onCheckedChange={(c) => setFormData({ ...formData, ativo: c === true })}
                />
                <Label htmlFor="ativo_prov" className="cursor-pointer">Ativo</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editando ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
