import {
  LayoutDashboard,
  FileText,
  BarChart3,
  TrendingUp,
  DollarSign,
  Settings,
  Target,
  Calendar,
  CheckSquare,
  LineChart,
  Headphones,
  Phone,
  Clock,
  Users,
  UserPlus,
  UserMinus,
  Briefcase,
  Award,
  Scale,
  FileWarning,
  Gavel,
  AlertTriangle,
  Shield,
  UserCog,
  Database,
  Wallet,
  ClipboardList,
  GitCompare,
  FileSpreadsheet,
  Building2,
  Layers,
  CircleDollarSign,
  CalendarDays,
  Receipt,
  BookOpen,
  Truck,
  Server,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  submenu?: MenuItem[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export type ModuleMenus = Record<string, MenuSection[]>;

export const moduleMenus: ModuleMenus = {
  controladoria: [
    {
      title: "Menu Principal",
      items: [
        { name: "Dashboard", href: "/controladoria", icon: LayoutDashboard },
        { 
          name: "Relatórios", 
          href: "/controladoria/relatorios", 
          icon: FileText,
          submenu: [
            { name: "DRE", href: "/controladoria/dre", icon: FileText },
            { name: "Fluxo de Caixa", href: "/controladoria/fluxo-caixa", icon: DollarSign },
            { name: "Balancete", href: "/controladoria/balancete", icon: FileSpreadsheet },
            { name: "Receitas", href: "/controladoria/receitas", icon: TrendingUp },
            { name: "Despesas", href: "/controladoria/despesas", icon: TrendingUp },
          ],
        },
        { 
          name: "Orçamento", 
          href: "/controladoria/orcamento", 
          icon: Wallet,
          submenu: [
            { name: "Visão Geral", href: "/controladoria/orcamento", icon: Wallet },
            { name: "Cenários", href: "/controladoria/orcamento/cenarios", icon: GitCompare },
            { name: "Empresas", href: "/controladoria/orcamento/empresas", icon: Building2 },
            { name: "Cargos e Salários", href: "/controladoria/orcamento/cargos-salarios", icon: Briefcase },
          ],
        },
        { 
          name: "Cadastros", 
          href: "/controladoria/cadastros", 
          icon: ClipboardList,
          submenu: [
            { name: "Departamentos", href: "/controladoria/orcamento/cadastros/departamentos", icon: Building2 },
            { name: "Seções", href: "/controladoria/orcamento/cadastros/secoes", icon: Layers },
            { name: "Centros de Custo", href: "/controladoria/orcamento/cadastros/centros-custo", icon: CircleDollarSign },
            { name: "Feriados", href: "/controladoria/orcamento/cadastros/feriados", icon: CalendarDays },
            { name: "Eventos de Folha", href: "/controladoria/orcamento/cadastros/rubricas", icon: Receipt },
            { name: "Contas Contábeis", href: "/controladoria/orcamento/cadastros/contas-contabeis", icon: BookOpen },
            { name: "Fornecedores", href: "/controladoria/orcamento/cadastros/fornecedores", icon: Truck },
            { name: "Itens de Custo", href: "/controladoria/orcamento/cadastros/itens-custo", icon: Server },
          ],
        },
        { name: "Indicadores", href: "/controladoria/indicadores", icon: BarChart3 },
        { name: "Configurações", href: "/controladoria/configuracoes", icon: Settings },
      ],
    },
  ],

  planejamento: [
    {
      title: "Geral",
      items: [
        { name: "Dashboard", href: "/planejamento", icon: LayoutDashboard },
        { name: "Metas", href: "/planejamento/metas", icon: Target },
      ],
    },
    {
      title: "Planejamento",
      items: [
        { name: "Cronograma", href: "/planejamento/cronograma", icon: Calendar },
        { name: "Projetos", href: "/planejamento/projetos", icon: CheckSquare },
        { name: "Orçamento", href: "/planejamento/orcamento", icon: DollarSign },
      ],
    },
    {
      title: "Análise",
      items: [
        { name: "Projeções", href: "/planejamento/projecoes", icon: LineChart },
        { name: "Relatórios", href: "/planejamento/relatorios", icon: FileText },
      ],
    },
  ],

  operacoes: [
    {
      title: "Geral",
      items: [
        { name: "Dashboard", href: "/operacoes", icon: LayoutDashboard },
        { name: "Tempo Real", href: "/operacoes/tempo-real", icon: Headphones },
      ],
    },
    {
      title: "Métricas",
      items: [
        { name: "Chamadas", href: "/operacoes/chamadas", icon: Phone },
        { name: "TMA / TME", href: "/operacoes/tempos", icon: Clock },
        { name: "Produtividade", href: "/operacoes/produtividade", icon: BarChart3 },
      ],
    },
    {
      title: "Equipe",
      items: [
        { name: "Atendentes", href: "/operacoes/atendentes", icon: Users },
        { name: "Escalas", href: "/operacoes/escalas", icon: Calendar },
      ],
    },
    {
      title: "Relatórios",
      items: [
        { name: "Relatórios", href: "/operacoes/relatorios", icon: FileText },
      ],
    },
  ],

  rh: [
    {
      title: "Geral",
      items: [
        { name: "Dashboard", href: "/rh", icon: LayoutDashboard },
        { name: "Colaboradores", href: "/rh/colaboradores", icon: Users },
      ],
    },
    {
      title: "Movimentações",
      items: [
        { name: "Admissões", href: "/rh/admissoes", icon: UserPlus },
        { name: "Desligamentos", href: "/rh/desligamentos", icon: UserMinus },
        { name: "Férias", href: "/rh/ferias", icon: Calendar },
      ],
    },
    {
      title: "Gestão",
      items: [
        { name: "Cargos", href: "/rh/cargos", icon: Briefcase },
        { name: "Avaliações", href: "/rh/avaliacoes", icon: Award },
        { name: "Treinamentos", href: "/rh/treinamentos", icon: Target },
      ],
    },
    {
      title: "Relatórios",
      items: [
        { name: "Relatórios", href: "/rh/relatorios", icon: FileText },
      ],
    },
  ],

  juridico: [
    {
      title: "Geral",
      items: [
        { name: "Dashboard", href: "/juridico", icon: LayoutDashboard },
        { name: "Processos", href: "/juridico/processos", icon: Scale },
      ],
    },
    {
      title: "Gestão",
      items: [
        { name: "Trabalhistas", href: "/juridico/trabalhistas", icon: Gavel },
        { name: "Reclamações", href: "/juridico/reclamacoes", icon: FileWarning },
        { name: "Alto Risco", href: "/juridico/alto-risco", icon: AlertTriangle },
      ],
    },
    {
      title: "Relatórios",
      items: [
        { name: "Relatórios", href: "/juridico/relatorios", icon: FileText },
        { name: "Provisões", href: "/juridico/provisoes", icon: DollarSign },
      ],
    },
  ],

  admin: [
    {
      title: "Gestão",
      items: [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Usuários", href: "/admin/users", icon: Users },
        { name: "Perfis", href: "/admin/roles", icon: Shield },
      ],
    },
    {
      title: "Sistema",
      items: [
        { name: "Integrações", href: "/admin/integrations", icon: Database },
        { name: "Configurações", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
};

export function getModuleMenus(moduleCode: string): MenuSection[] {
  return moduleMenus[moduleCode] || [];
}

