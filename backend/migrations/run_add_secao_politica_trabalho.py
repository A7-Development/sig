"""
Migration runner para adicionar campos de política de trabalho na tabela secoes.
"""
import asyncio
import os
import sys

# Adiciona o diretório raiz do backend ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal


async def run_migration():
    """Executa a migration SQL."""
    # Lê o arquivo SQL
    sql_path = os.path.join(os.path.dirname(__file__), 'add_secao_politica_trabalho.sql')
    
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Remove comentários de linha única e separa comandos
    commands = []
    for line in sql_content.split('\n'):
        line = line.strip()
        if line and not line.startswith('--'):
            commands.append(line)
    
    # Junta e separa por ponto e vírgula
    full_sql = ' '.join(commands)
    statements = [s.strip() for s in full_sql.split(';') if s.strip()]
    
    async with AsyncSessionLocal() as db:
        try:
            for stmt in statements:
                if stmt:
                    print(f"Executando: {stmt[:80]}...")
                    await db.execute(text(stmt))
            
            await db.commit()
            print("\n[OK] Migration executada com sucesso!")
            
            # Verifica as colunas
            result = await db.execute(text("""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns 
                WHERE table_name = 'secoes' 
                AND column_name IN (
                    'trabalha_sabado', 'trabalha_domingo',
                    'trabalha_feriado_nacional', 'trabalha_feriado_estadual', 'trabalha_feriado_municipal',
                    'uf', 'cidade'
                )
                ORDER BY column_name
            """))
            columns = result.fetchall()
            
            print("\nColunas adicionadas/verificadas:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")
                
        except Exception as e:
            await db.rollback()
            print(f"\n[ERRO] Erro na migration: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(run_migration())

