"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  GitCompare, 
  Plus, 
  Pencil, 
  Trash2,
  Copy,
  Users,
  Settings,
  AlertCircle,
  Lock,
  CheckCircle,
  FileEdit,
  DollarSign,
  ChevronDown,
  Building2,
  Calendar
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi, 
  empresasApi,
  funcoesApi,
  secoesApi,
  centrosCustoApi,
  tabelaSalarialApi,
  type Cenario,
  type Premissa,
  type QuadroPessoal,
  type Empresa,
  type Funcao,
  type Secao,
  type CentroCusto,
  type TabelaSalarial,
  type ResumoCustos,
} from "@/lib/api/orcamento";

export default function CenariosPage() {
  const { accessToken: token } = useAuthStore();
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [cenarioSelecionado, setCenarioSelecionado] = useState<Cenario | null>(null);
  const [premissas, setPremissas] = useState<Premissa[]>([]);
  const [quadro, setQuadro] = useState<QuadroPessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  
  // Dados auxiliares
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [tabelaSalarial, setTabelaSalarial] = useState<TabelaSalarial[]>([]);
  
  // Abas
  const [abaAtiva, setAbaAtiva] = useState<'premissas' | 'quadro' | 'custos'>('premissas');
  const [custos, setCustos] = useState<ResumoCustos | null>(null);
  const [loadingCustos, setLoadingCustos] = useState(false);
  
  // Modal Cenário
  const [showFormCenario, setShowFormCenario] = useState(false);
  const [editandoCenario, setEditandoCenario] = useState<Cenario | null>(null);
  const [formCenario, setFormCenario] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    empresa_id: "" as string | null,
    ano: new Date().getFullYear() + 1,
    mes_inicio: 1,
    mes_fim: 12,
    status: "RASCUNHO" as 'RASCUNHO' | 'APROVADO' | 'BLOQUEADO',
    ativo: true,
  });
  
  // Modal Posição
  const [showFormPosicao, setShowFormPosicao] = useState(false);
  const [editandoPosicao, setEditandoPosicao] = useState<QuadroPessoal | null>(null);
  const [formPosicao, setFormPosicao] = useState({
    funcao_id: "",
    secao_id: "" as string | null,
    centro_custo_id: "" as string | null,
    tabela_salarial_id: "" as string | null,
    regime: "CLT" as 'CLT' | 'PJ',
    qtd_jan: 0, qtd_fev: 0, qtd_mar: 0, qtd_abr: 0,
    qtd_mai: 0, qtd_jun: 0, qtd_jul: 0, qtd_ago: 0,
    qtd_set: 0, qtd_out: 0, qtd_nov: 0, qtd_dez: 0,
    salario_override: null as number | null,
    span: null as number | null,
    observacao: "",
    ativo: true,
  });

  useEffect(() => {
    if (token) {
      carregarDados();
    }
  }, [token]);

  useEffect(() => {
    if (cenarioSelecionado && token) {
      carregarDetalhes(cenarioSelecionado.id);
    }
  }, [cenarioSelecionado, token]);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cenariosData, empresasData, funcoesData, secoesData, ccData, tsData] = await Promise.all([
        cenariosApi.listar(token),
        empresasApi.listar(token),
        funcoesApi.listar(token),
        secoesApi.listar(token),
        centrosCustoApi.listar(token),
        tabelaSalarialApi.listar(token),
      ]);
      setCenarios(cenariosData);
      setEmpresas(empresasData);
      setFuncoes(funcoesData);
      setSecoes(secoesData);
      setCentrosCusto(ccData);
      setTabelaSalarial(tsData);
      
      // Seleciona o primeiro cenário automaticamente
      if (cenariosData.length > 0 && !cenarioSelecionado) {
        setCenarioSelecionado(cenariosData[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhes = async (cenarioId: string) => {
    if (!token) return;
    setLoadingDetalhes(true);
    setCustos(null);
    try {
      const [premissasData, quadroData] = await Promise.all([
        cenariosApi.getPremissas(token, cenarioId),
        cenariosApi.getQuadro(token, cenarioId),
      ]);
      setPremissas(premissasData);
      setQuadro(quadroData);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const handleSubmitCenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      const data = {
        ...formCenario,
        empresa_id: formCenario.empresa_id || null,
      };
      
      if (editandoCenario) {
        await cenariosApi.atualizar(token, editandoCenario.id, data);
      } else {
        await cenariosApi.criar(token, data);
      }
      setShowFormCenario(false);
      setEditandoCenario(null);
      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar cenário");
    }
  };

  const handleDeleteCenario = async (id: string) => {
    if (!token || !confirm("Deseja excluir este cenário?")) return;
    try {
      await cenariosApi.excluir(token, id);
      setCenarioSelecionado(null);
      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir");
    }
  };

  const handleDuplicarCenario = async (cenario: Cenario) => {
    const novoCodigo = prompt("Código do novo cenário:", `${cenario.codigo}_COPIA`);
    if (!novoCodigo) return;
    
    const novoNome = prompt("Nome do novo cenário:", `${cenario.nome} (Cópia)`);
    if (!novoNome) return;
    
    if (!token) return;
    try {
      await cenariosApi.duplicar(token, cenario.id, novoCodigo, novoNome);
      carregarDados();
    } catch (error: any) {
      alert(error.message || "Erro ao duplicar");
    }
  };

  const handleSubmitPosicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cenarioSelecionado) return;
    
    try {
      const data = {
        ...formPosicao,
        cenario_id: cenarioSelecionado.id,
        secao_id: formPosicao.secao_id || null,
        centro_custo_id: formPosicao.centro_custo_id || null,
        tabela_salarial_id: formPosicao.tabela_salarial_id || null,
      };
      
      if (editandoPosicao) {
        await cenariosApi.updatePosicao(token, cenarioSelecionado.id, editandoPosicao.id, data);
      } else {
        await cenariosApi.addPosicao(token, cenarioSelecionado.id, data);
      }
      setShowFormPosicao(false);
      setEditandoPosicao(null);
      carregarDetalhes(cenarioSelecionado.id);
    } catch (error: any) {
      alert(error.message || "Erro ao salvar posição");
    }
  };

  const handleDeletePosicao = async (id: string) => {
    if (!token || !cenarioSelecionado || !confirm("Deseja excluir esta posição?")) return;
    try {
      await cenariosApi.deletePosicao(token, cenarioSelecionado.id, id);
      carregarDetalhes(cenarioSelecionado.id);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleUpdatePremissa = async (premissaId: string, campo: string, valor: number) => {
    if (!token || !cenarioSelecionado) return;
    try {
      await cenariosApi.updatePremissa(token, cenarioSelecionado.id, premissaId, { [campo]: valor });
      carregarDetalhes(cenarioSelecionado.id);
    } catch (error) {
      console.error("Erro ao atualizar premissa:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APROVADO': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'BLOQUEADO': return <Lock className="h-4 w-4 text-red-500" />;
      default: return <FileEdit className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO': return <Badge variant="success" className="text-[10px]">Aprovado</Badge>;
      case 'BLOQUEADO': return <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>;
      default: return <Badge variant="warning" className="text-[10px]">Rascunho</Badge>;
    }
  };

  // Calcular totais do quadro
  const totalPessoas = quadro.reduce((sum, q) => {
    return sum + q.qtd_jan + q.qtd_fev + q.qtd_mar + q.qtd_abr + 
           q.qtd_mai + q.qtd_jun + q.qtd_jul + q.qtd_ago + 
           q.qtd_set + q.qtd_out + q.qtd_nov + q.qtd_dez;
  }, 0) / 12;

  const handleCenarioChange = (cenarioId: string) => {
    const cenario = cenarios.find(c => c.id === cenarioId);
    if (cenario) {
      setCenarioSelecionado(cenario);
    }
  };

  const carregarCustos = async () => {
    if (!cenarioSelecionado || !token) return;
    setLoadingCustos(true);
    try {
      const data = await cenariosApi.calcularCustos(token, cenarioSelecionado.id);
      setCustos(data);
    } catch (error) {
      console.error("Erro ao calcular custos:", error);
    } finally {
      setLoadingCustos(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header compacto com seletor de cenário */}
      <div className="shrink-0 pb-4 border-b mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="page-title flex items-center gap-2">
                <GitCompare className="h-6 w-6" />
                Cenários de Orçamento
              </h1>
              <p className="page-subtitle">
                Análise de premissas, quadro de pessoal e custos
              </p>
            </div>
          </div>
          
          {/* Seletor de Cenário */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="filter-label">Cenário:</span>
              <Select
                value={cenarioSelecionado?.id || ""}
                onValueChange={handleCenarioChange}
              >
                <SelectTrigger className="w-[300px] h-9">
                  <SelectValue placeholder="Selecione um cenário..." />
                </SelectTrigger>
                <SelectContent>
                  {cenarios.map((cenario) => (
                    <SelectItem key={cenario.id} value={cenario.id}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(cenario.status)}
                        <span>{cenario.nome}</span>
                        <span className="text-muted-foreground text-xs">
                          ({cenario.codigo} • {cenario.ano})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {cenarioSelecionado && (
              <div className="flex items-center gap-1">
                {getStatusBadge(cenarioSelecionado.status)}
              </div>
            )}
            
            <div className="filter-divider" />
            
            {cenarioSelecionado && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleDuplicarCenario(cenarioSelecionado)}>
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicar
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setEditandoCenario(cenarioSelecionado);
                  setFormCenario({
                    codigo: cenarioSelecionado.codigo,
                    nome: cenarioSelecionado.nome,
                    descricao: cenarioSelecionado.descricao || "",
                    empresa_id: cenarioSelecionado.empresa_id,
                    ano: cenarioSelecionado.ano,
                    mes_inicio: cenarioSelecionado.mes_inicio,
                    mes_fim: cenarioSelecionado.mes_fim,
                    status: cenarioSelecionado.status,
                    ativo: cenarioSelecionado.ativo,
                  });
                  setShowFormCenario(true);
                }}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </>
            )}
            
            <Button size="sm" variant="success" onClick={() => {
              setEditandoCenario(null);
              setFormCenario({
                codigo: "",
                nome: "",
                descricao: "",
                empresa_id: null,
                ano: new Date().getFullYear() + 1,
                mes_inicio: 1,
                mes_fim: 12,
                status: "RASCUNHO",
                ativo: true,
              });
              setShowFormCenario(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
        </div>
        
        {/* Info do cenário selecionado */}
        {cenarioSelecionado && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {cenarioSelecionado.empresa?.nome_fantasia || cenarioSelecionado.empresa?.razao_social || 'Sem empresa'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {cenarioSelecionado.ano} (Mês {cenarioSelecionado.mes_inicio} a {cenarioSelecionado.mes_fim})
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {quadro.length} posições • Média: {totalPessoas.toFixed(0)} pessoas/mês
            </span>
          </div>
        )}
      </div>

      {/* Área principal com abas */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      ) : !cenarioSelecionado ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Selecione um cenário</p>
            <p className="text-sm">Use o seletor acima ou crie um novo cenário</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Abas */}
          <div className="shrink-0 flex gap-1 border-b bg-muted/30 rounded-t-lg px-2">
            <button
              onClick={() => setAbaAtiva('premissas')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                abaAtiva === 'premissas'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              Premissas
            </button>
            <button
              onClick={() => setAbaAtiva('quadro')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                abaAtiva === 'quadro'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Quadro de Pessoal
              <Badge variant="secondary" className="text-[10px] ml-1">{quadro.length}</Badge>
            </button>
            <button
              onClick={() => {
                setAbaAtiva('custos');
                if (!custos) carregarCustos();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                abaAtiva === 'custos'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              Custos
            </button>
          </div>

          {/* Conteúdo da Aba - ocupa todo o espaço disponível */}
          <div className="flex-1 overflow-hidden bg-background border border-t-0 rounded-b-lg">
            {loadingDetalhes ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : abaAtiva === 'premissas' ? (
              <div className="p-6 h-full overflow-auto">
                <div className="mb-4">
                  <h2 className="section-title">Premissas e Índices</h2>
                  <p className="page-subtitle">Defina os índices de ineficiência e premissas do cenário</p>
                </div>
                
                {premissas.length === 0 ? (
                  <div className="empty-state">
                    <Settings className="empty-state-icon" />
                    <p className="empty-state-title">Nenhuma premissa configurada</p>
                    <p className="empty-state-description">As premissas são criadas automaticamente ao criar o cenário</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {premissas.map((premissa) => (
                      <Card key={premissa.id} className="shadow-sm">
                        <CardContent className="p-4 space-y-4">
                          <div className="form-field">
                            <label className="filter-label">Absenteísmo (%)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={premissa.absenteismo}
                              onChange={(e) => handleUpdatePremissa(premissa.id, 'absenteismo', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="form-field">
                            <label className="filter-label">Turnover (%)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={premissa.turnover}
                              onChange={(e) => handleUpdatePremissa(premissa.id, 'turnover', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="form-field">
                            <label className="filter-label">Férias Índice (%)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={premissa.ferias_indice}
                              onChange={(e) => handleUpdatePremissa(premissa.id, 'ferias_indice', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="form-field">
                            <label className="filter-label">Dias Treinamento</label>
                            <Input
                              type="number"
                              value={premissa.dias_treinamento}
                              onChange={(e) => handleUpdatePremissa(premissa.id, 'dias_treinamento', parseInt(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="form-field">
                            <label className="filter-label">Reajuste (%)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={premissa.reajuste_percentual}
                              onChange={(e) => handleUpdatePremissa(premissa.id, 'reajuste_percentual', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="form-field">
                            <label className="filter-label">Dissídio Mês</label>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              value={premissa.dissidio_mes || ""}
                              onChange={(e) => handleUpdatePremissa(premissa.id, 'dissidio_mes', parseInt(e.target.value) || 0)}
                              className="h-8 text-sm"
                              placeholder="1-12"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : abaAtiva === 'quadro' ? (
              <div className="h-full flex flex-col">
                {/* Header do Quadro */}
                <div className="shrink-0 flex items-center justify-between p-4 border-b bg-muted/10">
                  <div>
                    <h2 className="section-title">Quadro de Pessoal</h2>
                    <p className="page-subtitle">Média mensal: {totalPessoas.toFixed(0)} pessoas</p>
                  </div>
                  <Button size="sm" variant="success" onClick={() => {
                    setEditandoPosicao(null);
                    setFormPosicao({
                      funcao_id: "",
                      secao_id: null,
                      centro_custo_id: null,
                      tabela_salarial_id: null,
                      regime: "CLT",
                      qtd_jan: 0, qtd_fev: 0, qtd_mar: 0, qtd_abr: 0,
                      qtd_mai: 0, qtd_jun: 0, qtd_jul: 0, qtd_ago: 0,
                      qtd_set: 0, qtd_out: 0, qtd_nov: 0, qtd_dez: 0,
                      salario_override: null,
                      span: null,
                      observacao: "",
                      ativo: true,
                    });
                    setShowFormPosicao(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Posição
                  </Button>
                </div>
                
                {/* Tabela do Quadro - ocupa todo o espaço */}
                <div className="flex-1 overflow-auto">
                  {quadro.length === 0 ? (
                    <div className="empty-state m-6">
                      <Users className="empty-state-icon" />
                      <p className="empty-state-title">Nenhuma posição cadastrada</p>
                      <p className="empty-state-description">
                        Clique em &quot;Adicionar Posição&quot; para começar a montar o quadro de pessoal
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                        <TableRow>
                          <TableHead className="min-w-[180px]">Função</TableHead>
                          <TableHead className="min-w-[140px]">Seção/CC</TableHead>
                          <TableHead className="w-20 text-center">Regime</TableHead>
                          <TableHead className="w-14 text-center">Jan</TableHead>
                          <TableHead className="w-14 text-center">Fev</TableHead>
                          <TableHead className="w-14 text-center">Mar</TableHead>
                          <TableHead className="w-14 text-center">Abr</TableHead>
                          <TableHead className="w-14 text-center">Mai</TableHead>
                          <TableHead className="w-14 text-center">Jun</TableHead>
                          <TableHead className="w-14 text-center">Jul</TableHead>
                          <TableHead className="w-14 text-center">Ago</TableHead>
                          <TableHead className="w-14 text-center">Set</TableHead>
                          <TableHead className="w-14 text-center">Out</TableHead>
                          <TableHead className="w-14 text-center">Nov</TableHead>
                          <TableHead className="w-14 text-center">Dez</TableHead>
                          <TableHead className="w-20 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quadro.map((posicao) => (
                          <TableRow key={posicao.id}>
                            <TableCell className="font-medium">{posicao.funcao?.nome || '-'}</TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <div>{posicao.secao?.nome || '-'}</div>
                                <div className="text-muted-foreground">{posicao.centro_custo?.nome || '-'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={posicao.regime === 'CLT' ? 'info' : 'alert'} className="text-[10px]">
                                {posicao.regime}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_jan}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_fev}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_mar}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_abr}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_mai}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_jun}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_jul}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_ago}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_set}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_out}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_nov}</TableCell>
                            <TableCell className="text-center font-mono text-xs">{posicao.qtd_dez}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="icon-xs" variant="ghost" onClick={() => {
                                  setEditandoPosicao(posicao);
                                  setFormPosicao({
                                    funcao_id: posicao.funcao_id,
                                    secao_id: posicao.secao_id,
                                    centro_custo_id: posicao.centro_custo_id,
                                    tabela_salarial_id: posicao.tabela_salarial_id,
                                    regime: posicao.regime,
                                    qtd_jan: posicao.qtd_jan,
                                    qtd_fev: posicao.qtd_fev,
                                    qtd_mar: posicao.qtd_mar,
                                    qtd_abr: posicao.qtd_abr,
                                    qtd_mai: posicao.qtd_mai,
                                    qtd_jun: posicao.qtd_jun,
                                    qtd_jul: posicao.qtd_jul,
                                    qtd_ago: posicao.qtd_ago,
                                    qtd_set: posicao.qtd_set,
                                    qtd_out: posicao.qtd_out,
                                    qtd_nov: posicao.qtd_nov,
                                    qtd_dez: posicao.qtd_dez,
                                    salario_override: posicao.salario_override,
                                    span: posicao.span,
                                    observacao: posicao.observacao || "",
                                    ativo: posicao.ativo,
                                  });
                                  setShowFormPosicao(true);
                                }} className="hover:bg-orange-50 hover:text-orange-600">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon-xs" variant="ghost" onClick={() => handleDeletePosicao(posicao.id)} className="hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            ) : abaAtiva === 'custos' ? (
              <div className="h-full overflow-auto p-6">
                <div className="mb-4">
                  <h2 className="section-title">Custos Calculados</h2>
                  <p className="page-subtitle">Resumo de custos do cenário</p>
                </div>
                
                {loadingCustos ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
                    </div>
                    <Skeleton className="h-32" />
                    <Skeleton className="h-48" />
                  </div>
                ) : !custos ? (
                  <div className="empty-state">
                    <AlertCircle className="empty-state-icon" />
                    <p className="empty-state-title">Não foi possível calcular os custos</p>
                    <p className="empty-state-description">Verifique se há posições no quadro de pessoal</p>
                    <Button size="sm" variant="outline" onClick={carregarCustos} className="mt-4">
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Cards de resumo */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <p className="filter-label text-blue-600">Headcount Médio</p>
                          <p className="text-3xl font-bold text-blue-700 mt-1">{custos.total_headcount_medio.toFixed(0)}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <p className="filter-label text-green-600">Custo Mensal Médio</p>
                          <p className="text-2xl font-bold text-green-700 mt-1 font-mono">
                            {custos.custo_mensal_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          <p className="filter-label text-amber-600">Custo Total Anual</p>
                          <p className="text-2xl font-bold text-amber-700 mt-1 font-mono">
                            {custos.custo_total_anual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4">
                          <p className="filter-label text-purple-600">Funções</p>
                          <p className="text-3xl font-bold text-purple-700 mt-1">{Object.keys(custos.custos_por_funcao).length}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Custos por mês */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Custo por Mês</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((mes) => (
                                <TableHead key={mes} className="text-center">{mes}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map((mes) => (
                                <TableCell key={mes} className="text-center font-mono text-xs">
                                  {(custos.custos_por_mes[mes] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Custos por função */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Custo por Função</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Função</TableHead>
                              <TableHead className="text-right">Custo Anual</TableHead>
                              <TableHead className="w-48">Participação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(custos.custos_por_funcao)
                              .sort(([,a], [,b]) => b - a)
                              .map(([funcao, valor]) => {
                                const percentual = (valor / custos.custo_total_anual) * 100;
                                return (
                                  <TableRow key={funcao}>
                                    <TableCell className="font-medium">{funcao}</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-muted rounded-full h-2">
                                          <div 
                                            className="bg-orange-500 h-2 rounded-full" 
                                            style={{ width: `${percentual}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-12 text-right">
                                          {percentual.toFixed(1)}%
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal Cenário */}
      {showFormCenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editandoCenario ? "Editar Cenário" : "Novo Cenário"}</CardTitle>
              <CardDescription>
                {editandoCenario ? "Atualize as informações do cenário" : "Preencha os dados do novo cenário"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitCenario} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="filter-label">Código *</label>
                    <Input
                      value={formCenario.codigo}
                      onChange={(e) => setFormCenario({ ...formCenario, codigo: e.target.value.toUpperCase() })}
                      placeholder="ORC_2025_V1"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="filter-label">Ano *</label>
                    <Input
                      type="number"
                      value={formCenario.ano}
                      onChange={(e) => setFormCenario({ ...formCenario, ano: parseInt(e.target.value) || 2025 })}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="filter-label">Nome *</label>
                  <Input
                    value={formCenario.nome}
                    onChange={(e) => setFormCenario({ ...formCenario, nome: e.target.value })}
                    placeholder="Orçamento 2025 - Conservador"
                    className="h-8 text-sm"
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="filter-label">Empresa</label>
                  <select
                    value={formCenario.empresa_id || ""}
                    onChange={(e) => setFormCenario({ ...formCenario, empresa_id: e.target.value || null })}
                    className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                  >
                    <option value="">Selecione...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome_fantasia || emp.razao_social}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="filter-label">Mês Início</label>
                    <select
                      value={formCenario.mes_inicio}
                      onChange={(e) => setFormCenario({ ...formCenario, mes_inicio: parseInt(e.target.value) })}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="filter-label">Mês Fim</label>
                    <select
                      value={formCenario.mes_fim}
                      onChange={(e) => setFormCenario({ ...formCenario, mes_fim: parseInt(e.target.value) })}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label className="filter-label">Status</label>
                  <select
                    value={formCenario.status}
                    onChange={(e) => setFormCenario({ ...formCenario, status: e.target.value as 'RASCUNHO' | 'APROVADO' | 'BLOQUEADO' })}
                    className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                  >
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowFormCenario(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="success" size="sm">
                    {editandoCenario ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Posição */}
      {showFormPosicao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>{editandoPosicao ? "Editar Posição" : "Nova Posição"}</CardTitle>
              <CardDescription>
                {editandoPosicao ? "Atualize os dados da posição" : "Adicione uma nova posição ao quadro"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPosicao} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="filter-label">Função *</label>
                    <select
                      value={formPosicao.funcao_id}
                      onChange={(e) => setFormPosicao({ ...formPosicao, funcao_id: e.target.value })}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                      required
                    >
                      <option value="">Selecione...</option>
                      {funcoes.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="filter-label">Regime</label>
                    <select
                      value={formPosicao.regime}
                      onChange={(e) => setFormPosicao({ ...formPosicao, regime: e.target.value as 'CLT' | 'PJ' })}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                    >
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="filter-label">Seção</label>
                    <select
                      value={formPosicao.secao_id || ""}
                      onChange={(e) => setFormPosicao({ ...formPosicao, secao_id: e.target.value || null })}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                    >
                      <option value="">Selecione...</option>
                      {secoes.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="filter-label">Centro de Custo</label>
                    <select
                      value={formPosicao.centro_custo_id || ""}
                      onChange={(e) => setFormPosicao({ ...formPosicao, centro_custo_id: e.target.value || null })}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                    >
                      <option value="">Selecione...</option>
                      {centrosCusto.map((cc) => (
                        <option key={cc.id} value={cc.id}>{cc.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Quantidades mensais */}
                <div>
                  <label className="filter-label mb-2 block">Quantidade por Mês</label>
                  <div className="grid grid-cols-6 gap-2">
                    {['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((mes) => (
                      <div key={mes}>
                        <label className="text-[10px] text-muted-foreground uppercase block text-center">{mes}</label>
                        <Input
                          type="number"
                          min="0"
                          value={(formPosicao as any)[`qtd_${mes}`]}
                          onChange={(e) => setFormPosicao({ ...formPosicao, [`qtd_${mes}`]: parseInt(e.target.value) || 0 })}
                          className="text-center h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowFormPosicao(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="success" size="sm">
                    {editandoPosicao ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
