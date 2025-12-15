"""
Script para executar a migração do schema de cenários no banco sig_db.
Este script usa a conexão configurada na aplicação para garantir que estamos
executando no banco correto.
"""
import asyncio
import sys
from pathlib import Path

# Adicionar o diretório raiz do backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.core.config import settings


async def run_migration():
    """Executa a migração do schema de cenários."""
    db_name = settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL
    print(f"Executando migracao no banco: {db_name}")
    print("=" * 60)
    
    # Ler o script SQL
    migration_file = Path(__file__).parent / "migrate_cenarios_schema.sql"
    if not migration_file.exists():
        print(f"ERRO: Arquivo de migracao nao encontrado: {migration_file}")
        return False
    
    sql_script = migration_file.read_text(encoding='utf-8')
    
    # Dividir o script em comandos individuais (separados por ;)
    # Mas manter blocos DO $$ juntos
    commands = []
    current_command = []
    in_do_block = False
    
    for line in sql_script.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('--'):
            continue
            
        current_command.append(line)
        
        # Detectar início de bloco DO $$
        if 'DO $$' in line.upper():
            in_do_block = True
        
        # Detectar fim de bloco DO $$
        if in_do_block and 'END $$;' in line.upper():
            in_do_block = False
            commands.append('\n'.join(current_command))
            current_command = []
        elif not in_do_block and stripped.endswith(';'):
            commands.append('\n'.join(current_command))
            current_command = []
    
    if current_command:
        commands.append('\n'.join(current_command))
    
    async with AsyncSessionLocal() as session:
        try:
            # Executar cada comando separadamente
            for i, cmd in enumerate(commands, 1):
                if not cmd.strip():
                    continue
                print(f"Executando comando {i}/{len(commands)}...")
                await session.execute(text(cmd))
            
            await session.commit()
            
            print("OK: Migracao executada com sucesso!")
            print("=" * 60)
            
            # Verificar se a migração foi bem-sucedida
            check_query = text("""
                SELECT 
                    EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
                    ) as has_ano_inicio,
                    EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'cenarios_empresas'
                    ) as has_cenarios_empresas
            """)
            
            result = await session.execute(check_query)
            row = result.fetchone()
            
            if row and row.has_ano_inicio and row.has_cenarios_empresas:
                print("OK: Verificacao: Todas as alteracoes foram aplicadas corretamente!")
                print("   - Colunas de periodo flexivel: OK")
                print("   - Tabela de associacao empresas: OK")
                return True
            else:
                print("AVISO: Algumas alteracoes podem nao ter sido aplicadas.")
                print(f"   - ano_inicio existe: {row.has_ano_inicio if row else 'N/A'}")
                print(f"   - cenarios_empresas existe: {row.has_cenarios_empresas if row else 'N/A'}")
                return False
                
        except Exception as e:
            await session.rollback()
            print(f"ERRO ao executar migracao: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    print("=" * 60)
    print("  Migração do Schema de Cenários")
    print("=" * 60)
    print()
    
    success = asyncio.run(run_migration())
    
    if success:
        print()
        print("SUCESSO: Migracao concluida! Voce pode agora criar cenarios com periodo flexivel.")
        sys.exit(0)
    else:
        print()
        print("ERRO: Migracao falhou. Verifique os erros acima.")
        sys.exit(1)

