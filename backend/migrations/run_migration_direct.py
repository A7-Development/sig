"""
Script para executar a migração do schema de cenários no banco sig.
Usa a conexão direta do backend (asyncpg) para executar comandos de escrita.
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
    print("=" * 60)
    print("  Migracao do Schema de Cenarios")
    print("=" * 60)
    print()
    print(f"Banco: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print("=" * 60)
    
    # Ler o script SQL
    migration_file = Path(__file__).parent / "migrate_cenarios_schema.sql"
    if not migration_file.exists():
        print(f"ERRO: Arquivo de migracao nao encontrado: {migration_file}")
        return False
    
    sql_script = migration_file.read_text(encoding='utf-8')
    
    # Dividir o script em comandos individuais
    # Separar por ';' mas manter blocos DO $$ juntos
    commands = []
    current_command = []
    in_do_block = False
    
    for line in sql_script.split('\n'):
        stripped = line.strip()
        
        # Pular comentários e linhas vazias
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
            # Executar cada comando separadamente em transações individuais
            for i, cmd in enumerate(commands, 1):
                if not cmd.strip():
                    continue
                print(f"Executando comando {i}/{len(commands)}...")
                try:
                    await session.execute(text(cmd))
                    await session.commit()
                except Exception as e:
                    # Fazer rollback para limpar o estado da transação
                    await session.rollback()
                    # Se o erro for que a coluna/tabela já existe, continuar
                    error_str = str(e).lower()
                    if any(phrase in error_str for phrase in ['already exists', 'já existe', 'duplicate', 'duplicado']):
                        print(f"  (Pulando - ja existe)")
                        continue
                    # Se for erro de transação interrompida, fazer rollback e continuar
                    if 'failed sql transaction' in error_str or 'transação' in error_str:
                        print(f"  (Pulando - transacao interrompida)")
                        continue
                    raise
            
            print()
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
            error_msg = str(e).encode('ascii', errors='replace').decode('ascii')
            print(f"ERRO ao executar migracao: {error_msg}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = asyncio.run(run_migration())
    
    if success:
        print()
        print("SUCESSO: Migracao concluida! Voce pode agora criar cenarios com periodo flexivel.")
        sys.exit(0)
    else:
        print()
        print("ERRO: Migracao falhou. Verifique os erros acima.")
        sys.exit(1)

