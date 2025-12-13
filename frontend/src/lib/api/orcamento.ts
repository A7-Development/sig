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

