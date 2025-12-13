"""
Serviço de integração com CORPORERM (SQL Server).
ATENÇÃO: Este serviço é SOMENTE LEITURA. Não fazer INSERT/UPDATE/DELETE.
"""

import pyodbc
from typing import List, Optional
from pydantic import BaseModel
from app.core.config import settings


class FuncaoTotvs(BaseModel):
    """Função/Cargo do TOTVS"""
    codigo: str
    nome: str
    cbo: Optional[str] = None


class DepartamentoTotvs(BaseModel):
    """Departamento do TOTVS"""
    codigo: str
    nome: str


class SecaoTotvs(BaseModel):
    """Seção do TOTVS"""
    codigo: str
    descricao: str
    codigo_depto: Optional[str] = None


class CentroCustoTotvs(BaseModel):
    """Centro de Custo do TOTVS"""
    codigo: str
    nome: Optional[str] = None


def get_corporerm_connection() -> pyodbc.Connection:
    """
    Cria conexão com o SQL Server CORPORERM.
    Retorna conexão apenas para leitura.
    """
    connection_string = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={settings.CORPORERM_HOST},{settings.CORPORERM_PORT};"
        f"DATABASE={settings.CORPORERM_DATABASE};"
        f"UID={settings.CORPORERM_USER};"
        f"PWD={settings.CORPORERM_PASSWORD};"
        f"TrustServerCertificate=yes;"
    )
    return pyodbc.connect(connection_string, readonly=True)


def listar_funcoes(
    apenas_ativas: bool = True,
    busca: Optional[str] = None
) -> List[FuncaoTotvs]:
    """
    Lista funções/cargos da tabela PFUNCAO.
    SOMENTE LEITURA.
    """
    conn = get_corporerm_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT CODIGO, NOME, CBO2002
        FROM PFUNCAO
        WHERE CODCOLIGADA = ?
    """
    params = [settings.CORPORERM_CODCOLIGADA]
    
    if apenas_ativas:
        query += " AND (INATIVA = 0 OR INATIVA IS NULL)"
    
    if busca:
        query += " AND (NOME LIKE ? OR CODIGO LIKE ?)"
        params.extend([f"%{busca}%", f"%{busca}%"])
    
    query += " ORDER BY NOME"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    funcoes = []
    for row in rows:
        funcoes.append(FuncaoTotvs(
            codigo=row.CODIGO.strip() if row.CODIGO else "",
            nome=row.NOME.strip() if row.NOME else "",
            cbo=row.CBO2002.strip() if row.CBO2002 else None
        ))
    
    cursor.close()
    conn.close()
    
    return funcoes


def listar_departamentos(
    apenas_ativos: bool = True,
    busca: Optional[str] = None
) -> List[DepartamentoTotvs]:
    """
    Lista departamentos da tabela GDEPTO.
    SOMENTE LEITURA.
    """
    conn = get_corporerm_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT DISTINCT CODDEPARTAMENTO, NOME
        FROM GDEPTO
        WHERE CODCOLIGADA = ?
    """
    params = [settings.CORPORERM_CODCOLIGADA]
    
    if apenas_ativos:
        query += " AND ATIVO = 'T'"
    
    if busca:
        query += " AND (NOME LIKE ? OR CODDEPARTAMENTO LIKE ?)"
        params.extend([f"%{busca}%", f"%{busca}%"])
    
    query += " ORDER BY NOME"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    departamentos = []
    for row in rows:
        departamentos.append(DepartamentoTotvs(
            codigo=row.CODDEPARTAMENTO.strip() if row.CODDEPARTAMENTO else "",
            nome=row.NOME.strip() if row.NOME else ""
        ))
    
    cursor.close()
    conn.close()
    
    return departamentos


def listar_secoes(
    apenas_ativas: bool = True,
    busca: Optional[str] = None,
    codigo_depto: Optional[str] = None
) -> List[SecaoTotvs]:
    """
    Lista seções da tabela PSECAO.
    SOMENTE LEITURA.
    """
    conn = get_corporerm_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT DISTINCT CODIGO, DESCRICAO, CODDEPTO
        FROM PSECAO
        WHERE CODCOLIGADA = ?
    """
    params = [settings.CORPORERM_CODCOLIGADA]
    
    if apenas_ativas:
        query += " AND (SECAODESATIVADA = 0 OR SECAODESATIVADA IS NULL)"
    
    if busca:
        query += " AND (DESCRICAO LIKE ? OR CODIGO LIKE ?)"
        params.extend([f"%{busca}%", f"%{busca}%"])
    
    if codigo_depto:
        query += " AND CODDEPTO = ?"
        params.append(codigo_depto)
    
    query += " ORDER BY DESCRICAO"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    secoes = []
    for row in rows:
        secoes.append(SecaoTotvs(
            codigo=row.CODIGO.strip() if row.CODIGO else "",
            descricao=row.DESCRICAO.strip() if row.DESCRICAO else "",
            codigo_depto=row.CODDEPTO.strip() if row.CODDEPTO else None
        ))
    
    cursor.close()
    conn.close()
    
    return secoes


def listar_centros_custo(
    apenas_ativos: bool = True,
    busca: Optional[str] = None
) -> List[CentroCustoTotvs]:
    """
    Lista centros de custo da tabela PCCUSTO.
    SOMENTE LEITURA.
    """
    conn = get_corporerm_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT CODCCUSTO, NOME
        FROM PCCUSTO
        WHERE CODCOLIGADA = ?
    """
    params = [settings.CORPORERM_CODCOLIGADA]
    
    if apenas_ativos:
        query += " AND ATIVO = 'T'"
    
    if busca:
        query += " AND (NOME LIKE ? OR CODCCUSTO LIKE ?)"
        params.extend([f"%{busca}%", f"%{busca}%"])
    
    query += " ORDER BY NOME"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    centros = []
    for row in rows:
        centros.append(CentroCustoTotvs(
            codigo=row.CODCCUSTO.strip() if row.CODCCUSTO else "",
            nome=row.NOME.strip() if row.NOME else None
        ))
    
    cursor.close()
    conn.close()
    
    return centros


def buscar_funcao_por_codigo(codigo: str) -> Optional[FuncaoTotvs]:
    """
    Busca uma função específica pelo código.
    SOMENTE LEITURA.
    """
    conn = get_corporerm_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT CODIGO, NOME, CBO2002
        FROM PFUNCAO
        WHERE CODCOLIGADA = ? AND CODIGO = ?
    """
    
    cursor.execute(query, [settings.CORPORERM_CODCOLIGADA, codigo])
    row = cursor.fetchone()
    
    funcao = None
    if row:
        funcao = FuncaoTotvs(
            codigo=row.CODIGO.strip() if row.CODIGO else "",
            nome=row.NOME.strip() if row.NOME else "",
            cbo=row.CBO2002.strip() if row.CBO2002 else None
        )
    
    cursor.close()
    conn.close()
    
    return funcao

