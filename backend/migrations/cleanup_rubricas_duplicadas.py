"""
Remove rubricas duplicadas, mantendo apenas os códigos TOTVS.
Os códigos genéricos (SALARIO, HE_50, etc.) serão removidos.
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2

load_dotenv(backend_dir / ".env")

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sig")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

# Lista de códigos genéricos que devem ser removidos
# (duplicatas dos códigos TOTVS)
CODIGOS_PARA_REMOVER = [
    "SALARIO",      # duplicata de 0001
    "HE_50",        # duplicata de 0012
    "HE_100",       # duplicata de 0014
    "DSR",          # duplicata de 0020
    "HONORARIOS",   # duplicata de 0018
    "VT",           # duplicata de 0069
    "VR",           # duplicata de B217
    "AM",           # duplicata de B001
    "CRECHE",       # duplicata de 0092
    "HO",           # duplicata de 0736
    "FGTS",         # duplicata de E0087
    "INSS_EMP",     # duplicata de E0080
    "INSS_TERC",    # duplicata de E0082
    "SAT_RAT",      # duplicata de E0083
    "PROV_FERIAS",  # duplicata de E0002
    "FGTS_FERIAS",  # duplicata de E0007
    "INSS_FERIAS",  # duplicata de E0003
    "PROV_13",      # duplicata de E0040
    "FGTS_13",      # duplicata de E0045
    "INSS_13",      # duplicata de E0041
    "INDENIZ",      # duplicata de E0001
    "AVISO_IND",    # duplicata de 0500
    "MULTA_FGTS",   # duplicata de B350
    "BONUS_PLR",    # duplicata de 0047
    "PREMIOS",      # duplicata de 0574
    "DESC_480",     # duplicata de 0580
    "DESC_AVISO",   # duplicata de 0499
    "DESC_FALTAS",  # duplicata de 0101
    "DESC_VT",      # duplicata de 0107
    "DESC_VR",      # duplicata de 0123
]


def cleanup_duplicatas():
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()
    
    print("=" * 60)
    print("Removendo rubricas duplicadas (mantendo códigos TOTVS)")
    print("=" * 60)
    
    # Primeiro, verificar se há custos calculados vinculados
    for codigo in CODIGOS_PARA_REMOVER:
        cur.execute("""
            SELECT tc.id, tc.codigo, tc.nome,
                   (SELECT COUNT(*) FROM custos_calculados cc WHERE cc.tipo_custo_id = tc.id) as qtd_custos
            FROM tipos_custo tc
            WHERE tc.codigo = %s
        """, (codigo,))
        
        result = cur.fetchone()
        
        if result is None:
            print(f"  [SKIP] {codigo} - não existe")
            continue
        
        id_rubrica, codigo_db, nome, qtd_custos = result
        
        if qtd_custos > 0:
            print(f"  [WARN] {codigo} ({nome}) - tem {qtd_custos} custos calculados vinculados!")
            print(f"         Primeiro remova os custos calculados ou ajuste-os para usar o código TOTVS")
            continue
        
        # Verificar parâmetros de custo
        cur.execute("""
            SELECT COUNT(*) FROM parametros_custo WHERE tipo_custo_id = %s
        """, (id_rubrica,))
        qtd_params = cur.fetchone()[0]
        
        if qtd_params > 0:
            print(f"  [WARN] {codigo} ({nome}) - tem {qtd_params} parâmetros vinculados!")
            continue
        
        # Pode deletar com segurança
        cur.execute("DELETE FROM tipos_custo WHERE id = %s", (id_rubrica,))
        print(f"  [DEL] {codigo} - {nome}")
    
    # Commit das alterações
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print("Limpeza concluída!")
    print("=" * 60)


def show_current_state():
    """Mostra o estado atual das rubricas."""
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("\n" + "=" * 60)
    print("Estado atual das rubricas:")
    print("=" * 60)
    
    cur.execute("""
        SELECT codigo, nome, categoria, 
               (SELECT COUNT(*) FROM custos_calculados cc WHERE cc.tipo_custo_id = tc.id) as qtd_custos
        FROM tipos_custo tc
        ORDER BY categoria, codigo
    """)
    
    results = cur.fetchall()
    
    current_categoria = None
    for codigo, nome, categoria, qtd_custos in results:
        if categoria != current_categoria:
            print(f"\n[{categoria}]")
            current_categoria = categoria
        vinc = f" ({qtd_custos} custos)" if qtd_custos > 0 else ""
        print(f"  {codigo:15} - {nome}{vinc}")
    
    conn.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Remove rubricas duplicadas")
    parser.add_argument("--dry-run", action="store_true", help="Apenas mostra o estado atual sem deletar")
    args = parser.parse_args()
    
    if args.dry_run:
        show_current_state()
    else:
        cleanup_duplicatas()
        show_current_state()





