"""
Adiciona colunas faltantes na tabela produtos_tecnologia.
"""
import asyncio
import os
import sys

# Adiciona o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal


async def run_migration():
    async with AsyncSessionLocal() as session:
        try:
            # Verificar quais colunas existem
            result = await session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'produtos_tecnologia'
            """))
            existing_columns = [row[0] for row in result.fetchall()]
            print(f"Colunas existentes: {existing_columns}")
            
            # Adicionar colunas faltantes
            columns_to_add = []
            
            if 'valor_base' not in existing_columns:
                columns_to_add.append("ADD COLUMN valor_base NUMERIC(12, 2)")
                
            if 'unidade_medida' not in existing_columns:
                columns_to_add.append("ADD COLUMN unidade_medida VARCHAR(30)")
                
            if 'conta_contabil_id' not in existing_columns:
                columns_to_add.append("ADD COLUMN conta_contabil_id UUID")
                
            if 'descricao' not in existing_columns:
                columns_to_add.append("ADD COLUMN descricao TEXT")
            
            if columns_to_add:
                sql = f"ALTER TABLE produtos_tecnologia {', '.join(columns_to_add)}"
                print(f"Executando: {sql}")
                await session.execute(text(sql))
                await session.commit()
                print("✅ Colunas adicionadas com sucesso!")
            else:
                print("✅ Todas as colunas já existem!")
                
        except Exception as e:
            print(f"❌ Erro: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(run_migration())

