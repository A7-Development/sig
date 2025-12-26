"""
Script para adicionar campos de tipo de cálculo (Manual, Span, Rateio).
Execute: python -m migrations.run_add_calculo_tipos
"""

import asyncio
import asyncpg
from pathlib import Path
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

async def run_migration():
    """Executa a migração."""
    
    db_url = os.getenv("DATABASE_URL", "")
    
    if not db_url:
        print("[ERRO] DATABASE_URL não configurada")
        return False
    
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print("Conectando ao banco de dados...")
    
    try:
        conn = await asyncpg.connect(db_url)
        
        print("Executando migração de tipos de cálculo...")
        print("-" * 50)
        
        # 1. tipo_calculo
        print("1. Adicionando coluna tipo_calculo...")
        try:
            await conn.execute("""
                ALTER TABLE quadro_pessoal 
                ADD COLUMN IF NOT EXISTS tipo_calculo VARCHAR(20) DEFAULT 'manual'
            """)
            print("   OK - tipo_calculo")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        # 2. span_ratio
        print("2. Adicionando coluna span_ratio...")
        try:
            await conn.execute("""
                ALTER TABLE quadro_pessoal 
                ADD COLUMN IF NOT EXISTS span_ratio NUMERIC(10, 2) DEFAULT NULL
            """)
            print("   OK - span_ratio")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        # 3. span_funcoes_base_ids
        print("3. Adicionando coluna span_funcoes_base_ids...")
        try:
            await conn.execute("""
                ALTER TABLE quadro_pessoal 
                ADD COLUMN IF NOT EXISTS span_funcoes_base_ids JSONB DEFAULT NULL
            """)
            print("   OK - span_funcoes_base_ids")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        # 4. rateio_grupo_id
        print("4. Adicionando coluna rateio_grupo_id...")
        try:
            await conn.execute("""
                ALTER TABLE quadro_pessoal 
                ADD COLUMN IF NOT EXISTS rateio_grupo_id UUID DEFAULT NULL
            """)
            print("   OK - rateio_grupo_id")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        # 5. rateio_percentual
        print("5. Adicionando coluna rateio_percentual...")
        try:
            await conn.execute("""
                ALTER TABLE quadro_pessoal 
                ADD COLUMN IF NOT EXISTS rateio_percentual NUMERIC(5, 2) DEFAULT NULL
            """)
            print("   OK - rateio_percentual")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        # 6. rateio_qtd_total
        print("6. Adicionando coluna rateio_qtd_total...")
        try:
            await conn.execute("""
                ALTER TABLE quadro_pessoal 
                ADD COLUMN IF NOT EXISTS rateio_qtd_total INTEGER DEFAULT NULL
            """)
            print("   OK - rateio_qtd_total")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        # 7. Índice para rateio
        print("7. Criando índice para rateio_grupo_id...")
        try:
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_quadro_rateio_grupo 
                ON quadro_pessoal(rateio_grupo_id) 
                WHERE rateio_grupo_id IS NOT NULL
            """)
            print("   OK - índice criado")
        except Exception as e:
            print(f"   Aviso: {e}")
        
        print("-" * 50)
        
        # Verificar resultado
        result = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quadro_pessoal' 
            AND column_name IN ('tipo_calculo', 'span_ratio', 'span_funcoes_base_ids', 
                               'rateio_grupo_id', 'rateio_percentual', 'rateio_qtd_total')
        """)
        
        colunas = [r['column_name'] for r in result]
        print(f"[OK] Migração concluída! Colunas adicionadas: {', '.join(colunas)}")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"[ERRO] Falha na migração: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    asyncio.run(run_migration())







