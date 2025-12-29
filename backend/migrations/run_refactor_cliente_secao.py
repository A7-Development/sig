"""
Script para executar a migração de refatoração Cliente -> Seção.
Executa o arquivo SQL refactor_cliente_para_secao.sql
"""

import asyncio
import os
from pathlib import Path

# Adicionar o diretório pai ao path para importar os módulos
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.session import engine as async_engine


async def run_migration():
    """Executa a migração SQL."""
    print("=" * 60)
    print("MIGRAÇÃO: Cliente -> Seção + Rateio")
    print("=" * 60)
    
    # Ler o arquivo SQL
    sql_file = Path(__file__).parent / "refactor_cliente_para_secao.sql"
    
    if not sql_file.exists():
        print(f"ERRO: Arquivo SQL não encontrado: {sql_file}")
        return False
    
    with open(sql_file, "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # Dividir em statements (ignorando comentários e linhas vazias)
    statements = []
    current_statement = []
    in_do_block = False
    
    for line in sql_content.split("\n"):
        stripped = line.strip()
        
        # Ignorar linhas vazias e comentários
        if not stripped or stripped.startswith("--"):
            continue
        
        # Detectar início de bloco DO $$
        if "DO $$" in stripped or stripped.startswith("DO $$"):
            in_do_block = True
        
        current_statement.append(line)
        
        # Detectar fim de bloco DO $$
        if in_do_block and stripped.endswith("$$;"):
            in_do_block = False
            statements.append("\n".join(current_statement))
            current_statement = []
        # Statements normais terminam com ;
        elif not in_do_block and stripped.endswith(";"):
            statements.append("\n".join(current_statement))
            current_statement = []
    
    # Adicionar último statement se houver
    if current_statement:
        statements.append("\n".join(current_statement))
    
    print(f"Encontrados {len(statements)} statements para executar")
    print()
    
    async with async_engine.begin() as conn:
        success_count = 0
        error_count = 0
        
        for i, stmt in enumerate(statements, 1):
            stmt = stmt.strip()
            if not stmt:
                continue
            
            # Mostrar resumo do statement
            first_line = stmt.split("\n")[0][:60]
            print(f"[{i}/{len(statements)}] Executando: {first_line}...")
            
            try:
                await conn.execute(text(stmt))
                success_count += 1
                print(f"    [OK]")
            except Exception as e:
                error_str = str(e)
                # Ignorar erros de "já existe" que são esperados
                if "already exists" in error_str or "already exists" in error_str.lower():
                    print(f"    [SKIP] Ja existe (ignorado)")
                    success_count += 1
                elif "duplicate key" in error_str.lower():
                    print(f"    [SKIP] Duplicado (ignorado)")
                    success_count += 1
                else:
                    print(f"    [ERRO] {error_str[:100]}")
                    error_count += 1
        
        print()
        print("=" * 60)
        print(f"Migração concluída!")
        print(f"  Sucesso: {success_count}")
        print(f"  Erros: {error_count}")
        print("=" * 60)
        
        return error_count == 0


if __name__ == "__main__":
    result = asyncio.run(run_migration())
    sys.exit(0 if result else 1)

