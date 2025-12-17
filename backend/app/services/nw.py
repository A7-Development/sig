"""
Serviço de integração com banco NW (PostgreSQL).
ATENÇÃO: Este serviço é SOMENTE LEITURA. Não fazer INSERT/UPDATE/DELETE.
"""

import psycopg2
from typing import List, Optional
from pydantic import BaseModel
from app.core.config import settings


class EmpresaNW(BaseModel):
    """Empresa do NW"""
    codigo: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None


class ClienteNW(BaseModel):
    """Cliente do NW"""
    codigo: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None


def get_nw_connection():
    """
    Cria conexão com o PostgreSQL NW.
    SOMENTE LEITURA.
    """
    return psycopg2.connect(
        host=settings.NW_HOST,
        port=settings.NW_PORT,
        database=settings.NW_DATABASE,
        user=settings.NW_USER,
        password=settings.NW_PASSWORD,
    )


def listar_empresas_nw(
    apenas_ativas: bool = True,
    busca: Optional[str] = None
) -> List[EmpresaNW]:
    """
    Lista empresas da tabela empresa no NW.
    SOMENTE LEITURA.
    """
    conn = get_nw_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            cod_empresa,
            razao,
            fantasia,
            cgc
        FROM empresa
        WHERE 1=1
    """
    params = []
    
    if apenas_ativas:
        query += " AND UPPER(ativo) = 'S'"
    
    if busca:
        query += " AND (razao ILIKE %s OR fantasia ILIKE %s OR cod_empresa ILIKE %s)"
        busca_param = f"%{busca}%"
        params.extend([busca_param, busca_param, busca_param])
    
    query += " ORDER BY razao"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    empresas = []
    for row in rows:
        empresas.append(EmpresaNW(
            codigo=row[0].strip() if row[0] else "",
            razao_social=row[1].strip() if row[1] else "",
            nome_fantasia=row[2].strip() if row[2] else None,
            cnpj=row[3].strip() if row[3] else None,
        ))
    
    cursor.close()
    conn.close()
    
    return empresas


def buscar_empresa_nw_por_codigo(codigo: str) -> Optional[EmpresaNW]:
    """
    Busca uma empresa específica pelo código no NW.
    SOMENTE LEITURA.
    """
    conn = get_nw_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            cod_empresa,
            razao,
            fantasia,
            cgc
        FROM empresa
        WHERE cod_empresa = %s
    """
    
    cursor.execute(query, [codigo])
    row = cursor.fetchone()
    
    empresa = None
    if row:
        empresa = EmpresaNW(
            codigo=row[0].strip() if row[0] else "",
            razao_social=row[1].strip() if row[1] else "",
            nome_fantasia=row[2].strip() if row[2] else None,
            cnpj=row[3].strip() if row[3] else None,
        )
    
    cursor.close()
    conn.close()
    
    return empresa


def listar_clientes_nw(
    apenas_ativos: bool = True,
    busca: Optional[str] = None
) -> List[ClienteNW]:
    """
    Lista clientes da tabela clifor no NW.
    Filtra por cliente = 'S' e ativo = 'S'.
    SOMENTE LEITURA.
    """
    conn = get_nw_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            cod_clifor,
            razao,
            fantasia
        FROM clifor
        WHERE cliente = 'S'
    """
    params = []
    
    if apenas_ativos:
        query += " AND ativo = 'S'"
    
    if busca:
        query += " AND (razao ILIKE %s OR fantasia ILIKE %s OR cod_clifor ILIKE %s)"
        busca_param = f"%{busca}%"
        params.extend([busca_param, busca_param, busca_param])
    
    query += " ORDER BY razao"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    clientes = []
    for row in rows:
        clientes.append(ClienteNW(
            codigo=row[0].strip() if row[0] else "",
            razao_social=row[1].strip() if row[1] else "",
            nome_fantasia=row[2].strip() if row[2] else None,
            cnpj=None,  # Não disponível na tabela clifor
        ))
    
    cursor.close()
    conn.close()
    
    return clientes


def buscar_cliente_nw_por_codigo(codigo: str) -> Optional[ClienteNW]:
    """
    Busca um cliente específico pelo código no NW.
    SOMENTE LEITURA.
    """
    conn = get_nw_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            cod_clifor,
            razao,
            fantasia
        FROM clifor
        WHERE cod_clifor = %s
        AND cliente = 'S'
    """
    
    cursor.execute(query, [codigo])
    row = cursor.fetchone()
    
    cliente = None
    if row:
        cliente = ClienteNW(
            codigo=row[0].strip() if row[0] else "",
            razao_social=row[1].strip() if row[1] else "",
            nome_fantasia=row[2].strip() if row[2] else None,
            cnpj=None,  # Não disponível na tabela clifor
        )
    
    cursor.close()
    conn.close()
    
    return cliente


