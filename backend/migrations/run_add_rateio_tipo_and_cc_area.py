"""
Script para executar a migração de tipo_rateio e area_m2.

Uso:
    cd backend
    python migrations/run_add_rateio_tipo_and_cc_area.py
"""
import sys
import os
import asyncio
from pathlib import Path

# Reconfigure stdout for UTF-8 encoding (Windows compatibility)
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings


async def run_migration():
    """Executa a migração."""
    print("=" * 60)
    print("Migracao: Adicionar tipo_rateio e area_m2")
    print("=" * 60)
    
    # Comandos SQL a executar (um por vez)
    sql_commands = [
        # 1. Adicionar tipo_rateio ao rateio_grupos
        "ALTER TABLE rateio_grupos ADD COLUMN IF NOT EXISTS tipo_rateio VARCHAR(20) DEFAULT 'MANUAL' NOT NULL",
        "COMMENT ON COLUMN rateio_grupos.tipo_rateio IS 'Tipo de rateio: MANUAL, HC, AREA, PA'",
        # 2. Adicionar area_m2 aos centros_custo
        "ALTER TABLE centros_custo ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(10, 2)",
        "COMMENT ON COLUMN centros_custo.area_m2 IS 'Area em metros quadrados para rateio'",
        # 3. Atualizar registros existentes
        "UPDATE rateio_grupos SET tipo_rateio = 'MANUAL' WHERE tipo_rateio IS NULL",
    ]
    
    # Conectar ao banco
    engine = create_async_engine(settings.DATABASE_URL)
    
    try:
        async with engine.begin() as conn:
            print("\nConectado ao banco de dados.")
            print("Executando migracao...")
            
            # Executar cada comando SQL separadamente
            for i, sql in enumerate(sql_commands, 1):
                print(f"  [{i}/{len(sql_commands)}] {sql[:60]}...")
                await conn.execute(text(sql))
            
            # Verificar se as colunas foram criadas
            result = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'rateio_grupos' AND column_name = 'tipo_rateio'
            """))
            tipo_rateio_exists = result.fetchone() is not None
            
            result = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'centros_custo' AND column_name = 'area_m2'
            """))
            area_m2_exists = result.fetchone() is not None
            
            print("\n" + "-" * 40)
            print("Resultado da migracao:")
            print(f"  - tipo_rateio em rateio_grupos: {'OK' if tipo_rateio_exists else 'FALHOU'}")
            print(f"  - area_m2 em centros_custo: {'OK' if area_m2_exists else 'FALHOU'}")
            print("-" * 40)
            
            if tipo_rateio_exists and area_m2_exists:
                print("\nMigracao concluida com sucesso!")
                return True
            else:
                print("\nMigracao incompleta. Verifique os erros acima.")
                return False
                
    except Exception as e:
        print(f"\nERRO durante a migracao: {e}")
        return False
    finally:
        await engine.dispose()


if __name__ == "__main__":
    success = asyncio.run(run_migration())
    sys.exit(0 if success else 1)

