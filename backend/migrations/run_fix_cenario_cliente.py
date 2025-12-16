"""
Script para corrigir FK da tabela cenario_cliente.
Execute: python -m migrations.run_fix_cenario_cliente
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
    """Executa a migração de correção."""
    
    # Pegar configuração do banco
    db_url = os.getenv("DATABASE_URL", "")
    
    if not db_url:
        print("[ERRO] DATABASE_URL não configurada")
        return False
    
    # Converter URL para formato asyncpg
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"Conectando ao banco de dados...")
    
    try:
        conn = await asyncpg.connect(db_url)
        
        print("Executando migração...")
        print("-" * 50)
        
        # 1. Remover tabelas antigas
        print("1. Removendo tabelas antigas...")
        await conn.execute("DROP TABLE IF EXISTS cenario_secao CASCADE")
        await conn.execute("DROP TABLE IF EXISTS cenario_cliente CASCADE")
        print("   OK - Tabelas antigas removidas")
        
        # 2. Criar cenario_cliente com FK correta
        print("2. Criando tabela cenario_cliente...")
        await conn.execute("""
            CREATE TABLE cenario_cliente (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cenario_empresa_id UUID NOT NULL,
                cliente_nw_codigo VARCHAR(50) NOT NULL,
                nome_cliente VARCHAR(255),
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_cenario_cliente_empresa FOREIGN KEY (cenario_empresa_id) 
                    REFERENCES cenarios_empresas(id) ON DELETE CASCADE,
                CONSTRAINT uq_cenario_empresa_cliente UNIQUE (cenario_empresa_id, cliente_nw_codigo)
            )
        """)
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_cenario_cliente_empresa ON cenario_cliente(cenario_empresa_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_cenario_cliente_codigo ON cenario_cliente(cliente_nw_codigo)")
        print("   OK - Tabela cenario_cliente criada com FK para cenarios_empresas")
        
        # 3. Criar cenario_secao
        print("3. Criando tabela cenario_secao...")
        await conn.execute("""
            CREATE TABLE cenario_secao (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cenario_cliente_id UUID NOT NULL,
                secao_id UUID NOT NULL,
                fator_pa NUMERIC(5, 2) DEFAULT 3.0,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_cenario_secao_cliente FOREIGN KEY (cenario_cliente_id) 
                    REFERENCES cenario_cliente(id) ON DELETE CASCADE,
                CONSTRAINT fk_cenario_secao_secao FOREIGN KEY (secao_id) 
                    REFERENCES secoes(id) ON DELETE CASCADE,
                CONSTRAINT uq_cenario_cliente_secao UNIQUE (cenario_cliente_id, secao_id)
            )
        """)
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_cenario_secao_cliente ON cenario_secao(cenario_cliente_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_cenario_secao_secao ON cenario_secao(secao_id)")
        print("   OK - Tabela cenario_secao criada")
        
        print("-" * 50)
        
        # Verificar resultado
        result = await conn.fetchrow("""
            SELECT 
                EXISTS(SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'cenario_cliente' 
                       AND column_name = 'cenario_empresa_id') as has_correct_fk
        """)
        
        if result['has_correct_fk']:
            print("[OK] Migração concluída com sucesso!")
            print("     FK cenario_cliente.cenario_empresa_id -> cenarios_empresas.id")
        else:
            print("[AVISO] Verificar estrutura da tabela cenario_cliente")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"[ERRO] Falha na migração: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    asyncio.run(run_migration())
