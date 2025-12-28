"""
Script para tornar a coluna 'ano' nullable na tabela cenarios.
Isso permite que novos registros sejam criados sem a coluna 'ano'.
"""
import asyncio
import sys
from pathlib import Path

# Adicionar o diretório raiz do backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal


async def fix_ano_column():
    """Torna a coluna 'ano' nullable."""
    print("=" * 60)
    print("  Corrigindo coluna 'ano' na tabela cenarios")
    print("=" * 60)
    print()
    
    async with AsyncSessionLocal() as session:
        try:
            # Verificar se coluna 'ano' existe e se é NOT NULL
            check_query = text("""
                SELECT column_name, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'cenarios' AND column_name = 'ano'
            """)
            
            result = await session.execute(check_query)
            row = result.fetchone()
            
            if not row:
                print("Coluna 'ano' nao existe. Nada a fazer.")
                return True
            
            if row.is_nullable == 'YES':
                print("Coluna 'ano' ja e nullable. Nada a fazer.")
                return True
            
            print("Tornando coluna 'ano' nullable...")
            
            # Tornar coluna nullable
            alter_query = text("ALTER TABLE cenarios ALTER COLUMN ano DROP NOT NULL")
            await session.execute(alter_query)
            await session.commit()
            
            print("OK: Coluna 'ano' agora e nullable!")
            print()
            
            # Verificar também empresa_id
            check_empresa = text("""
                SELECT column_name, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'cenarios' AND column_name = 'empresa_id'
            """)
            
            result = await session.execute(check_empresa)
            row_empresa = result.fetchone()
            
            if row_empresa and row_empresa.is_nullable == 'NO':
                print("Tornando coluna 'empresa_id' nullable...")
                alter_empresa = text("ALTER TABLE cenarios ALTER COLUMN empresa_id DROP NOT NULL")
                await session.execute(alter_empresa)
                await session.commit()
                print("OK: Coluna 'empresa_id' agora e nullable!")
            
            print("=" * 60)
            print("SUCESSO: Colunas corrigidas!")
            return True
            
        except Exception as e:
            await session.rollback()
            print(f"ERRO: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = asyncio.run(fix_ano_column())
    sys.exit(0 if success else 1)















