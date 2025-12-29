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
import { useToast } from "@/hooks/use-toast";

export default function SecoesPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("ALL");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editando, setEditando] = useState<Secao | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    departamento_id: "",
    codigo: "",
    nome: "",
    codigo_totvs: "",
    ativo: true,
    // Política de trabalho
    trabalha_sabado: 0 as number,  // 0=não, 0.5=meio período, 1=integral
    trabalha_domingo: false,
    trabalha_feriado_nacional: false,
    trabalha_feriado_estadual: false,
    trabalha_feriado_municipal: false,
    uf: "",
    cidade: "",
  });
  
  // Import state
  const [secoesTotvs, setSecoesTotvs] = useState<SecaoTotvs[]>([]);
  const [selectedTotvs, setSelectedTotvs] = useState<string[]>([]);
  const [loadingTotvs, setLoadingTotvs] = useState(false);
  const [importando, setImportando] = useState(false);
  const [deptoImport, setDeptoImport] = useState("");

  useEffect(() => {
    if (token) {
      carregarDepartamentos();
      carregarDados();
    }
  }, [token, apenasAtivos, filtroDepto]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) carregarDados();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarDepartamentos = async () => {
    if (!token) return;
    try {
      const deptosData = await departamentosApi.listar(token, { ativo: true });
      setDepartamentos(deptosData);
    } catch (error) {
      console.error("Erro ao carregar departamentos:", error);
    }
  };

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const secoesData = await secoesApi.listar(token, { 
        busca: busca || undefined, 
        departamento_id: filtroDepto !== "ALL" ? filtroDepto : undefined,
        ativo: apenasAtivos,
      });
      setSecoes(secoesData);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as seções.",
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
        await secoesApi.atualizar(token, editando.id, formData);
        toast({
          title: "Seção atualizada",
          description: "Seção atualizada com sucesso.",
        });
      } else {
        await secoesApi.criar(token, formData);
        toast({
          title: "Seção criada",
          description: "Seção criada com sucesso.",
        });
      }
      setShowForm(false);
      setEditando(null);
      resetForm();
      carregarDados();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a seção.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      departamento_id: "", 
      codigo: "", 
      nome: "", 
      codigo_totvs: "", 
      ativo: true,
      trabalha_sabado: 0,
      trabalha_domingo: false,
      trabalha_feriado_nacional: false,
      trabalha_feriado_estadual: false,
      trabalha_feriado_municipal: false,
      uf: "",
      cidade: "",
    });
  };

  const handleEdit = (secao: Secao) => {
    setEditando(secao);
    setFormData({
      departamento_id: secao.departamento_id,
      codigo: secao.codigo,
      nome: secao.nome,
      codigo_totvs: secao.codigo_totvs || "",
      ativo: secao.ativo,
      trabalha_sabado: secao.trabalha_sabado ?? 0,
      trabalha_domingo: secao.trabalha_domingo ?? false,
      trabalha_feriado_nacional: secao.trabalha_feriado_nacional ?? false,
      trabalha_feriado_estadual: secao.trabalha_feriado_estadual ?? false,
      trabalha_feriado_municipal: secao.trabalha_feriado_municipal ?? false,
      uf: secao.uf || "",
      cidade: secao.cidade || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir esta seção?")) return;
    try {
      await secoesApi.excluir(token, id);
      toast({
        title: "Seção excluída",
        description: "Seção excluída com sucesso.",
      });
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a seção.",
        variant: "destructive",
      });
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
      toast({
        title: "Erro ao carregar TOTVS",
        description: "Não foi possível carregar as seções do TOTVS.",
        variant: "destructive",
      });
    } finally {
      setLoadingTotvs(false);
    }
  };

  const handleImportar = async () => {
    if (!token || selectedTotvs.length === 0 || !deptoImport) return;
    setImportando(true);
    try {
      const resultado = await secoesApi.importarTotvs(token, selectedTotvs, deptoImport);
      toast({
        title: "Importação concluída",
        description: `Importados: ${resultado.importados}, Ignorados: ${resultado.ignorados}`,
      });
      setShowImport(false);
      setSelectedTotvs([]);
      setDeptoImport("");
      carregarDados();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro ao importar",
        description: "Não foi possível importar as seções.",
        variant: "destructive",
      });
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
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Seções</h1>
          <p className="text-sm text-muted-foreground">
            Unidades operacionais dentro dos departamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Download className="size-4 mr-2" />
            Importar do TOTVS
          </Button>
          <Button onClick={() => { setEditando(null); resetForm(); setShowForm(true); }}>
            <Plus className="size-4 mr-2" />
            Nova Seção
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Seções</CardTitle>
              <CardDescription>
                {secoes.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filtroDepto} onValueChange={setFiltroDepto}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os departamentos</SelectItem>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  placeholder="Buscar seção..."
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
          ) : secoes.length === 0 ? (
            <div className="empty-state">
              <Layers className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca || filtroDepto !== "ALL" ? "Nenhuma seção encontrada" : "Nenhuma seção cadastrada"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Política de Trabalho</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secoes.map((secao) => (
                  <TableRow key={secao.id}>
                    <TableCell className="font-mono text-xs">{secao.codigo}</TableCell>
                    <TableCell className="font-semibold">{secao.nome}</TableCell>
                    <TableCell className="text-sm">
                      {secao.departamento?.nome || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {secao.trabalha_sabado > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Sáb {secao.trabalha_sabado === 1 ? "Int" : "½"}
                          </Badge>
                        )}
                        {secao.trabalha_domingo && (
                          <Badge variant="outline" className="text-[10px]">Dom</Badge>
                        )}
                        {secao.trabalha_feriado_nacional && (
                          <Badge variant="alert" className="text-[10px]">Fer.Nac</Badge>
                        )}
                        {secao.trabalha_feriado_estadual && (
                          <Badge variant="alert" className="text-[10px]">Fer.Est</Badge>
                        )}
                        {secao.trabalha_feriado_municipal && (
                          <Badge variant="alert" className="text-[10px]">Fer.Mun</Badge>
                        )}
                        {!secao.trabalha_sabado && !secao.trabalha_domingo && 
                         !secao.trabalha_feriado_nacional && !secao.trabalha_feriado_estadual && 
                         !secao.trabalha_feriado_municipal && (
                          <span className="text-xs text-muted-foreground">Padrão</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {secao.ativo ? (
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
                          onClick={() => handleEdit(secao)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(secao.id)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Seção" : "Nova Seção"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da seção
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="departamento_id">Departamento *</Label>
              <Select
                value={formData.departamento_id}
                onValueChange={(value) => setFormData({ ...formData, departamento_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked === true })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
            </div>

            {/* Política de Trabalho */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3">Política de Trabalho</h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="trabalha_sabado">Trabalha aos Sábados</Label>
                  <Select
                    value={String(formData.trabalha_sabado)}
                    onValueChange={(value) => setFormData({ ...formData, trabalha_sabado: parseFloat(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Não trabalha</SelectItem>
                      <SelectItem value="0.5">Meio período</SelectItem>
                      <SelectItem value="1">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="trabalha_domingo"
                    checked={formData.trabalha_domingo}
                    onCheckedChange={(checked) => setFormData({ ...formData, trabalha_domingo: checked === true })}
                  />
                  <Label htmlFor="trabalha_domingo" className="cursor-pointer">Trabalha aos Domingos</Label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trabalha_feriado_nacional"
                      checked={formData.trabalha_feriado_nacional}
                      onCheckedChange={(checked) => setFormData({ ...formData, trabalha_feriado_nacional: checked === true })}
                    />
                    <Label htmlFor="trabalha_feriado_nacional" className="cursor-pointer text-xs">Feriado Nacional</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trabalha_feriado_estadual"
                      checked={formData.trabalha_feriado_estadual}
                      onCheckedChange={(checked) => setFormData({ ...formData, trabalha_feriado_estadual: checked === true })}
                    />
                    <Label htmlFor="trabalha_feriado_estadual" className="cursor-pointer text-xs">Feriado Estadual</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trabalha_feriado_municipal"
                      checked={formData.trabalha_feriado_municipal}
                      onCheckedChange={(checked) => setFormData({ ...formData, trabalha_feriado_municipal: checked === true })}
                    />
                    <Label htmlFor="trabalha_feriado_municipal" className="cursor-pointer text-xs">Feriado Municipal</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Localização (para feriados estaduais/municipais) */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3">Localização</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Usada para determinar quais feriados estaduais e municipais se aplicam
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
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
            <DialogTitle>Importar Seções do TOTVS</DialogTitle>
            <DialogDescription>
              Selecione o departamento de destino e as seções a importar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div>
              <Label>Departamento de destino *</Label>
              <Select value={deptoImport} onValueChange={setDeptoImport}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secoesTotvs.map((secao) => (
                      <TableRow 
                        key={secao.codigo}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSelectTotvs(secao.codigo)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTotvs.includes(secao.codigo)}
                            onCheckedChange={() => toggleSelectTotvs(secao.codigo)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{secao.codigo}</TableCell>
                        <TableCell>{secao.descricao}</TableCell>
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
              <Button onClick={handleImportar} disabled={selectedTotvs.length === 0 || !deptoImport || importando}>
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
