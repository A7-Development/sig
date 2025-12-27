"""
Atualiza as rubricas com os códigos do Totvs.
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

# Mapeamento: código antigo -> (código totvs, nome totvs, categoria totvs)
MAPEAMENTO = [
    # PROVENTOS (era REMUNERACAO)
    ("SALARIO", "0001", "SALÁRIO", "PROVENTO"),
    ("HE_50", "0012", "HORA EXTRA 50%", "PROVENTO"),
    ("HE_100", "0014", "HORA EXTRA 100%", "PROVENTO"),
    ("DSR", "0020", "D.S.R. S/ HORAS EXTRAS", "PROVENTO"),
    ("HONORARIOS", "0018", "HONORARIOS", "PROVENTO"),
    
    # BENEFÍCIOS / PROVENTOS
    ("VT", "0069", "PAGAMENTO DE VALE TRANSPORTE", "PROVENTO"),
    ("VR", "B217", "VALE REFEIÇÃO", "BENEFICIO"),
    ("AM", "B001", "ASSISTÊNCIA MÉDICA/ODONTOLÓGICA/FARM", "BENEFICIO"),
    ("CRECHE", "0092", "AUXÍLIO CRECHE", "PROVENTO"),
    ("HO", "0736", "AUXÍLIO HOME OFFICE", "PROVENTO"),
    
    # ENCARGOS
    ("FGTS", "E0087", "FOLHA FGTS 8%", "ENCARGO"),
    ("INSS_EMP", "E0080", "FOLHA INSS 20%", "ENCARGO"),
    ("INSS_TERC", "E0082", "FOLHA INSS TERCEIROS 5,8%", "ENCARGO"),
    ("SAT_RAT", "E0083", "FOLHA RAT 3%", "ENCARGO"),
    
    # PROVISÕES
    ("PROV_FERIAS", "E0002", "PROVISÃO FÉRIAS", "PROVISAO"),
    ("FGTS_FERIAS", "E0007", "PROVISÃO FÉRIAS FGTS 8%", "PROVISAO"),
    ("INSS_FERIAS", "E0003", "PROVISÃO FÉRIAS INSS 8,8%", "PROVISAO"),
    ("PROV_13", "E0040", "PROVISÃO 13º SALÁRIO", "PROVISAO"),
    ("FGTS_13", "E0045", "PROVISÃO 13º SALÁRIO FGTS 8%", "PROVISAO"),
    ("INSS_13", "E0041", "PROVISÃO 13º SALÁRIO INSS 8,8%", "PROVISAO"),
    ("INDENIZ", "E0001", "PROVISÃO INDENIZAÇÕES TRABALHISTAS", "PROVISAO"),
    ("AVISO_IND", "0500", "AVISO PRÉVIO INDENIZADO", "PROVISAO"),
    ("MULTA_FGTS", "B350", "FGTS - 40%", "ENCARGO"),
    
    # PRÊMIOS -> PROVENTOS
    ("BONUS_PLR", "0047", "BONUS", "PROVENTO"),
    ("PREMIOS", "0574", "PREMIAÇÃO", "PROVENTO"),
    
    # DESCONTOS
    ("DESC_480", "0580", "DESC. ARTIGO 480 CLT", "DESCONTO"),
    ("DESC_AVISO", "0499", "DESC. DE AVISO PRÉVIO", "DESCONTO"),
    ("DESC_FALTAS", "0101", "DESC. DIAS FALTAS", "DESCONTO"),
    ("DESC_VT", "0107", "DESC. VALE TRANSPORTE", "DESCONTO"),
    ("DESC_VR", "0123", "DESC. ADIANT. VALE REFEIÇÃO", "DESCONTO"),
]

def update_rubricas():
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("=" * 60)
    print("Atualizando rubricas com códigos Totvs")
    print("=" * 60)
    
    for codigo_antigo, codigo_totvs, nome_totvs, categoria in MAPEAMENTO:
        cur.execute("""
            UPDATE tipos_custo 
            SET codigo = %s, nome = %s, categoria = %s
            WHERE codigo = %s
        """, (codigo_totvs, nome_totvs, categoria, codigo_antigo))
        
        if cur.rowcount > 0:
            print(f"  [OK] {codigo_antigo} -> {codigo_totvs}: {nome_totvs}")
        else:
            # Tentar encontrar pelo código Totvs (já atualizado anteriormente)
            cur.execute("SELECT id FROM tipos_custo WHERE codigo = %s", (codigo_totvs,))
            if cur.fetchone():
                print(f"  [SKIP] {codigo_totvs} já existe")
            else:
                print(f"  [WARN] {codigo_antigo} não encontrado")
    
    conn.close()
    print("\n" + "=" * 60)
    print("Atualização concluída!")
    print("=" * 60)

if __name__ == "__main__":
    update_rubricas()







