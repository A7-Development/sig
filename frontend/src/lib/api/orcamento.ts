/**
 * API Client para o módulo de Orçamento
 */

import { api } from './client';

// ============================================
// Types
// ============================================

export interface Departamento {
  id: string;
  codigo: string;
  codigo_totvs: string | null;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Secao {
  id: string;
  departamento_id: string;
  codigo: string;
  codigo_totvs: string | null;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  departamento?: Departamento;
}

export interface CentroCusto {
  id: string;
  codigo: string;
  codigo_totvs: string | null;
  nome: string;
  tipo: 'OPERACIONAL' | 'ADMINISTRATIVO' | 'OVERHEAD' | 'POOL';
  cliente: string | null;
  contrato: string | null;
  uf: string | null;
  cidade: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Feriado {
  id: string;
  data: string;
  nome: string;
  tipo: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL';
  uf: string | null;
  cidade: string | null;
  recorrente: boolean;
  created_at: string;
}

export interface Funcao {
  id: string;
  codigo: string;
  codigo_totvs: string | null;
  nome: string;
  cbo: string | null;
  jornada_mensal: number;
  is_home_office: boolean;
  is_pj: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id: string;
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Encargo {
  id: string;
  empresa_id: string;
  regime: 'CLT' | 'PJ';
  codigo: string;
  nome: string;
  categoria: 'ENCARGO' | 'PROVISAO' | 'IMPOSTO';
  aliquota: number;
  base_calculo: 'SALARIO' | 'TOTAL' | 'PROVISAO';
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoliticaBeneficio {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  regime: 'CLT' | 'PJ';
  escala: '5x2' | '6x1' | '12x36';
  jornada_mensal: number;
  vt_dia: number;
  vt_desconto_6pct: boolean;
  vr_dia: number;
  va_dia: number;
  plano_saude: number;
  plano_dental: number;
  seguro_vida: number;
  aux_creche: number;
  aux_creche_percentual: number;
  aux_home_office: number;
  dias_treinamento: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaixaSalarial {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface TabelaSalarial {
  id: string;
  funcao_id: string;
  faixa_id: string | null;
  politica_id: string | null;
  regime: 'CLT' | 'PJ';
  salario_base: number;
  override_vt_dia: number | null;
  override_vr_dia: number | null;
  override_plano_saude: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  funcao?: Funcao;
  faixa?: FaixaSalarial;
  politica?: PoliticaBeneficio;
}

export interface ImportacaoResultado {
  importados: number;
  ignorados: number;
  erros: string[];
}

// TOTVS Types
export interface FuncaoTotvs {
  codigo: string;
  nome: string;
  cbo: string | null;
}

export interface DepartamentoTotvs {
  codigo: string;
  nome: string;
}

export interface SecaoTotvs {
  codigo: string;
  descricao: string;
  codigo_depto: string | null;
}

export interface CentroCustoTotvs {
  codigo: string;
  nome: string | null;
}

// ============================================
// TOTVS - Consultas (Somente Leitura)
// ============================================

export const totvsApi = {
  getFuncoes: (token: string, busca?: string) => 
    api.get<FuncaoTotvs[]>(`/api/v1/orcamento/totvs/funcoes${busca ? `?busca=${busca}` : ''}`, token),
  
  getDepartamentos: (token: string, busca?: string) =>
    api.get<DepartamentoTotvs[]>(`/api/v1/orcamento/totvs/departamentos${busca ? `?busca=${busca}` : ''}`, token),
  
  getSecoes: (token: string, busca?: string) =>
    api.get<SecaoTotvs[]>(`/api/v1/orcamento/totvs/secoes${busca ? `?busca=${busca}` : ''}`, token),
  
  getCentrosCusto: (token: string, busca?: string) =>
    api.get<CentroCustoTotvs[]>(`/api/v1/orcamento/totvs/centros-custo${busca ? `?busca=${busca}` : ''}`, token),
};

// NW Types
export interface EmpresaNW {
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
}

export interface ClienteNW {
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
}

export const nwApi = {
  getEmpresas: (token: string, busca?: string) =>
    api.get<EmpresaNW[]>(`/api/v1/orcamento/nw/empresas${busca ? `?busca=${busca}` : ''}`, token),
  
  importarEmpresas: (token: string, codigos: string[]) =>
    api.post<ImportacaoResultado>('/api/v1/orcamento/nw/empresas/importar', { codigos }, token),
  
  getClientes: (token: string, busca?: string, apenas_ativos: boolean = true) => {
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    params.set('apenas_ativos', String(apenas_ativos));
    return api.get<ClienteNW[]>(`/api/v1/orcamento/nw/clientes?${params.toString()}`, token);
  },
  
  getCliente: (token: string, codigo: string) =>
    api.get<ClienteNW>(`/api/v1/orcamento/nw/clientes/${codigo}`, token),
};

// ============================================
// Departamentos
// ============================================

export const departamentosApi = {
  listar: (token: string, params?: { ativo?: boolean; busca?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    if (params?.busca) queryParams.set('busca', params.busca);
    const query = queryParams.toString();
    return api.get<Departamento[]>(`/api/v1/orcamento/departamentos${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Departamento>(`/api/v1/orcamento/departamentos/${id}`, token),
  
  criar: (token: string, data: Omit<Departamento, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Departamento>('/api/v1/orcamento/departamentos', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Departamento>) =>
    api.put<Departamento>(`/api/v1/orcamento/departamentos/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/departamentos/${id}`, token),
  
  importarTotvs: (token: string, codigos: string[]) =>
    api.post<ImportacaoResultado>('/api/v1/orcamento/departamentos/importar-totvs', { codigos }, token),
};

// ============================================
// Seções
// ============================================

export const secoesApi = {
  listar: (token: string, params?: { ativo?: boolean; busca?: string; departamento_id?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    if (params?.busca) queryParams.set('busca', params.busca);
    if (params?.departamento_id) queryParams.set('departamento_id', params.departamento_id);
    const query = queryParams.toString();
    return api.get<Secao[]>(`/api/v1/orcamento/secoes${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Secao>(`/api/v1/orcamento/secoes/${id}`, token),
  
  criar: (token: string, data: Omit<Secao, 'id' | 'created_at' | 'updated_at' | 'departamento'>) =>
    api.post<Secao>('/api/v1/orcamento/secoes', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Secao>) =>
    api.put<Secao>(`/api/v1/orcamento/secoes/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/secoes/${id}`, token),
  
  importarTotvs: (token: string, codigos: string[], departamentoId: string) =>
    api.post<ImportacaoResultado>(
      `/api/v1/orcamento/secoes/importar-totvs?departamento_id=${departamentoId}`,
      { codigos },
      token
    ),
};

// ============================================
// Centros de Custo
// ============================================

export const centrosCustoApi = {
  listar: (token: string, params?: { ativo?: boolean; busca?: string; tipo?: string; cliente?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    if (params?.busca) queryParams.set('busca', params.busca);
    if (params?.tipo) queryParams.set('tipo', params.tipo);
    if (params?.cliente) queryParams.set('cliente', params.cliente);
    const query = queryParams.toString();
    return api.get<CentroCusto[]>(`/api/v1/orcamento/centros-custo${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<CentroCusto>(`/api/v1/orcamento/centros-custo/${id}`, token),
  
  criar: (token: string, data: Omit<CentroCusto, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<CentroCusto>('/api/v1/orcamento/centros-custo', data, token),
  
  atualizar: (token: string, id: string, data: Partial<CentroCusto>) =>
    api.put<CentroCusto>(`/api/v1/orcamento/centros-custo/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/centros-custo/${id}`, token),
  
  importarTotvs: (token: string, codigos: string[], tipo: string = 'OPERACIONAL') =>
    api.post<ImportacaoResultado>(
      `/api/v1/orcamento/centros-custo/importar-totvs?tipo=${tipo}`,
      { codigos },
      token
    ),
};

// ============================================
// Feriados
// ============================================

export const feriadosApi = {
  listar: (token: string, params?: { ano?: number; mes?: number; tipo?: string; uf?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ano) queryParams.set('ano', String(params.ano));
    if (params?.mes) queryParams.set('mes', String(params.mes));
    if (params?.tipo) queryParams.set('tipo', params.tipo);
    if (params?.uf) queryParams.set('uf', params.uf);
    const query = queryParams.toString();
    return api.get<Feriado[]>(`/api/v1/orcamento/feriados${query ? `?${query}` : ''}`, token);
  },
  
  listarPorAno: (token: string, ano: number, uf?: string, cidade?: string) => {
    const queryParams = new URLSearchParams();
    if (uf) queryParams.set('uf', uf);
    if (cidade) queryParams.set('cidade', cidade);
    const query = queryParams.toString();
    return api.get<Feriado[]>(`/api/v1/orcamento/feriados/por-ano/${ano}${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Feriado>(`/api/v1/orcamento/feriados/${id}`, token),
  
  criar: (token: string, data: Omit<Feriado, 'id' | 'created_at'>) =>
    api.post<Feriado>('/api/v1/orcamento/feriados', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Feriado>) =>
    api.put<Feriado>(`/api/v1/orcamento/feriados/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/feriados/${id}`, token),
  
  gerarNacionais: (token: string, ano: number) =>
    api.post<Feriado[]>(`/api/v1/orcamento/feriados/gerar-nacionais/${ano}`, {}, token),
};

// ============================================
// Funções
// ============================================

export const funcoesApi = {
  listar: (token: string, params?: { ativo?: boolean; busca?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    if (params?.busca) queryParams.set('busca', params.busca);
    const query = queryParams.toString();
    return api.get<Funcao[]>(`/api/v1/orcamento/funcoes${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Funcao>(`/api/v1/orcamento/funcoes/${id}`, token),
  
  criar: (token: string, data: Omit<Funcao, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Funcao>('/api/v1/orcamento/funcoes', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Funcao>) =>
    api.put<Funcao>(`/api/v1/orcamento/funcoes/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/funcoes/${id}`, token),
  
  importarTotvs: (token: string, codigos: string[]) =>
    api.post<ImportacaoResultado>('/api/v1/orcamento/funcoes/importar-totvs', { codigos }, token),
};

// ============================================
// Empresas
// ============================================

export const empresasApi = {
  listar: (token: string, params?: { ativo?: boolean; busca?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    if (params?.busca) queryParams.set('busca', params.busca);
    const query = queryParams.toString();
    return api.get<Empresa[]>(`/api/v1/orcamento/empresas${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Empresa & { encargos: Encargo[] }>(`/api/v1/orcamento/empresas/${id}`, token),
  
  criar: (token: string, data: Omit<Empresa, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Empresa>('/api/v1/orcamento/empresas', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Empresa>) =>
    api.put<Empresa>(`/api/v1/orcamento/empresas/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/empresas/${id}`, token),
};

// ============================================
// Encargos
// ============================================

export const encargosApi = {
  listar: (token: string, params?: { empresa_id?: string; regime?: string; categoria?: string; ativo?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.empresa_id) queryParams.set('empresa_id', params.empresa_id);
    if (params?.regime) queryParams.set('regime', params.regime);
    if (params?.categoria) queryParams.set('categoria', params.categoria);
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    const query = queryParams.toString();
    return api.get<Encargo[]>(`/api/v1/orcamento/encargos${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Encargo>(`/api/v1/orcamento/encargos/${id}`, token),
  
  criar: (token: string, data: Omit<Encargo, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Encargo>('/api/v1/orcamento/encargos', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Encargo>) =>
    api.put<Encargo>(`/api/v1/orcamento/encargos/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/encargos/${id}`, token),
  
  gerarPadrao: (token: string, empresaId: string, regime: 'CLT' | 'PJ' = 'CLT') =>
    api.post<Encargo[]>(`/api/v1/orcamento/encargos/gerar-padrao/${empresaId}?regime=${regime}`, {}, token),
  
  copiar: (token: string, empresaOrigemId: string, empresaDestinoId: string, regime?: string) => {
    const queryParams = regime ? `?regime=${regime}` : '';
    return api.post<Encargo[]>(
      `/api/v1/orcamento/encargos/copiar/${empresaOrigemId}/${empresaDestinoId}${queryParams}`,
      {},
      token
    );
  },
};

// ============================================
// Políticas de Benefício
// ============================================

export const politicasBeneficioApi = {
  listar: (token: string, params?: { regime?: string; ativo?: boolean; busca?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.regime) queryParams.set('regime', params.regime);
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    if (params?.busca) queryParams.set('busca', params.busca);
    const query = queryParams.toString();
    return api.get<PoliticaBeneficio[]>(`/api/v1/orcamento/politicas-beneficio${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<PoliticaBeneficio>(`/api/v1/orcamento/politicas-beneficio/${id}`, token),
  
  criar: (token: string, data: Omit<PoliticaBeneficio, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<PoliticaBeneficio>('/api/v1/orcamento/politicas-beneficio', data, token),
  
  atualizar: (token: string, id: string, data: Partial<PoliticaBeneficio>) =>
    api.put<PoliticaBeneficio>(`/api/v1/orcamento/politicas-beneficio/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/politicas-beneficio/${id}`, token),
  
  gerarPadrao: (token: string) =>
    api.post<PoliticaBeneficio[]>('/api/v1/orcamento/politicas-beneficio/gerar-padrao', {}, token),
};

// ============================================
// Faixas Salariais
// ============================================

export const faixasSalariaisApi = {
  listar: (token: string, params?: { ativo?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    const query = queryParams.toString();
    return api.get<FaixaSalarial[]>(`/api/v1/orcamento/faixas-salariais${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<FaixaSalarial>(`/api/v1/orcamento/faixas-salariais/${id}`, token),
  
  criar: (token: string, data: Omit<FaixaSalarial, 'id' | 'created_at'>) =>
    api.post<FaixaSalarial>('/api/v1/orcamento/faixas-salariais', data, token),
  
  atualizar: (token: string, id: string, data: Partial<FaixaSalarial>) =>
    api.put<FaixaSalarial>(`/api/v1/orcamento/faixas-salariais/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/faixas-salariais/${id}`, token),
  
  gerarPadrao: (token: string) =>
    api.post<FaixaSalarial[]>('/api/v1/orcamento/faixas-salariais/gerar-padrao', {}, token),
};

// ============================================
// Tabela Salarial
// ============================================

export const tabelaSalarialApi = {
  listar: (token: string, params?: { funcao_id?: string; regime?: string; faixa_id?: string; politica_id?: string; ativo?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.funcao_id) queryParams.set('funcao_id', params.funcao_id);
    if (params?.regime) queryParams.set('regime', params.regime);
    if (params?.faixa_id) queryParams.set('faixa_id', params.faixa_id);
    if (params?.politica_id) queryParams.set('politica_id', params.politica_id);
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    const query = queryParams.toString();
    return api.get<TabelaSalarial[]>(`/api/v1/orcamento/tabela-salarial${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<TabelaSalarial>(`/api/v1/orcamento/tabela-salarial/${id}`, token),
  
  criar: (token: string, data: Omit<TabelaSalarial, 'id' | 'created_at' | 'updated_at' | 'funcao' | 'faixa' | 'politica'>) =>
    api.post<TabelaSalarial>('/api/v1/orcamento/tabela-salarial', data, token),
  
  atualizar: (token: string, id: string, data: Partial<TabelaSalarial>) =>
    api.put<TabelaSalarial>(`/api/v1/orcamento/tabela-salarial/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/tabela-salarial/${id}`, token),
};

// ============================================
// Tributos (por empresa)
// ============================================

export interface Tributo {
  id: string;
  empresa_id: string;
  codigo: string;
  nome: string;
  aliquota: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmpresaComTributos extends Empresa {
  tributos: Tributo[];
  encargos: Encargo[];
}

export const tributosApi = {
  listar: (token: string, empresaId: string) =>
    api.get<Tributo[]>(`/api/v1/orcamento/tributos?empresa_id=${empresaId}`, token),
  
  criar: (token: string, data: Omit<Tributo, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Tributo>('/api/v1/orcamento/tributos', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Tributo>) =>
    api.put<Tributo>(`/api/v1/orcamento/tributos/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/tributos/${id}`, token),
  
  gerarPadrao: (token: string, empresaId: string) =>
    api.post<Tributo[]>(`/api/v1/orcamento/tributos/gerar-padrao?empresa_id=${empresaId}`, {}, token),
};

// ============================================
// Provisões (globais)
// ============================================

export interface Provisao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  percentual: number;
  incide_encargos: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const provisoesApi = {
  listar: (token: string) =>
    api.get<Provisao[]>('/api/v1/orcamento/provisoes', token),
  
  criar: (token: string, data: Omit<Provisao, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Provisao>('/api/v1/orcamento/provisoes', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Provisao>) =>
    api.put<Provisao>(`/api/v1/orcamento/provisoes/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/provisoes/${id}`, token),
  
  gerarPadrao: (token: string) =>
    api.post<Provisao[]>('/api/v1/orcamento/provisoes/gerar-padrao', {}, token),
};

// ============================================
// Cenários
// ============================================

export interface Cenario {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  cliente_nw_codigo: string | null;
  ano_inicio: number;
  mes_inicio: number;
  ano_fim: number;
  mes_fim: number;
  status: 'RASCUNHO' | 'APROVADO' | 'BLOQUEADO';
  versao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresas?: {
    id: string;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
  }[];
}

export interface QuadroPessoal {
  id: string;
  cenario_id: string;
  funcao_id: string;
  secao_id: string | null;
  centro_custo_id: string | null;
  tabela_salarial_id: string | null;
  cenario_secao_id: string | null;  // Referência para CenarioSecao (estrutura hierárquica)
  regime: 'CLT' | 'PJ';
  qtd_jan: number;
  qtd_fev: number;
  qtd_mar: number;
  qtd_abr: number;
  qtd_mai: number;
  qtd_jun: number;
  qtd_jul: number;
  qtd_ago: number;
  qtd_set: number;
  qtd_out: number;
  qtd_nov: number;
  qtd_dez: number;
  salario_override: number | null;
  span: number | null;
  fator_pa: number;
  
  // Tipo de cálculo: manual, span, rateio
  tipo_calculo: 'manual' | 'span' | 'rateio';
  
  // Campos para SPAN
  span_ratio: number | null;
  span_funcoes_base_ids: string[] | null;
  
  // Campos para RATEIO
  rateio_grupo_id: string | null;
  rateio_percentual: number | null;
  rateio_qtd_total: number | null;
  
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  funcao?: { id: string; codigo: string; nome: string } | null;
  secao?: { id: string; codigo: string; nome: string } | null;
  centro_custo?: { id: string; codigo: string; nome: string } | null;
}

export interface FuncaoSpan {
  id: string;
  cenario_id: string;
  funcao_id: string;
  funcoes_base_ids: string[];
  span_ratio: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  funcao?: { id: string; codigo: string; nome: string } | null;
}

// ============================================
// CenarioCliente e CenarioSecao (Fase 1)
// ============================================

export interface CenarioSecao {
  id: string;
  cenario_cliente_id: string | null;  // FK antiga (hierarquia cliente)
  cenario_empresa_id: string | null;  // FK nova (hierarquia simplificada)
  secao_id: string;
  // Nota: fator_pa foi movido para QuadroPessoal
  ativo: boolean;
  created_at: string;
  updated_at: string;
  secao?: Secao;
  is_corporativo?: boolean;  // Indica se a seção é CORPORATIVO
}

export interface CenarioCliente {
  id: string;
  cenario_empresa_id: string;
  cliente_nw_codigo: string;
  nome_cliente: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  secoes?: CenarioSecao[];
}

export interface CenarioEmpresa {
  id: string;
  cenario_id: string;
  empresa_id: string;
  created_at: string;
  empresa?: Empresa;
  clientes?: CenarioCliente[];  // Hierarquia antiga
  secoes_diretas?: CenarioSecao[];  // Nova hierarquia: Empresa -> Seção
}

export interface CenarioEmpresaCreate {
  empresa_id: string;
}

export interface CenarioClienteCreate {
  cliente_nw_codigo: string;
  nome_cliente?: string;
}

export interface CenarioSecaoCreate {
  secao_id: string;
}

export interface FuncaoSpanCreate {
  cenario_id: string;
  funcao_id: string;
  funcoes_base_ids: string[];
  span_ratio: number;
  ativo?: boolean;
}

export interface PremissaFuncaoMes {
  id: string;
  cenario_id: string;
  cenario_secao_id?: string | null;
  funcao_id: string;
  mes: number;
  ano: number;
  absenteismo: number;
  abs_pct_justificado: number;  // % do ABS que e justificado
  turnover: number;
  ferias_indice: number;
  dias_treinamento: number;
  created_at: string;
  updated_at: string;
  funcao?: { id: string; codigo: string; nome: string } | null;
}

export interface PremissaFuncaoMesCreate {
  cenario_id: string;
  cenario_secao_id?: string | null;
  funcao_id: string;
  mes: number;
  ano: number;
  absenteismo: number;
  abs_pct_justificado: number;
  turnover: number;
  ferias_indice: number;
  dias_treinamento: number;
}

export const cenariosApi = {
  listar: (token: string, params?: { ano_inicio?: number; ano_fim?: number; empresa_id?: string; status?: string; ativo?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.ano_inicio) queryParams.set('ano_inicio', String(params.ano_inicio));
    if (params?.ano_fim) queryParams.set('ano_fim', String(params.ano_fim));
    if (params?.empresa_id) queryParams.set('empresa_id', params.empresa_id);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.ativo !== undefined) queryParams.set('ativo', String(params.ativo));
    const query = queryParams.toString();
    return api.get<Cenario[]>(`/api/v1/orcamento/cenarios${query ? `?${query}` : ''}`, token);
  },
  
  buscar: (token: string, id: string) =>
    api.get<Cenario>(`/api/v1/orcamento/cenarios/${id}`, token),
  
  criar: (token: string, data: Omit<Cenario, 'id' | 'codigo' | 'versao' | 'created_at' | 'updated_at' | 'empresas' | 'status'> & { empresa_ids: string[] }) =>
    api.post<Cenario>('/api/v1/orcamento/cenarios', data, token),
  
  atualizar: (token: string, id: string, data: Partial<Cenario>) =>
    api.put<Cenario>(`/api/v1/orcamento/cenarios/${id}`, data, token),
  
  excluir: (token: string, id: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${id}`, token),
  
  duplicar: (token: string, id: string, novoCodigo: string, novoNome: string) =>
    api.post<Cenario>(`/api/v1/orcamento/cenarios/${id}/duplicar?novo_codigo=${encodeURIComponent(novoCodigo)}&novo_nome=${encodeURIComponent(novoNome)}`, {}, token),
  
  // Quadro de Pessoal
  getQuadro: (token: string, cenarioId: string, params?: { funcao_id?: string; secao_id?: string; centro_custo_id?: string; regime?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.funcao_id) queryParams.set('funcao_id', params.funcao_id);
    if (params?.secao_id) queryParams.set('secao_id', params.secao_id);
    if (params?.centro_custo_id) queryParams.set('centro_custo_id', params.centro_custo_id);
    if (params?.regime) queryParams.set('regime', params.regime);
    const query = queryParams.toString();
    return api.get<QuadroPessoal[]>(`/api/v1/orcamento/cenarios/${cenarioId}/quadro${query ? `?${query}` : ''}`, token);
  },
  
  addPosicao: (token: string, cenarioId: string, data: Omit<QuadroPessoal, 'id' | 'created_at' | 'updated_at' | 'funcao' | 'secao' | 'centro_custo'>) =>
    api.post<QuadroPessoal>(`/api/v1/orcamento/cenarios/${cenarioId}/quadro`, data, token),
  
  // Alias para addPosicao (usado no CapacityPlanningPanel)
  addQuadro: (token: string, cenarioId: string, data: Omit<QuadroPessoal, 'id' | 'created_at' | 'updated_at' | 'funcao' | 'secao' | 'centro_custo'>) =>
    api.post<QuadroPessoal>(`/api/v1/orcamento/cenarios/${cenarioId}/quadro`, data, token),
  
  updatePosicao: (token: string, cenarioId: string, posicaoId: string, data: Partial<QuadroPessoal>) =>
    api.put<QuadroPessoal>(`/api/v1/orcamento/cenarios/${cenarioId}/quadro/${posicaoId}`, data, token),
  
  // Alias para updatePosicao
  updateQuadro: (token: string, cenarioId: string, posicaoId: string, data: Partial<QuadroPessoal>) =>
    api.put<QuadroPessoal>(`/api/v1/orcamento/cenarios/${cenarioId}/quadro/${posicaoId}`, data, token),
  
  deletePosicao: (token: string, cenarioId: string, posicaoId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/quadro/${posicaoId}`, token),
  
  // Alias para deletePosicao
  deleteQuadro: (token: string, cenarioId: string, posicaoId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/quadro/${posicaoId}`, token),
  
  // Cálculos
  calcularCustos: (token: string, cenarioId: string) =>
    api.get<ResumoCustos>(`/api/v1/orcamento/cenarios/${cenarioId}/calcular-custos`, token),
  
  calcularOverhead: (token: string, cenarioId: string) =>
    api.get<OverheadResult>(`/api/v1/orcamento/cenarios/${cenarioId}/calcular-overhead`, token),
  
  // Spans
  getSpans: (token: string, cenarioId: string) =>
    api.get<FuncaoSpan[]>(`/api/v1/orcamento/cenarios/${cenarioId}/spans`, token),
  
  createSpan: (token: string, cenarioId: string, data: FuncaoSpanCreate) =>
    api.post<FuncaoSpan>(`/api/v1/orcamento/cenarios/${cenarioId}/spans`, data, token),
  
  updateSpan: (token: string, cenarioId: string, spanId: string, data: Partial<FuncaoSpan>) =>
    api.put<FuncaoSpan>(`/api/v1/orcamento/cenarios/${cenarioId}/spans/${spanId}`, data, token),
  
  deleteSpan: (token: string, cenarioId: string, spanId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/spans/${spanId}`, token),
  
  calcularSpans: (token: string, cenarioId: string, aplicar: boolean = false) => {
    const params = new URLSearchParams();
    if (aplicar) params.set('aplicar', 'true');
    return api.post<{ aplicado: boolean; quantidades?: Record<string, number>; criadas?: number; atualizadas?: number; erros?: string[] }>(
      `/api/v1/orcamento/cenarios/${cenarioId}/calcular-spans?${params.toString()}`,
      {},
      token
    );
  },
  
  // Premissas por Função/Mês
  getPremissasFuncao: (token: string, cenarioId: string, params?: { funcao_id?: string; mes?: number; ano?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.funcao_id) queryParams.set('funcao_id', params.funcao_id);
    if (params?.mes) queryParams.set('mes', String(params.mes));
    if (params?.ano) queryParams.set('ano', String(params.ano));
    const query = queryParams.toString();
    return api.get<PremissaFuncaoMes[]>(`/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao${query ? `?${query}` : ''}`, token);
  },
  
  createPremissaFuncao: (token: string, cenarioId: string, data: PremissaFuncaoMesCreate) =>
    api.post<PremissaFuncaoMes>(`/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao`, data, token),
  
  updatePremissaFuncao: (token: string, cenarioId: string, premissaId: string, data: Partial<PremissaFuncaoMes>) =>
    api.put<PremissaFuncaoMes>(`/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao/${premissaId}`, data, token),
  
  deletePremissaFuncao: (token: string, cenarioId: string, premissaId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao/${premissaId}`, token),
  
  bulkPremissasFuncao: (token: string, cenarioId: string, premissas: PremissaFuncaoMesCreate[]) =>
    api.post<PremissaFuncaoMes[]>(`/api/v1/orcamento/cenarios/${cenarioId}/premissas-funcao/bulk`, premissas, token),
  
  // ============================================
  // CenarioCliente - Clientes do cenário
  // ============================================
  
  // ============================================
  // CenarioEmpresa - Empresas do cenário (hierarquia Master-Detail)
  // ============================================
  
  getEmpresas: (token: string, cenarioId: string) =>
    api.get<CenarioEmpresa[]>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas`, token),
  
  addEmpresa: (token: string, cenarioId: string, data: CenarioEmpresaCreate) =>
    api.post<CenarioEmpresa>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas`, data, token),
  
  deleteEmpresa: (token: string, cenarioId: string, cenarioEmpresaId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}`, token),
  
  // ============================================
  // CenarioCliente - Clientes de cada empresa
  // ============================================
  
  addCliente: (token: string, cenarioId: string, cenarioEmpresaId: string, data: CenarioClienteCreate) =>
    api.post<CenarioCliente>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/clientes`, data, token),
  
  deleteCliente: (token: string, cenarioId: string, cenarioEmpresaId: string, clienteId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/clientes/${clienteId}`, token),
  
  // ============================================
  // CenarioSecao - Seções de cada cliente
  // ============================================
  
  addSecao: (token: string, cenarioId: string, cenarioEmpresaId: string, clienteId: string, data: CenarioSecaoCreate) =>
    api.post<CenarioSecao>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/clientes/${clienteId}/secoes`, data, token),
  
  deleteSecao: (token: string, cenarioId: string, cenarioEmpresaId: string, clienteId: string, secaoId: string) =>
    api.delete(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/clientes/${clienteId}/secoes/${secaoId}`, token),
};

// Types para cálculos
export interface ResumoCustos {
  cenario_id: string;
  cenario_nome: string;
  ano_inicio: number;
  mes_inicio: number;
  ano_fim: number;
  mes_fim: number;
  total_headcount_medio: number;
  custo_total_anual: number;
  custo_mensal_medio: number;
  custos_por_mes: Record<number, number>;
  custos_por_funcao: Record<string, number>;
}

export interface OverheadResult {
  cenario_id: string;
  premissas: {
    absenteismo: number;
    turnover: number;
    ferias: number;
  };
  fator_overhead_total: number;
  meses: Record<number, {
    headcount_produtivo: number;
    headcount_necessario: number;
    overhead: number;
    fator: number;
  }>;
}

// Tipos para o módulo de custos
export interface TipoCusto {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria: 'REMUNERACAO' | 'BENEFICIO' | 'ENCARGO' | 'PROVISAO' | 'PREMIO' | 'DESCONTO';
  tipo_calculo: string;
  conta_contabil_codigo: string | null;
  conta_contabil_descricao: string | null;
  incide_fgts: boolean;
  incide_inss: boolean;
  reflexo_ferias: boolean;
  reflexo_13: boolean;
  aliquota_padrao: number | null;
  ordem: number;
  ativo: boolean;
}

export interface CustoCalculado {
  id: string;
  cenario_id: string;
  cenario_secao_id: string;
  funcao_id: string;
  faixa_id: string | null;
  tipo_custo_id: string;
  mes: number;
  ano: number;
  hc_base: number;
  valor_base: number;
  indice_aplicado: number;
  valor_calculado: number;
  memoria_calculo: Record<string, any> | null;
  funcao?: { id: string; codigo: string; nome: string };
  tipo_custo?: { id: string; codigo: string; nome: string; categoria: string };
}

export interface DRELinha {
  conta_contabil_codigo: string;
  conta_contabil_descricao: string;
  conta_contabil_completa: string; // Formato "CODIGO - DESCRICAO"
  tipo_custo_codigo: string | null;
  tipo_custo_nome: string | null;
  categoria: string;
  valores_mensais: number[];
  total: number;
}

export interface DREResponse {
  cenario_id: string;
  cenario_secao_id: string | null;
  ano: number;
  linhas: DRELinha[];
  total_geral: number;
}

// API de Custos
export const custosApi = {
  // Tipos de custo (rubricas)
  listarTipos: (token: string, categoria?: string) => {
    const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    return api.get<TipoCusto[]>(`/api/v1/orcamento/custos/tipos?${params}`, token);
  },

  atualizarTipo: (token: string, tipoId: string, data: Partial<TipoCusto>) =>
    api.put<TipoCusto>(`/api/v1/orcamento/custos/tipos/${tipoId}`, data, token),

  // Cálculo de custos
  calcular: (token: string, cenarioId: string, cenarioSecaoId?: string, ano?: number) => {
    const params = new URLSearchParams();
    if (cenarioSecaoId) params.append('cenario_secao_id', cenarioSecaoId);
    if (ano) params.append('ano', ano.toString());
    return api.post<{ success: boolean; message: string; quantidade: number }>(
      `/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular?${params}`, {}, token
    );
  },

  // Listar custos calculados
  listar: (token: string, cenarioId: string, filtros?: {
    cenario_secao_id?: string;
    funcao_id?: string;
    tipo_custo_id?: string;
    mes?: number;
    ano?: number;
  }) => {
    const params = new URLSearchParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return api.get<CustoCalculado[]>(
      `/api/v1/orcamento/custos/cenarios/${cenarioId}?${params}`, token
    );
  },

  // Resumo por categoria
  resumo: (token: string, cenarioId: string, cenarioSecaoId?: string, ano?: number) => {
    const params = new URLSearchParams();
    if (cenarioSecaoId) params.append('cenario_secao_id', cenarioSecaoId);
    if (ano) params.append('ano', ano.toString());
    return api.get<{
      cenario_id: string;
      por_categoria: Record<string, number>;
      total_geral: number;
    }>(`/api/v1/orcamento/custos/cenarios/${cenarioId}/resumo?${params}`, token);
  },

  // DRE
  dre: (token: string, cenarioId: string, cenarioSecaoId?: string, ano?: number) => {
    const params = new URLSearchParams();
    if (cenarioSecaoId) params.append('cenario_secao_id', cenarioSecaoId);
    if (ano) params.append('ano', ano.toString());
    return api.get<DREResponse>(
      `/api/v1/orcamento/custos/cenarios/${cenarioId}/dre?${params}`, token
    );
  },
  
  // Calcular custos de tecnologia
  calcularTecnologia: (token: string, cenarioId: string, cenarioSecaoId?: string, ano?: number) => {
    const params = new URLSearchParams();
    if (cenarioSecaoId) params.append('cenario_secao_id', cenarioSecaoId);
    if (ano) params.append('ano', ano.toString());
    return api.post<{
      success: boolean;
      message: string;
      cenario_id: string;
      ano: number;
      alocacoes_processadas: number;
      custos_criados: number;
      valor_total: number;
    }>(`/api/v1/orcamento/custos/cenarios/${cenarioId}/calcular-tecnologia?${params}`, {}, token);
  },
};


// ============================================
// Fornecedores
// ============================================

export interface Fornecedor {
  id: string;
  codigo: string;
  codigo_nw?: string | null;
  nome: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
  contato_telefone?: string | null;
  observacao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FornecedorCreate {
  codigo: string;
  codigo_nw?: string | null;
  nome: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
  contato_telefone?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export interface FornecedorUpdate extends Partial<FornecedorCreate> {}

export const fornecedores = {
  // Listar
  listar: (token: string, filtros?: { apenas_ativos?: boolean; busca?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.apenas_ativos !== undefined) params.append('apenas_ativos', filtros.apenas_ativos.toString());
    if (filtros?.busca) params.append('busca', filtros.busca);
    return api.get<Fornecedor[]>(`/api/v1/orcamento/fornecedores?${params}`, token);
  },

  // Obter
  obter: (token: string, id: string) => {
    return api.get<Fornecedor>(`/api/v1/orcamento/fornecedores/${id}`, token);
  },

  // Criar
  criar: (token: string, data: FornecedorCreate) => {
    return api.post<Fornecedor>('/api/v1/orcamento/fornecedores', data, token);
  },

  // Atualizar
  atualizar: (token: string, id: string, data: FornecedorUpdate) => {
    return api.put<Fornecedor>(`/api/v1/orcamento/fornecedores/${id}`, data, token);
  },

  // Excluir
  excluir: (token: string, id: string, softDelete: boolean = true) => {
    return api.delete<void>(`/api/v1/orcamento/fornecedores/${id}?soft_delete=${softDelete}`, token);
  },

  // Listar do NW
  listarNW: (token: string, filtros?: { apenas_ativos?: boolean; busca?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.apenas_ativos !== undefined) params.append('apenas_ativos', filtros.apenas_ativos.toString());
    if (filtros?.busca) params.append('busca', filtros.busca);
    return api.get<{ codigo: string; razao_social: string; nome_fantasia?: string; cnpj?: string }[]>(
      `/api/v1/orcamento/nw/fornecedores?${params}`, token
    );
  },

  // Importar do NW
  importarNW: (token: string, codigos: string[]) => {
    return api.post<{ importados: number; erros: number; detalhes: any[] }>(
      '/api/v1/orcamento/nw/fornecedores/importar',
      { codigos },
      token
    );
  },
};


// ============================================
// Produtos de Tecnologia
// ============================================

export interface ProdutoTecnologia {
  id: string;
  fornecedor_id: string;
  codigo: string;
  nome: string;
  categoria: string;
  valor_base?: number | null;
  unidade_medida?: string | null;
  conta_contabil_id?: string | null;
  descricao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  fornecedor?: Fornecedor;
}

export interface ProdutoTecnologiaCreate {
  fornecedor_id: string;
  codigo?: string; // AUTO para gerar automaticamente
  nome: string;
  categoria: string;
  valor_base?: number | null;
  unidade_medida?: string | null;
  conta_contabil_id?: string | null;
  descricao?: string | null;
  ativo?: boolean;
}

export interface ProdutoTecnologiaUpdate extends Partial<ProdutoTecnologiaCreate> {}

export const produtosTecnologia = {
  // Listar
  listar: (token: string, filtros?: { fornecedor_id?: string; categoria?: string; apenas_ativos?: boolean; busca?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.fornecedor_id) params.append('fornecedor_id', filtros.fornecedor_id);
    if (filtros?.categoria) params.append('categoria', filtros.categoria);
    if (filtros?.apenas_ativos !== undefined) params.append('apenas_ativos', filtros.apenas_ativos.toString());
    if (filtros?.busca) params.append('busca', filtros.busca);
    return api.get<ProdutoTecnologia[]>(`/api/v1/orcamento/produtos?${params}`, token);
  },

  // Obter
  obter: (token: string, id: string) => {
    return api.get<ProdutoTecnologia>(`/api/v1/orcamento/produtos/${id}`, token);
  },

  // Criar
  criar: (token: string, data: ProdutoTecnologiaCreate) => {
    return api.post<ProdutoTecnologia>('/api/v1/orcamento/produtos', data, token);
  },

  // Atualizar
  atualizar: (token: string, id: string, data: ProdutoTecnologiaUpdate) => {
    return api.put<ProdutoTecnologia>(`/api/v1/orcamento/produtos/${id}`, data, token);
  },

  // Excluir
  excluir: (token: string, id: string, softDelete: boolean = true) => {
    return api.delete<void>(`/api/v1/orcamento/produtos/${id}?soft_delete=${softDelete}`, token);
  },
};


// ============================================
// Alocações de Tecnologia
// ============================================

export interface AlocacaoTecnologia {
  id: string;
  cenario_id: string;
  cenario_secao_id: string;
  produto_id: string;
  tipo_alocacao: 'FIXO' | 'VARIAVEL' | 'RATEIO';
  qtd_jan?: number | null;
  qtd_fev?: number | null;
  qtd_mar?: number | null;
  qtd_abr?: number | null;
  qtd_mai?: number | null;
  qtd_jun?: number | null;
  qtd_jul?: number | null;
  qtd_ago?: number | null;
  qtd_set?: number | null;
  qtd_out?: number | null;
  qtd_nov?: number | null;
  qtd_dez?: number | null;
  valor_override?: number | null;
  fator_multiplicador?: number | null;
  percentual_rateio?: number | null;
  observacao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  produto?: ProdutoTecnologia;
}

export interface AlocacaoTecnologiaCreate {
  cenario_id: string;
  cenario_secao_id: string;
  produto_id: string;
  tipo_alocacao: 'FIXO' | 'VARIAVEL' | 'RATEIO';
  valor_override?: number | null;
  fator_multiplicador?: number | null;
  percentual_rateio?: number | null;
  observacao?: string | null;
  ativo?: boolean;
}

export interface AlocacaoTecnologiaUpdate extends Partial<AlocacaoTecnologiaCreate> {}

export const alocacoesTecnologia = {
  // Listar
  listar: (token: string, cenarioId: string, filtros?: { cenario_secao_id?: string; ativo?: boolean }) => {
    const params = new URLSearchParams();
    params.append('cenario_id', cenarioId);
    if (filtros?.cenario_secao_id) params.append('cenario_secao_id', filtros.cenario_secao_id);
    if (filtros?.ativo !== undefined) params.append('ativo', filtros.ativo.toString());
    return api.get<AlocacaoTecnologia[]>(`/api/v1/orcamento/alocacoes?${params}`, token);
  },

  // Obter
  obter: (token: string, id: string) => {
    return api.get<AlocacaoTecnologia>(`/api/v1/orcamento/alocacoes/${id}`, token);
  },

  // Criar
  criar: (token: string, data: AlocacaoTecnologiaCreate) => {
    return api.post<AlocacaoTecnologia>('/api/v1/orcamento/alocacoes', data, token);
  },

  // Atualizar
  atualizar: (token: string, id: string, data: AlocacaoTecnologiaUpdate) => {
    return api.put<AlocacaoTecnologia>(`/api/v1/orcamento/alocacoes/${id}`, data, token);
  },

  // Excluir
  excluir: (token: string, id: string, softDelete: boolean = true) => {
    return api.delete<void>(`/api/v1/orcamento/alocacoes/${id}?soft_delete=${softDelete}`, token);
  },
};

// ============================================
// Rateio de Custos (POOL -> OPERACIONAL)
// ============================================

export interface RateioDestino {
  id: string;
  rateio_grupo_id: string;
  cc_destino_id: string;
  percentual: number;
  created_at: string;
  cc_destino?: CentroCusto;
}

export interface RateioDestinoCreate {
  cc_destino_id: string;
  percentual: number;
}

export interface RateioGrupo {
  id: string;
  cenario_id: string;
  cc_origem_pool_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  cc_origem?: CentroCusto;
  destinos: RateioDestino[];
  percentual_total: number;
}

export interface RateioGrupoComValidacao extends RateioGrupo {
  is_valido: boolean;
  mensagem_validacao: string | null;
}

export interface RateioGrupoCreate {
  cc_origem_pool_id: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  destinos?: RateioDestinoCreate[];
}

export interface RateioGrupoUpdate {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
}

export const rateios = {
  // Listar grupos de rateio de um cenário
  listar: (token: string, cenarioId: string, apenasAtivos: boolean = true) => {
    const params = new URLSearchParams();
    params.append('apenas_ativos', apenasAtivos.toString());
    return api.get<RateioGrupoComValidacao[]>(`/api/v1/orcamento/rateios/cenario/${cenarioId}?${params}`, token);
  },

  // Obter grupo de rateio
  obter: (token: string, rateioId: string) => {
    return api.get<RateioGrupoComValidacao>(`/api/v1/orcamento/rateios/${rateioId}`, token);
  },

  // Criar grupo de rateio
  criar: (token: string, cenarioId: string, data: RateioGrupoCreate) => {
    return api.post<RateioGrupo>(`/api/v1/orcamento/rateios/cenario/${cenarioId}`, data, token);
  },

  // Atualizar grupo de rateio
  atualizar: (token: string, rateioId: string, data: RateioGrupoUpdate) => {
    return api.patch<RateioGrupo>(`/api/v1/orcamento/rateios/${rateioId}`, data, token);
  },

  // Excluir grupo de rateio
  excluir: (token: string, rateioId: string) => {
    return api.delete<void>(`/api/v1/orcamento/rateios/${rateioId}`, token);
  },

  // Adicionar destino
  adicionarDestino: (token: string, rateioId: string, data: RateioDestinoCreate) => {
    return api.post<RateioDestino>(`/api/v1/orcamento/rateios/${rateioId}/destinos`, data, token);
  },

  // Atualizar percentual do destino
  atualizarDestino: (token: string, rateioId: string, destinoId: string, percentual: number) => {
    return api.patch<RateioDestino>(`/api/v1/orcamento/rateios/${rateioId}/destinos/${destinoId}?percentual=${percentual}`, {}, token);
  },

  // Remover destino
  removerDestino: (token: string, rateioId: string, destinoId: string) => {
    return api.delete<void>(`/api/v1/orcamento/rateios/${rateioId}/destinos/${destinoId}`, token);
  },

  // Validar rateio
  validar: (token: string, rateioId: string) => {
    return api.post<{ is_valido: boolean; percentual_total: number; mensagem: string }>(`/api/v1/orcamento/rateios/${rateioId}/validar`, {}, token);
  },

  // Listar CCs POOL disponíveis
  listarPoolsDisponiveis: (token: string, cenarioId: string) => {
    return api.get<Array<{ id: string; codigo: string; nome: string; tipo: string }>>(`/api/v1/orcamento/rateios/cenario/${cenarioId}/pools-disponiveis`, token);
  },

  // Listar CCs OPERACIONAIS disponíveis
  listarOperacionaisDisponiveis: (token: string, cenarioId: string) => {
    return api.get<Array<{ id: string; codigo: string; nome: string; tipo: string }>>(`/api/v1/orcamento/rateios/cenario/${cenarioId}/operacionais-disponiveis`, token);
  },
};

// ============================================
// Seções de Empresa (Nova Hierarquia)
// ============================================

export const secoesEmpresa = {
  // Listar seções de uma empresa (nova hierarquia)
  listar: (token: string, cenarioId: string, cenarioEmpresaId: string, apenasAtivas: boolean = true) => {
    const params = new URLSearchParams();
    params.append('apenas_ativas', apenasAtivas.toString());
    return api.get<CenarioSecao[]>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/secoes?${params}`, token);
  },

  // Adicionar seção a uma empresa
  adicionar: (token: string, cenarioId: string, cenarioEmpresaId: string, secaoId: string) => {
    return api.post<CenarioSecao>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/secoes`, { secao_id: secaoId }, token);
  },

  // Remover seção de uma empresa
  remover: (token: string, cenarioId: string, cenarioEmpresaId: string, cenarioSecaoId: string) => {
    return api.delete<void>(`/api/v1/orcamento/cenarios/${cenarioId}/empresas/${cenarioEmpresaId}/secoes/${cenarioSecaoId}`, token);
  },
};

// ============================================
// Validação CC vs Seção
// ============================================

export interface ValidacaoCCSecaoResponse {
  valido: boolean;
  mensagem: string;
  secao: {
    id: string;
    codigo: string | null;
    nome: string;
    is_corporativo: boolean;
  };
  centro_custo: {
    id: string;
    codigo: string;
    nome: string;
    tipo: string;
  };
}

export interface CCDisponivelParaSecao {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
}

export const validacaoCenario = {
  // Validar se um CC pode ser usado com uma seção
  validarCCSecao: (token: string, cenarioId: string, secaoId: string, centroCustoId: string) => {
    const params = new URLSearchParams();
    params.append('secao_id', secaoId);
    params.append('centro_custo_id', centroCustoId);
    return api.post<ValidacaoCCSecaoResponse>(`/api/v1/orcamento/cenarios/${cenarioId}/validar-cc-secao?${params}`, {}, token);
  },

  // Listar CCs disponíveis para uma seção do cenário
  listarCCsDisponiveis: (token: string, cenarioId: string, cenarioSecaoId: string) => {
    const params = new URLSearchParams();
    params.append('cenario_secao_id', cenarioSecaoId);
    return api.get<{
      cenario_secao_id: string;
      is_corporativo: boolean;
      tipo_cc_permitido: string;
      centros_custo: CCDisponivelParaSecao[];
    }>(`/api/v1/orcamento/cenarios/${cenarioId}/centros-custo-disponiveis?${params}`, token);
  },
};

