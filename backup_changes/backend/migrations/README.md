# Migração do Schema de Cenários

Este diretório contém scripts de migração para atualizar o schema do banco de dados.

## ⚠️ IMPORTANTE: Banco de Dados

**Esta migração deve ser executada no banco PostgreSQL principal da aplicação:**

- **Banco:** `sig_db`
- **Host:** `localhost` (ou o configurado no seu `.env`)
- **Porta:** `5432`
- **Usuário:** `postgres` (ou o configurado no seu `.env`)

Este é o banco definido em `DATABASE_URL` no arquivo `backend/app/core/config.py`.

> **Nota:** Os outros bancos (CORPORERM e NW) são somente leitura e **NÃO** precisam desta migração.

## Migração: Período Flexível e Múltiplas Empresas por Cenário

### O que esta migração faz?

1. **Adiciona colunas de período flexível:**
   - `ano_inicio` - Ano inicial do período
   - `mes_inicio` - Mês inicial (1-12)
   - `ano_fim` - Ano final do período
   - `mes_fim` - Mês final (1-12)

2. **Cria tabela de associação many-to-many:**
   - `cenarios_empresas` - Permite associar múltiplas empresas a um cenário

3. **Migra dados existentes:**
   - Copia valores de `ano` para `ano_inicio` e `ano_fim`
   - Migra `empresa_id` (se existir) para a nova tabela de associação

### Como executar

#### Opção 1: Via psql (linha de comando)

```bash
# A partir do diretório raiz do projeto (c:\app_sig)
cd backend

# Execute o script diretamente
psql -U postgres -d sig_db -f migrations/migrate_cenarios_schema.sql

# OU conecte-se primeiro e depois execute
psql -U postgres -d sig_db
\i migrations/migrate_cenarios_schema.sql
\q
```

#### Opção 2: Via pgAdmin ou outra ferramenta gráfica

1. Abra o pgAdmin (ou sua ferramenta preferida)
2. Conecte-se ao banco `sig_db`
3. Abra o arquivo `migrations/migrate_cenarios_schema.sql`
4. Execute o script completo

#### Opção 3: Via Python (usando psycopg2)

```python
import psycopg2
from pathlib import Path

# Conecte-se ao banco
conn = psycopg2.connect(
    host="localhost",
    database="sig_db",
    user="postgres",
    password="postgres"
)

# Leia e execute o script
script_path = Path("backend/migrations/migrate_cenarios_schema.sql")
with open(script_path, "r", encoding="utf-8") as f:
    sql = f.read()

with conn.cursor() as cur:
    cur.execute(sql)
    conn.commit()

conn.close()
print("Migração concluída!")
```

### Verificação

Após executar a migração, você pode verificar se foi bem-sucedida:

```sql
-- Verificar se as colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cenarios' 
AND column_name IN ('ano_inicio', 'mes_inicio', 'ano_fim', 'mes_fim');

-- Verificar se a tabela de associação foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'cenarios_empresas';
```

### Reversão (Rollback)

Se precisar reverter a migração (após fazer backup!):

```sql
-- Remover tabela de associação
DROP TABLE IF EXISTS cenarios_empresas CASCADE;

-- Remover colunas novas (apenas se não houver dados importantes)
ALTER TABLE cenarios 
DROP COLUMN IF EXISTS ano_inicio,
DROP COLUMN IF EXISTS mes_inicio,
DROP COLUMN IF EXISTS ano_fim,
DROP COLUMN IF EXISTS mes_fim;
```

### Importante

- **Faça backup do banco de dados antes de executar a migração!**
- A migração é idempotente (pode ser executada múltiplas vezes sem problemas)
- Os dados existentes serão preservados e migrados automaticamente
- As colunas antigas (`ano`, `empresa_id`) não são removidas automaticamente para segurança

