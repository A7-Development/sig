# SIG - Sistema Integrado de Gestão

Sistema de gestão integrada para Call Center com ~1000 funcionários. Centraliza indicadores e métricas em uma plataforma única.

## Módulos

- **Controladoria** - Gestão financeira e indicadores
- **Planejamento** - Planejamento estratégico e operacional
- **Operações** - KPIs e métricas do call center
- **Recursos Humanos** - Gestão de pessoas
- **Jurídico** - Gestão jurídica e trabalhista

## Stack Tecnológica

### Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (estado global)
- React Query (cache de dados)

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy 2.0 (async)
- PostgreSQL
- JWT Authentication
- Alembic (migrations)

## Requisitos

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

## Configuração

### 1. Banco de Dados

Crie o banco de dados PostgreSQL:

```sql
CREATE DATABASE sig_db;
```

### 2. Backend

```bash
cd backend

# Criar ambiente virtual (opcional mas recomendado)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
# Edite o arquivo .env com suas configurações

# Rodar o servidor
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Rodar o servidor de desenvolvimento
npm run dev
```

## Acesso

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Documentação API: http://localhost:8000/docs

### Credenciais Padrão (Superadmin)

- Email: admin@sig.com
- Senha: admin123

**IMPORTANTE:** Altere essas credenciais em produção!

## Estrutura do Projeto

```
sig/
├── frontend/           # Next.js Application
│   ├── src/
│   │   ├── app/        # Páginas (App Router)
│   │   ├── components/ # Componentes React
│   │   ├── lib/        # Utilitários e API client
│   │   └── stores/     # Zustand stores
│   └── package.json
│
├── backend/            # FastAPI Application
│   ├── app/
│   │   ├── api/        # Endpoints da API
│   │   ├── core/       # Configurações e segurança
│   │   ├── db/         # Models e conexão DB
│   │   ├── schemas/    # Pydantic schemas
│   │   └── services/   # Lógica de negócio
│   └── requirements.txt
│
└── README.md
```

## Licença

Proprietary - Todos os direitos reservados.

