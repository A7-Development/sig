"""
Script para executar migrações de receitas
"""
import asyncio
from sqlalchemy import text
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal


async def run_migrations():
    async with AsyncSessionLocal() as db:
        try:
            # Criar tabela tipos_receita
            print("Criando tabela tipos_receita...")
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS tipos_receita (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    codigo VARCHAR(50) UNIQUE NOT NULL,
                    nome VARCHAR(200) NOT NULL,
                    descricao TEXT NULL,
                    categoria VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL',
                    conta_contabil_codigo VARCHAR(50) NULL,
                    conta_contabil_descricao VARCHAR(255) NULL,
                    ordem INTEGER DEFAULT 0,
                    ativo BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                )
            """))
            
            await db.execute(text("CREATE INDEX IF NOT EXISTS ix_tipos_receita_codigo ON tipos_receita(codigo)"))
            await db.execute(text("CREATE INDEX IF NOT EXISTS ix_tipos_receita_ativo ON tipos_receita(ativo)"))
            print("  -> tipos_receita criada")
            
            # Criar tabela receitas_cenario
            print("Criando tabela receitas_cenario...")
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS receitas_cenario (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
                    centro_custo_id UUID NOT NULL REFERENCES centros_custo(id) ON DELETE CASCADE,
                    tipo_receita_id UUID NOT NULL REFERENCES tipos_receita(id) ON DELETE RESTRICT,
                    tipo_calculo VARCHAR(20) NOT NULL DEFAULT 'FIXA_CC',
                    funcao_pa_id UUID NULL REFERENCES funcoes(id) ON DELETE SET NULL,
                    valor_fixo NUMERIC(15, 2) NULL,
                    valor_minimo_pa NUMERIC(15, 2) NULL,
                    valor_maximo_pa NUMERIC(15, 2) NULL,
                    descricao TEXT NULL,
                    ativo BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                )
            """))
            
            await db.execute(text("CREATE INDEX IF NOT EXISTS ix_receitas_cenario_cenario ON receitas_cenario(cenario_id)"))
            await db.execute(text("CREATE INDEX IF NOT EXISTS ix_receitas_cenario_cc ON receitas_cenario(centro_custo_id)"))
            print("  -> receitas_cenario criada")
            
            # Criar tabela receita_premissa_mes
            print("Criando tabela receita_premissa_mes...")
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS receita_premissa_mes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    receita_cenario_id UUID NOT NULL REFERENCES receitas_cenario(id) ON DELETE CASCADE,
                    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
                    ano INTEGER NOT NULL,
                    vopdu NUMERIC(10, 4) NULL DEFAULT 0,
                    indice_conversao NUMERIC(5, 4) NULL DEFAULT 0,
                    ticket_medio NUMERIC(15, 2) NULL DEFAULT 0,
                    fator NUMERIC(10, 4) NULL DEFAULT 1,
                    indice_estorno NUMERIC(5, 4) NULL DEFAULT 0,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                    CONSTRAINT uq_receita_premissa_mes UNIQUE (receita_cenario_id, mes, ano)
                )
            """))
            
            await db.execute(text("CREATE INDEX IF NOT EXISTS ix_receita_premissa_mes_receita ON receita_premissa_mes(receita_cenario_id)"))
            print("  -> receita_premissa_mes criada")
            
            await db.commit()
            print("\nMigracoes de receitas concluidas com sucesso!")
            
        except Exception as e:
            await db.rollback()
            print(f"Erro na migracao: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(run_migrations())




