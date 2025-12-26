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
  Calendar,
  Loader2,
  FileX,
  User,
  Server
} from "lucide-react";
import { MasterDetailTree } from "@/components/orcamento/MasterDetailTree";
import { CapacityPlanningPanel } from "@/components/orcamento/CapacityPlanningPanel";
import { PremissasFuncaoMesGrid } from "@/components/orcamento/PremissasFuncaoMesGrid";
import { PremissasTree, type SelectedNodePremissas } from "@/components/orcamento/PremissasTree";
import { PremissasFuncaoGridPanel } from "@/components/orcamento/PremissasFuncaoGridPanel";
import { DREPanel } from "@/components/orcamento/DREPanel";
import TecnologiaPanel from "@/components/orcamento/TecnologiaPanel";
import type { CenarioEmpresa, CenarioCliente, CenarioSecao } from "@/lib/api/orcamento";
import { useAuthStore } from "@/stores/auth-store";
import { 
  cenariosApi, 
  empresasApi,
  funcoesApi,
  secoesApi,
  centrosCustoApi,
  tabelaSalarialApi,
  type Cenario,
  type QuadroPessoal,
  type Empresa,
  type Funcao,
  type Secao,
  type CentroCusto,
  type TabelaSalarial,
} from "@/lib/api/orcamento";

