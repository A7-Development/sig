"""
Script simples para executar a migração do schema de cenários.
Executa cada comando SQL em uma transação separada.
"""
import asyncio
import sys
from pathlib import Path

# Adicionar o diretório raiz do backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal


async def execute_sql(session, sql: str, description: str):
    """Executa um comando SQL em uma transação separada."""
    try:
        print(f"  {description}...")
        await session.execute(text(sql))
        await session.commit()
        print(f"    OK")
        return True
    except Exception as e:
        await session.rollback()
        error_str = str(e).lower()
        # Se já existe, não é erro
        if any(phrase in error_str for phrase in ['already exists', 'já existe', 'duplicate']):
            print(f"    (Pulando - ja existe)")
            return True
        print(f"    ERRO: {str(e)[:100]}")
        return False


async def run_migration():
    """Executa a migração do schema de cenários."""
    print("=" * 60)
    print("  Migracao do Schema de Cenarios")
    print("=" * 60)
    print()
    
    async with AsyncSessionLocal() as session:
        # 1. Adicionar colunas de período flexível
        print("1. Adicionando colunas de periodo flexivel...")
        
        sql1 = """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
            ) THEN
                ALTER TABLE cenarios 
                ADD COLUMN ano_inicio INTEGER,
                ADD COLUMN ano_fim INTEGER;
                
                UPDATE cenarios 
                SET ano_inicio = COALESCE(ano, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
                    ano_fim = COALESCE(ano, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
                WHERE ano_inicio IS NULL;
                
                ALTER TABLE cenarios 
                ALTER COLUMN ano_inicio SET NOT NULL,
                ALTER COLUMN ano_fim SET NOT NULL;
            END IF;
        END $$;
        """
        
        if not await execute_sql(session, sql1, "Adicionando colunas ano_inicio e ano_fim"):
            return False
        
        # 2. Atualizar mes_inicio e mes_fim se necessário
        print()
        print("2. Verificando colunas mes_inicio e mes_fim...")
        
        sql2 = """
        DO $$ 
        BEGIN
            UPDATE cenarios 
            SET mes_inicio = COALESCE(mes_inicio, 1),
                mes_fim = COALESCE(mes_fim, 12)
            WHERE mes_inicio IS NULL OR mes_fim IS NULL;
        END $$;
        """
        
        await execute_sql(session, sql2, "Atualizando valores padrao")
        
        # 3. Verificar se tabela cenarios_empresas existe e está correta
        print()
        print("3. Verificando tabela cenarios_empresas...")
        
        check_table = """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'cenarios_empresas'
        ) as existe;
        """
        
        result = await session.execute(text(check_table))
        row = result.fetchone()
        
        if not row or not row.existe:
            print("  Criando tabela cenarios_empresas...")
            sql3 = """
            CREATE TABLE IF NOT EXISTS cenarios_empresas (
                cenario_id UUID NOT NULL,
                empresa_id UUID NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (cenario_id, empresa_id),
                CONSTRAINT fk_cenario FOREIGN KEY (cenario_id) 
                    REFERENCES cenarios(id) ON DELETE CASCADE,
                CONSTRAINT fk_empresa FOREIGN KEY (empresa_id) 
                    REFERENCES empresas(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_cenarios_empresas_cenario ON cenarios_empresas(cenario_id);
            CREATE INDEX IF NOT EXISTS idx_cenarios_empresas_empresa ON cenarios_empresas(empresa_id);
            """
            await execute_sql(session, sql3, "Criando tabela e indices")
        
        # 4. Migrar dados de empresa_id se existir
        print()
        print("4. Migrando dados de empresa_id...")
        
        sql4 = """
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'cenarios' AND column_name = 'empresa_id'
            ) THEN
                INSERT INTO cenarios_empresas (cenario_id, empresa_id, created_at)
                SELECT id, empresa_id, created_at
                FROM cenarios
                WHERE empresa_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM cenarios_empresas 
                    WHERE cenario_id = cenarios.id AND empresa_id = cenarios.empresa_id
                );
            END IF;
        END $$;
        """
        
        await execute_sql(session, sql4, "Migrando dados")
        
        # 5. Verificação final
        print()
        print("5. Verificando migracao...")
        
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
        
        print()
        print("=" * 60)
        if row and row.has_ano_inicio and row.has_cenarios_empresas:
            print("OK: Migracao concluida com sucesso!")
            print("   - Colunas de periodo flexivel: OK")
            print("   - Tabela de associacao empresas: OK")
            return True
        else:
            print("AVISO: Algumas alteracoes podem nao ter sido aplicadas.")
            print(f"   - ano_inicio existe: {row.has_ano_inicio if row else 'N/A'}")
            print(f"   - cenarios_empresas existe: {row.has_cenarios_empresas if row else 'N/A'}")
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







