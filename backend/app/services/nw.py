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