export default function CenariosPage() {
  const { accessToken: token } = useAuthStore();
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [cenarioSelecionado, setCenarioSelecionado] = useState<Cenario | null>(null);
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
  const [abaAtiva, setAbaAtiva] = useState<'estrutura' | 'premissas-funcao' | 'premissas' | 'quadro' | 'tecnologia' | 'dre'>('estrutura');
  
  // Estado para seleção na árvore Master-Detail
  const [selectedNode, setSelectedNode] = useState<{
    type: 'empresa' | 'cliente' | 'secao' | 'centro_custo';
    empresa: CenarioEmpresa;
    cliente?: CenarioCliente;
    secao?: CenarioSecao;
    centroCusto?: CentroCusto;
  } | null>(null);
  
  // Estado para seleção na árvore de Premissas (inclui funções)
  const [selectedNodePremissas, setSelectedNodePremissas] = useState<SelectedNodePremissas | null>(null);
  
  // Estado para todas as seções do cenário (para rateio)
  const [todasSecoescentario, setTodasSecoesCenario] = useState<CenarioSecao[]>([]);
  
  // Modal Cenário
  const [showFormCenario, setShowFormCenario] = useState(false);
  const [editandoCenario, setEditandoCenario] = useState<Cenario | null>(null);
  const [formCenario, setFormCenario] = useState({
    nome: "",
    descricao: "",
    cliente_nw_codigo: null as string | null,
    empresa_ids: [] as string[],
    ano_inicio: new Date().getFullYear() + 1,
    mes_inicio: 1,
    ano_fim: new Date().getFullYear() + 1,
    mes_fim: 12,
    ativo: true,
  });
  
  // Estados locais para campos de data (digitação livre)
  const [dataInicioTexto, setDataInicioTexto] = useState("");
  const [dataFimTexto, setDataFimTexto] = useState("");
  
  // Modal Posição
  const [showFormPosicao, setShowFormPosicao] = useState(false);
  const [editandoPosicao, setEditandoPosicao] = useState<QuadroPessoal | null>(null);
  const [formPosicao, setFormPosicao] = useState({
    funcao_id: "",
    secao_id: "" as string | null,
    centro_custo_id: "" as string | null,
    tabela_salarial_id: "" as string | null,
    cenario_secao_id: null as string | null,
    regime: "CLT" as 'CLT' | 'PJ',
    qtd_jan: 0, qtd_fev: 0, qtd_mar: 0, qtd_abr: 0,
    qtd_mai: 0, qtd_jun: 0, qtd_jul: 0, qtd_ago: 0,
    qtd_set: 0, qtd_out: 0, qtd_nov: 0, qtd_dez: 0,
    salario_override: null as number | null,
    span: null as number | null,
    fator_pa: 1,
    tipo_calculo: "manual" as 'manual' | 'span' | 'rateio',
    span_ratio: null as number | null,
    span_funcoes_base_ids: null as string[] | null,
    rateio_grupo_id: null as string | null,
    rateio_percentual: null as number | null,
    rateio_qtd_total: null as number | null,
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
        empresasApi.listar(token, { ativo: true }),
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
      
      // Debug: verificar empresas carregadas
      if (empresasData.length === 0) {
        console.warn("Nenhuma empresa encontrada. Verifique se há empresas cadastradas e ativas.");
      } else {
        console.log(`${empresasData.length} empresa(s) carregada(s)`);
      }
      
      // Não seleciona automaticamente - usuário deve clicar em "Editar" para ver detalhes
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      if (error.message) {
        console.error("Detalhes do erro:", error.message);
      }
      // Log específico para empresas
      if (error.response?.data) {
        console.error("Resposta da API:", error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhes = async (cenarioId: string) => {
    if (!token) return;
    setLoadingDetalhes(true);
    try {
      const quadroData = await cenariosApi.getQuadro(token, cenarioId);
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
    
    // Validar período
    const inicio = new Date(formCenario.ano_inicio, formCenario.mes_inicio - 1);
    const fim = new Date(formCenario.ano_fim, formCenario.mes_fim - 1);
    if (fim < inicio) {
      alert("A data final deve ser posterior à data inicial");
      return;
    }
    
    try {
      if (editandoCenario) {
        await cenariosApi.atualizar(token, editandoCenario.id, {
          nome: formCenario.nome,
          descricao: formCenario.descricao,
          ano_inicio: formCenario.ano_inicio,
          mes_inicio: formCenario.mes_inicio,
          ano_fim: formCenario.ano_fim,
          mes_fim: formCenario.mes_fim,
        });
      } else {
        await cenariosApi.criar(token, {
          nome: formCenario.nome,
          descricao: formCenario.descricao,
          ano_inicio: formCenario.ano_inicio,
          mes_inicio: formCenario.mes_inicio,
          ano_fim: formCenario.ano_fim,
          mes_fim: formCenario.mes_fim,
          empresa_ids: [], // Empresas serão configuradas na aba Configuração
          ativo: formCenario.ativo,
          cliente_nw_codigo: formCenario.cliente_nw_codigo,
        });
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

  const handleEditarCenario = (cenario: Cenario) => {
    setCenarioSelecionado(cenario);
  };

  // Se um cenário está selecionado, mostrar tela de parametrização
  if (cenarioSelecionado) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Header com botão voltar */}
        <div className="shrink-0 pb-4 border-b mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setCenarioSelecionado(null)}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
                Voltar
              </Button>
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <GitCompare className="h-6 w-6" />
                  {cenarioSelecionado.nome}
                </h1>
                <p className="page-subtitle">
                  {cenarioSelecionado.codigo} • {cenarioSelecionado.mes_inicio.toString().padStart(2, '0')}/{cenarioSelecionado.ano_inicio} - {cenarioSelecionado.mes_fim.toString().padStart(2, '0')}/{cenarioSelecionado.ano_fim}
                  {cenarioSelecionado.cliente_nw_codigo && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      Cliente: {cenarioSelecionado.cliente_nw_codigo}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusBadge(cenarioSelecionado.status)}
              <Button size="sm" variant="outline" onClick={() => handleDuplicarCenario(cenarioSelecionado)}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicar
              </Button>
            </div>
          </div>
        </div>

        {/* Área principal com abas */}
        {loadingDetalhes ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Abas */}
          <div className="shrink-0 flex gap-1 border-b bg-muted/30 rounded-t-lg px-2 overflow-x-auto">
            <button
              onClick={() => setAbaAtiva('estrutura')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                abaAtiva === 'estrutura'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              Capacity
            </button>
            <button
              onClick={() => setAbaAtiva('premissas')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                abaAtiva === 'premissas'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="h-4 w-4" />
              Premissas
            </button>
            <button
              onClick={() => setAbaAtiva('quadro')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                abaAtiva === 'quadro'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Quadro
              <Badge variant="secondary" className="text-[10px] ml-1">{quadro.length}</Badge>
            </button>
            <button
              onClick={() => setAbaAtiva('tecnologia')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                abaAtiva === 'tecnologia'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Server className="h-4 w-4" />
              Tecnologia
            </button>
            <button
              onClick={() => setAbaAtiva('dre')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                abaAtiva === 'dre'
                  ? "border-orange-500 text-orange-600 bg-background rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="h-4 w-4" />
              DRE
            </button>
          </div>

          {/* Conteúdo da Aba - ocupa todo o espaço disponível */}
          <div className="flex-1 overflow-hidden bg-background border border-t-0 rounded-b-lg">
            {loadingDetalhes ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : abaAtiva === 'estrutura' ? (
              /* Layout Master-Detail: Árvore à esquerda, Painel de detalhes à direita */
              <div className="h-full flex">
                {/* Painel Esquerdo: Árvore de Navegação */}
                <div className="w-80 border-r bg-muted/10 flex-shrink-0">
                  <MasterDetailTree
                    cenarioId={cenarioSelecionado.id}
                    onNodeSelect={setSelectedNode}
                    onSecoesLoaded={setTodasSecoesCenario}
                    selectedSecaoId={selectedNode?.secao?.id}
                    selectedCCId={selectedNode?.centroCusto?.id}
                  />
                </div>
                
                {/* Painel Direito: Detalhes / Capacity Planning */}
                <div className="flex-1 overflow-auto">
                  {(selectedNode?.type === 'centro_custo' || selectedNode?.type === 'secao') && selectedNode.secao ? (
                    <CapacityPlanningPanel
                      cenarioId={cenarioSelecionado.id}
                      empresa={selectedNode.empresa}
                      secao={selectedNode.secao}
                      todasSecoes={todasSecoescentario}
                      centroCusto={selectedNode.centroCusto}
                      anoInicio={cenarioSelecionado.ano_inicio}
                      mesInicio={cenarioSelecionado.mes_inicio}
                      anoFim={cenarioSelecionado.ano_fim}
                      mesFim={cenarioSelecionado.mes_fim}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Settings className="h-12 w-12 mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Selecione um Centro de Custo</h3>
                      <p className="text-sm max-w-md text-center">
                        Expanda uma seção na árvore à esquerda e clique em um Centro de Custo para configurar o quadro de pessoal
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : abaAtiva === 'premissas-funcao' ? (
              <PremissasFuncaoMesGrid
                cenarioId={cenarioSelecionado.id}
                funcoes={funcoes.filter(f => quadro.some(q => q.funcao_id === f.id && q.ativo))}
                anoInicio={cenarioSelecionado.ano_inicio}
                mesInicio={cenarioSelecionado.mes_inicio}
                anoFim={cenarioSelecionado.ano_fim}
                mesFim={cenarioSelecionado.mes_fim}
              />
            ) : abaAtiva === 'premissas' ? (
              <div className="h-full flex">
                {/* Painel Esquerdo: Árvore de navegação com Funções */}
                <div className="w-72 border-r bg-muted/5 flex flex-col">
                  <div className="p-3 border-b bg-muted/10">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estrutura / Funções</h3>
                  </div>
                  <PremissasTree
                    cenarioId={cenarioSelecionado.id}
                    onNodeSelect={setSelectedNodePremissas}
                  />
                </div>
                
                {/* Painel Direito: Editor de Premissas por Função */}
                <div className="flex-1 overflow-auto">
                  {selectedNodePremissas?.type === 'funcao' && selectedNodePremissas.funcao && selectedNodePremissas.quadroItem ? (
                    <PremissasFuncaoGridPanel
                      cenarioId={cenarioSelecionado.id}
                      empresa={selectedNodePremissas.empresa}
                      secao={selectedNodePremissas.secao!}
                      centroCusto={selectedNodePremissas.centroCusto}
                      funcao={selectedNodePremissas.funcao}
                      quadroItem={selectedNodePremissas.quadroItem}
                      anoInicio={cenarioSelecionado.ano_inicio}
                      mesInicio={cenarioSelecionado.mes_inicio}
                      anoFim={cenarioSelecionado.ano_fim}
                      mesFim={cenarioSelecionado.mes_fim}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <User className="h-12 w-12 mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Selecione uma função</h3>
                      <p className="text-sm max-w-md text-center">
                        Navegue pela estrutura à esquerda, expanda uma seção e clique em uma <strong>função</strong> para configurar as premissas por mês
                      </p>
                    </div>
                  )}
                </div>
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
                      cenario_secao_id: null,
                      regime: "CLT",
                      qtd_jan: 0, qtd_fev: 0, qtd_mar: 0, qtd_abr: 0,
                      qtd_mai: 0, qtd_jun: 0, qtd_jul: 0, qtd_ago: 0,
                      qtd_set: 0, qtd_out: 0, qtd_nov: 0, qtd_dez: 0,
                      salario_override: null,
                      span: null,
                      fator_pa: 1,
                      tipo_calculo: "manual",
                      span_ratio: null,
                      span_funcoes_base_ids: null,
                      rateio_grupo_id: null,
                      rateio_percentual: null,
                      rateio_qtd_total: null,
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
                                    cenario_secao_id: posicao.cenario_secao_id,
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
                                    fator_pa: posicao.fator_pa,
                                    tipo_calculo: posicao.tipo_calculo,
                                    span_ratio: posicao.span_ratio,
                                    span_funcoes_base_ids: posicao.span_funcoes_base_ids,
                                    rateio_grupo_id: posicao.rateio_grupo_id,
                                    rateio_percentual: posicao.rateio_percentual,
                                    rateio_qtd_total: posicao.rateio_qtd_total,
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
            ) : abaAtiva === 'tecnologia' ? (
              /* Layout Master-Detail para Tecnologia: Árvore à esquerda, Painel à direita */
              <div className="h-full flex">
                {/* Painel Esquerdo: Árvore de Navegação */}
                <div className="w-80 border-r bg-muted/10 flex-shrink-0">
                  <MasterDetailTree
                    cenarioId={cenarioSelecionado.id}
                    onNodeSelect={setSelectedNode}
                    onSecoesLoaded={setTodasSecoesCenario}
                    selectedSecaoId={selectedNode?.secao?.id}
                  />
                </div>
                
                {/* Painel Direito: Alocações de Tecnologia */}
                <div className="flex-1 overflow-auto">
                  {selectedNode?.type === 'secao' && selectedNode.secao ? (
                    <TecnologiaPanel
                      cenarioId={cenarioSelecionado.id}
                      secaoId={selectedNode.secao.id}
                      secaoNome={selectedNode.secao.secao?.nome || 'Seção'}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Server className="h-12 w-12 mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Selecione uma seção</h3>
                      <p className="text-sm max-w-md text-center">
                        Navegue pela estrutura à esquerda e clique em uma seção para gerenciar alocações de tecnologia
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : abaAtiva === 'dre' ? (
              <div className="h-full overflow-auto">
                <DREPanel
                  cenarioId={cenarioSelecionado.id}
                  anoInicio={cenarioSelecionado.ano_inicio}
                  anoFim={cenarioSelecionado.ano_fim}
                />
              </div>
            ) : null}
          </div>
        </div>
        )}
      </div>
    );
  }

  // Tela de listagem de cenários (quando nenhum está selecionado)
  return (
    <div className="page-container">
      {/* Header da página */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title flex items-center gap-2">
              <GitCompare className="h-6 w-6" />
              Cenários de Orçamento
            </h1>
            <Badge variant="info" className="text-[10px]">
              {cenarios.length} cenários
            </Badge>
          </div>
          <p className="page-subtitle">
            Gerencie cenários orçamentários e configure premissas, funções e custos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="success" 
            size="sm"
            onClick={() => {
              setEditandoCenario(null);
              const nextYear = new Date().getFullYear() + 1;
              setFormCenario({
                nome: "",
                descricao: "",
                cliente_nw_codigo: null,
                empresa_ids: [],
                ano_inicio: nextYear,
                mes_inicio: 1,
                ano_fim: nextYear,
                mes_fim: 12,
                ativo: true,
              });
              setDataInicioTexto(`01/${nextYear}`);
              setDataFimTexto(`12/${nextYear}`);
              setShowFormCenario(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cenário
          </Button>
        </div>
      </div>

      {/* Tabela de Cenários */}
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cenarios.length === 0 ? (
          <div className="empty-state my-8">
            <FileX className="empty-state-icon" />
            <p className="empty-state-title">Nenhum cenário cadastrado</p>
            <p className="empty-state-description">
              Clique em &quot;Novo Cenário&quot; para criar seu primeiro cenário de orçamento.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Cenário</TableHead>
                <TableHead className="w-32">Código</TableHead>
                <TableHead className="w-40">Período</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28">Cliente</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cenarios.map((cenario) => (
                <TableRow key={cenario.id}>
                  <TableCell className="font-medium">{cenario.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{cenario.codigo}</TableCell>
                  <TableCell className="text-sm">
                    {cenario.mes_inicio.toString().padStart(2, '0')}/{cenario.ano_inicio} - {cenario.mes_fim.toString().padStart(2, '0')}/{cenario.ano_fim}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cenario.descricao || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {cenario.cliente_nw_codigo ? (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {cenario.cliente_nw_codigo}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(cenario.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditarCenario(cenario)}
                        className="h-7 text-xs hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-xs" 
                        onClick={() => handleDuplicarCenario(cenario)}
                        className="hover:bg-blue-50 hover:text-blue-600"
                        title="Duplicar cenário"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-xs" 
                        onClick={() => handleDeleteCenario(cenario.id)}
                        className="hover:bg-red-50 hover:text-red-600"
                        title="Excluir cenário"
                      >
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
                <div className="form-field">
                  <label className="filter-label">Nome do Cenário *</label>
                  <Input
                    value={formCenario.nome}
                    onChange={(e) => setFormCenario({ ...formCenario, nome: e.target.value })}
                    placeholder="Orçamento 2026 - Conservador"
                    className="h-8 text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O código será gerado automaticamente
                  </p>
                </div>
                
                <div className="form-field">
                  <label className="filter-label">Descrição</label>
                  <Input
                    value={formCenario.descricao}
                    onChange={(e) => setFormCenario({ ...formCenario, descricao: e.target.value })}
                    placeholder="Descrição opcional do cenário"
                    className="h-8 text-sm"
                  />
                </div>


                <div className="border-t pt-4">
                  <label className="filter-label mb-3 block">Período do Cenário *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-field">
                      <label className="filter-label text-[10px]">Data Início (MM/AAAA)</label>
                      <Input
                        type="text"
                        value={dataInicioTexto}
                        onChange={(e) => {
                          let valor = e.target.value.replace(/\D/g, ''); // só números
                          if (valor.length > 6) valor = valor.slice(0, 6);
                          // Insere / após 2 dígitos
                          if (valor.length > 2) {
                            valor = valor.slice(0, 2) + '/' + valor.slice(2);
                          }
                          setDataInicioTexto(valor);
                          // Atualiza formCenario se formato completo
                          if (valor.length === 7) {
                            const mes = parseInt(valor.slice(0, 2));
                            const ano = parseInt(valor.slice(3));
                            if (mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2100) {
                              setFormCenario({ ...formCenario, mes_inicio: mes, ano_inicio: ano });
                            }
                          }
                        }}
                        placeholder="01/2026"
                        className="h-8 text-sm font-mono"
                        maxLength={7}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label className="filter-label text-[10px]">Data Fim (MM/AAAA)</label>
                      <Input
                        type="text"
                        value={dataFimTexto}
                        onChange={(e) => {
                          let valor = e.target.value.replace(/\D/g, ''); // só números
                          if (valor.length > 6) valor = valor.slice(0, 6);
                          // Insere / após 2 dígitos
                          if (valor.length > 2) {
                            valor = valor.slice(0, 2) + '/' + valor.slice(2);
                          }
                          setDataFimTexto(valor);
                          // Atualiza formCenario se formato completo
                          if (valor.length === 7) {
                            const mes = parseInt(valor.slice(0, 2));
                            const ano = parseInt(valor.slice(3));
                            if (mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2100) {
                              setFormCenario({ ...formCenario, mes_fim: mes, ano_fim: ano });
                            }
                          }
                        }}
                        placeholder="12/2026"
                        className="h-8 text-sm font-mono"
                        maxLength={7}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exemplo: 01/2026 a 12/2027 (24 meses)
                  </p>
                </div>
                
                {editandoCenario && (
                  <div className="form-field">
                    <label className="filter-label">Status</label>
                    <select
                      value={editandoCenario.status}
                      onChange={async (e) => {
                        if (!token) return;
                        try {
                          await cenariosApi.atualizar(token, editandoCenario.id, {
                            status: e.target.value as 'RASCUNHO' | 'APROVADO' | 'BLOQUEADO'
                          });
                          carregarDados();
                        } catch (error: any) {
                          alert(error.message || "Erro ao atualizar status");
                        }
                      }}
                      className="w-full h-8 px-3 border rounded-md text-sm bg-background"
                    >
                      <option value="RASCUNHO">Rascunho</option>
                      <option value="APROVADO">Aprovado</option>
                      <option value="BLOQUEADO">Bloqueado</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cenários novos sempre iniciam como Rascunho
                    </p>
                  </div>
                )}
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
