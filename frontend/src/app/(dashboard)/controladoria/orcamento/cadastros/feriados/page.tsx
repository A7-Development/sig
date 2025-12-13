"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CalendarDays,
  Loader2,
  Sparkles,
  Globe,
  MapPin
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { feriadosApi, type Feriado } from "@/lib/api/orcamento";

const TIPOS_FERIADO = [
  { value: "NACIONAL", label: "Nacional", icon: Globe, color: "bg-blue-100 text-blue-600" },
  { value: "ESTADUAL", label: "Estadual", icon: MapPin, color: "bg-purple-100 text-purple-600" },
  { value: "MUNICIPAL", label: "Municipal", icon: MapPin, color: "bg-orange-100 text-orange-600" },
];

export default function FeriadosPage() {
  const { accessToken: token } = useAuthStore();
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Feriado | null>(null);
  const [gerando, setGerando] = useState(false);
  
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editando) {
        await feriadosApi.atualizar(token, editando.id, formData);
      } else {
        await feriadosApi.criar(token, formData);
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
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const gerarNacionais = async () => {
    if (!token) return;
    setGerando(true);
    try {
      const criados = await feriadosApi.gerarNacionais(token, anoFiltro);
      alert(`${criados.length} feriados nacionais gerados para ${anoFiltro}`);
      carregarDados();
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setGerando(false);
    }
  };

  const getTipoInfo = (tipo: string) => TIPOS_FERIADO.find(t => t.value === tipo) || TIPOS_FERIADO[0];

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const getDiaSemana = (dataStr: string) => {
    const data = new Date(dataStr + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { weekday: "short" });
  };

  // Agrupar por mês
  const feriadosPorMes = feriados.reduce((acc, f) => {
    const mes = new Date(f.data + "T00:00:00").getMonth();
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(f);
    return acc;
  }, {} as Record<number, Feriado[]>);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feriados</h1>
          <p className="text-muted-foreground">
            Calendário de feriados para cálculo de dias úteis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={gerarNacionais} disabled={gerando}>
            {gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Nacionais {anoFiltro}
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Feriado
          </Button>
        </div>
      </div>

      {/* Filtro por ano */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <label className="font-medium">Ano:</label>
            <div className="flex gap-2">
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
        </CardContent>
      </Card>

      {/* Lista por mês */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : feriados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum feriado cadastrado para {anoFiltro}.
            <br />
            Clique em &quot;Gerar Nacionais&quot; para criar os feriados fixos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(feriadosPorMes)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([mes, feriadosMes]) => (
              <Card key={mes}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{meses[Number(mes)]}</CardTitle>
                  <CardDescription>{feriadosMes.length} feriado(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {feriadosMes.map((feriado) => {
                      const tipoInfo = getTipoInfo(feriado.tipo);
                      return (
                        <div
                          key={feriado.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-center min-w-[50px]">
                              <div className="text-lg font-bold">{formatarData(feriado.data).split(" ")[0]}</div>
                              <div className="text-xs text-muted-foreground">{getDiaSemana(feriado.data)}</div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{feriado.nome}</span>
                                {feriado.recorrente && (
                                  <span className="text-xs text-muted-foreground">(anual)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <tipoInfo.icon className="h-3 w-3" />
                                <span className="text-xs text-muted-foreground">
                                  {tipoInfo.label}
                                  {feriado.uf && ` - ${feriado.uf}`}
                                  {feriado.cidade && `/${feriado.cidade}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(feriado)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(feriado.id)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editando ? "Editar Feriado" : "Novo Feriado"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Ex: Natal"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as typeof formData.tipo })}
                  >
                    {TIPOS_FERIADO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {(formData.tipo === "ESTADUAL" || formData.tipo === "MUNICIPAL") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">UF *</label>
                      <Input
                        value={formData.uf}
                        onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                        maxLength={2}
                        required
                      />
                    </div>
                    {formData.tipo === "MUNICIPAL" && (
                      <div>
                        <label className="text-sm font-medium">Cidade *</label>
                        <Input
                          value={formData.cidade}
                          onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.recorrente}
                    onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
                  />
                  <label className="text-sm">Feriado anual (recorrente)</label>
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
    </div>
  );
}

