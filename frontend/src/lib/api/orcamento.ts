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
  tipo: 'OPERACIONAL' | 'ADMINISTRATIVO' | 'OVERHEAD';
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

export interface Premissa {
  id: string;
  cenario_id: string;
  absenteismo: number;
  turnover: number;
  ferias_indice: number;
  dias_treinamento: number;
  reajuste_data: string | null;
  reajuste_percentual: number;
  dissidio_mes: number | null;
  dissidio_percentual: number;
  created_at: string;
  updated_at: string;
}

export interface QuadroPessoal {
  id: string;
  cenario_id: string;
  funcao_id: string;
  secao_id: string | null;
  centro_custo_id: string | null;
  tabela_salarial_id: string | null;
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
  cenario_cliente_id: string;
  secao_id: string;
  // Nota: fator_pa foi movido para QuadroPessoal
  ativo: boolean;
  created_at: string;
  updated_at: string;
  secao?: Secao;
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
  clientes?: CenarioCliente[];
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
  funcao_id: string;
  mes: number;
  ano: number;
  absenteismo: number;
  turnover: number;
  ferias_indice: number;
  dias_treinamento: number;
  created_at: string;
  updated_at: string;
  funcao?: { id: string; codigo: string; nome: string } | null;
}

export interface PremissaFuncaoMesCreate {
  cenario_id: string;
  funcao_id: string;
  mes: number;
  ano: number;
  absenteismo: number;
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
  
  // Premissas
  getPremissas: (token: string, cenarioId: string) =>
    api.get<Premissa[]>(`/api/v1/orcamento/cenarios/${cenarioId}/premissas`, token),
  
  updatePremissa: (token: string, cenarioId: string, premissaId: string, data: Partial<Premissa>) =>
    api.put<Premissa>(`/api/v1/orcamento/cenarios/${cenarioId}/premissas/${premissaId}`, data, token),
  
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
  
  updatePosicao: (token: string, cenarioId: string, posicaoId: string, data: Partial<QuadroPessoal>) =>
    api.put<QuadroPessoal>(`/api/v1/orcamento/cenarios/${cenarioId}/quadro/${posicaoId}`, data, token),
  
  deletePosicao: (token: string, cenarioId: string, posicaoId: string) =>
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