class ContaContabilNW(BaseModel):
    """Conta contábil da view vw_conta_contabil_niveis do NW."""
    codigo: str
    descricao: str
    nivel1: Optional[str] = None
    nivel2: Optional[str] = None
    nivel3: Optional[str] = None
    nivel4: Optional[str] = None
    nivel5: Optional[str] = None


def listar_contas_contabeis_nw(
    busca: Optional[str] = None,
    apenas_analiticas: bool = False,
    limit: int = 500
) -> List[ContaContabilNW]:
    """
    Lista contas contábeis da view vw_conta_contabil_niveis no NW.
    SOMENTE LEITURA.
    
    Args:
        busca: Filtro por código ou descrição
        apenas_analiticas: Se True, retorna apenas contas analíticas (último nível)
        limit: Limite de registros
    """
    conn = get_nw_connection()
    cursor = conn.cursor()
    
    # Estrutura real da view NW
    query = """
        SELECT 
            cod_contacontabil,
            cod_conta_nivel,
            nivel1,
            nivel2,
            nivel3,
            nivel4,
            nivel5
        FROM vw_conta_contabil_niveis
        WHERE 1=1
    """
    params = []
    
    if busca:
        query += " AND (cod_contacontabil ILIKE %s OR cod_conta_nivel ILIKE %s)"
        busca_param = f"%{busca}%"
        params.extend([busca_param, busca_param])
    
    query += " ORDER BY cod_contacontabil"
    query += f" LIMIT {limit}"
    
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        contas = []
        for row in rows:
            # row[0] = cod_contacontabil (código)
            # row[1] = cod_conta_nivel (código + descrição)
            # row[2] a row[6] = nivel1 a nivel5
            # nivel5 é a descrição da conta
            
            contas.append(ContaContabilNW(
                codigo=row[0].strip() if row[0] else "",
                descricao=row[6].strip() if row[6] else "",  # nivel5 é a descrição
                nivel1=row[2].strip() if row[2] else None,
                nivel2=row[3].strip() if row[3] else None,
                nivel3=row[4].strip() if row[4] else None,
                nivel4=row[5].strip() if row[5] else None,
                nivel5=row[6].strip() if row[6] else None,
            ))
        
        return contas
    except Exception as e:
        # Se a view não existir ou tiver estrutura diferente, retornar lista vazia
        print(f"Erro ao consultar vw_conta_contabil_niveis: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


def buscar_conta_contabil_nw_por_codigo(codigo: str) -> Optional[ContaContabilNW]:
    """
    Busca uma conta contábil específica pelo código no NW.
    SOMENTE LEITURA.
    """
    conn = get_nw_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            cod_contacontabil,
            cod_conta_nivel,
            nivel1,
            nivel2,
            nivel3,
            nivel4,
            nivel5
        FROM vw_conta_contabil_niveis
        WHERE cod_contacontabil = %s
    """
    
    try:
        cursor.execute(query, [codigo])
        row = cursor.fetchone()
        
        conta = None
        if row:
            conta = ContaContabilNW(
                codigo=row[0].strip() if row[0] else "",
                descricao=row[6].strip() if row[6] else "",  # nivel5 é a descrição
                nivel1=row[2].strip() if row[2] else None,
                nivel2=row[3].strip() if row[3] else None,
                nivel3=row[4].strip() if row[4] else None,
                nivel4=row[5].strip() if row[5] else None,
                nivel5=row[6].strip() if row[6] else None,
            )
        
        return conta
    except Exception as e:
        print(f"Erro ao consultar conta contábil: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

