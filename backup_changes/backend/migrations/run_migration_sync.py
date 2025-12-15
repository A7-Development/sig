"""
Script para executar a migração do schema de cenários no banco sig_db.
Usa psql (subprocess) para executar o script SQL diretamente.
"""
import sys
import subprocess
import os
from pathlib import Path

# Adicionar o diretório raiz do backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings


def run_migration():
    """Executa a migração do schema de cenários."""
    # Extrair informações de conexão do DATABASE_URL
    # Formato: postgresql+asyncpg://postgres:postgres@localhost:5432/sig_db
    from urllib.parse import urlparse
    
    db_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    parsed = urlparse(db_url)
    
    host = parsed.hostname or 'localhost'
    port = parsed.port or 5432
    database = parsed.path.lstrip('/') or 'postgres'
    user = parsed.username or 'postgres'
    password = parsed.password or ''
    
    print("=" * 60)
    print("  Migracao do Schema de Cenarios")
    print("=" * 60)
    print()
    print(f"Conectando ao banco: {host}:{port}/{database}")
    print(f"Usuario: {user}")
    print("=" * 60)
    
    # Ler o script SQL
    migration_file = Path(__file__).parent / "migrate_cenarios_schema.sql"
    if not migration_file.exists():
        print(f"ERRO: Arquivo de migracao nao encontrado: {migration_file}")
        return False
    
    try:
        # Executar via psql
        print("Executando migracao via psql...")
        print()
        
        # Preparar variável de ambiente para senha
        env = dict(os.environ)
        if password:
            env['PGPASSWORD'] = password
        
        # Executar psql com o script SQL
        cmd = [
            'psql',
            '-h', host,
            '-p', str(port),
            '-U', user,
            '-d', database,
            '-f', str(migration_file)
        ]
        
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode == 0:
            print("OK: Migracao executada com sucesso!")
            if result.stdout:
                print(result.stdout)
            print("=" * 60)
            
            # Verificar se a migração foi bem-sucedida
            check_cmd = [
                'psql',
                '-h', host,
                '-p', str(port),
                '-U', user,
                '-d', database,
                '-t', '-c', """
                    SELECT 
                        EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
                        )::text || ',' ||
                        EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_name = 'cenarios_empresas'
                        )::text
                """
            ]
            
            check_result = subprocess.run(
                check_cmd,
                env=env,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            if check_result.returncode == 0:
                values = check_result.stdout.strip().split(',')
                has_ano_inicio = values[0].strip() == 't'
                has_cenarios_empresas = values[1].strip() == 't'
                
                if has_ano_inicio and has_cenarios_empresas:
                    print("OK: Verificacao: Todas as alteracoes foram aplicadas corretamente!")
                    print("   - Colunas de periodo flexivel: OK")
                    print("   - Tabela de associacao empresas: OK")
                    return True
                else:
                    print("AVISO: Algumas alteracoes podem nao ter sido aplicadas.")
                    print(f"   - ano_inicio existe: {has_ano_inicio}")
                    print(f"   - cenarios_empresas existe: {has_cenarios_empresas}")
                    return False
            else:
                print("AVISO: Nao foi possivel verificar o resultado da migracao.")
                return True  # Assumir sucesso se o script executou sem erro
        else:
            print(f"ERRO ao executar migracao:")
            if result.stderr:
                print(result.stderr)
            if result.stdout:
                print(result.stdout)
            return False
            
    except FileNotFoundError:
        print("ERRO: psql nao encontrado. Certifique-se de que o PostgreSQL esta instalado e psql esta no PATH.")
        print("Alternativa: Execute o script SQL manualmente usando:")
        print(f"  psql -U {user} -d {database} -f {migration_file}")
        return False
    except Exception as e:
        print(f"ERRO ao executar migracao: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_migration()
    
    if success:
        print()
        print("SUCESSO: Migracao concluida! Voce pode agora criar cenarios com periodo flexivel.")
        sys.exit(0)
    else:
        print()
        print("ERRO: Migracao falhou. Verifique os erros acima.")
        sys.exit(1)

