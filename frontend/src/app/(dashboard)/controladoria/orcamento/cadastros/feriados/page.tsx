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
  Edit2, 
  Trash2, 
  CalendarDays,
  Loader2,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { feriadosApi, type Feriado } from "@/lib/api/orcamento";
import { useToast } from "@/hooks/use-toast";

const TIPOS_FERIADO = [
  { value: "NACIONAL", label: "Nacional" },
  { value: "ESTADUAL", label: "Estadual" },
  { value: "MUNICIPAL", label: "Municipal" },
];

export default function FeriadosPage() {
  const { accessToken: token } = useAuthStore();
  const { toast } = useToast();
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Feriado | null>(null);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    data: "",
    nome: "",
    tipo: "NACIONAL" as "NACIONAL" | "ESTADUAL" | "MUNICIPAL",
    uf: "",
    cidade: "",
    recorrente: false,
  });

  useEffect(() => {
    if (token) carregarDados();
  }, [token, anoFiltro]);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await feriadosApi.listarPorAno(token, anoFiltro);
      setFeriados(data);
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os feriados.",
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
        await feriadosApi.atualizar(token, editando.id, formData);
        toast({
          title: "Feriado atualizado",
          description: "Feriado atualizado com sucesso.",
        });
      } else {
        await feriadosApi.criar(token, formData);
        toast({
          title: "Feriado criado",
          description: "Feriado criado com sucesso.",
        });
      }
      setShowForm(false);
      resetForm();
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o feriado.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setEditando(null);
    setFormData({
      data: "",
      nome: "",
      tipo: "NACIONAL",
      uf: "",
      cidade: "",
      recorrente: false,
    });
  };

  const handleEdit = (feriado: Feriado) => {
    setEditando(feriado);
    setFormData({
      data: feriado.data,
      nome: feriado.nome,
      tipo: feriado.tipo,
      uf: feriado.uf || "",
      cidade: feriado.cidade || "",
      recorrente: feriado.recorrente,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Deseja excluir este feriado?")) return;
    try {
      await feriadosApi.excluir(token, id);
      toast({
        title: "Feriado excluído",
        description: "Feriado excluído com sucesso.",
      });
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o feriado.",
        variant: "destructive",
      });
    }
  };

  const gerarNacionais = async () => {
    if (!token) return;
    setGerando(true);
    try {
      const criados = await feriadosApi.gerarNacionais(token, anoFiltro);
      toast({
        title: "Feriados gerados",
        description: `${criados.length} feriados nacionais gerados para ${anoFiltro}`,
      });
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao gerar",
        description: "Não foi possível gerar os feriados nacionais.",
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getDiaSemana = (dataStr: string) => {
    const data = new Date(dataStr + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { weekday: "long" });
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Feriados</h1>
          <p className="text-sm text-muted-foreground">
            Calendário de feriados para cálculo de dias úteis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={gerarNacionais} disabled={gerando}>
            {gerando ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
            Gerar Nacionais {anoFiltro}
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="size-4 mr-2" />
            Novo Feriado
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Feriados</CardTitle>
              <CardDescription>
                {feriados.length} feriado(s) cadastrado(s) em {anoFiltro}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Ano:</Label>
              <div className="flex gap-1">
                {[anoFiltro - 1, anoFiltro, anoFiltro + 1].map(ano => (
                  <Button
                    key={ano}
                    variant={ano === anoFiltro ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnoFiltro(ano)}
                  >
                    {ano}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : feriados.length === 0 ? (
            <div className="empty-state">
              <CalendarDays className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum feriado cadastrado para {anoFiltro}.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em &quot;Gerar Nacionais&quot; para criar os feriados fixos.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Dia da Semana</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-center">Recorrente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feriados.map((feriado) => (
                  <TableRow key={feriado.id}>
                    <TableCell className="font-mono text-xs">
                      {formatarData(feriado.data)}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {getDiaSemana(feriado.data)}
                    </TableCell>
                    <TableCell className="font-semibold">{feriado.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TIPOS_FERIADO.find(t => t.value === feriado.tipo)?.label || feriado.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {feriado.cidade && feriado.uf 
                        ? `${feriado.cidade}/${feriado.uf}` 
                        : feriado.uf || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {feriado.recorrente ? (
                        <Badge variant="success">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEdit(feriado)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(feriado.id)}
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
              {editando ? "Editar Feriado" : "Novo Feriado"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do feriado
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
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
                placeholder="Ex: Natal"
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value as typeof formData.tipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_FERIADO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.tipo === "ESTADUAL" || formData.tipo === "MUNICIPAL") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uf">UF *</Label>
                  <Input
                    id="uf"
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    maxLength={2}
                    required
                  />
                </div>
                {formData.tipo === "MUNICIPAL" && (
                  <div>
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="recorrente"
                checked={formData.recorrente}
                onCheckedChange={(checked) => setFormData({ ...formData, recorrente: checked === true })}
              />
              <Label htmlFor="recorrente" className="cursor-pointer">Feriado anual (recorrente)</Label>
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
    </div>
  );
}
