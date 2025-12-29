"""
CRUD de Cenários de Orçamento.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload, noload

from app.db.session import get_db
from app.db.models.orcamento import Cenario, QuadroPessoal, QuadroPessoalMes, CenarioEmpresa, FuncaoSpan, PremissaFuncaoMes, CenarioCliente, CenarioSecao, Secao, CentroCusto
from app.schemas.orcamento import (
    CenarioCreate, CenarioUpdate, CenarioResponse, CenarioComRelacionamentos,
    QuadroPessoalCreate, QuadroPessoalUpdate, QuadroPessoalResponse, QuadroPessoalComRelacionamentos,
    FuncaoSpanCreate, FuncaoSpanUpdate, FuncaoSpanResponse, FuncaoSpanComRelacionamentos,
    PremissaFuncaoMesCreate, PremissaFuncaoMesUpdate, PremissaFuncaoMesResponse, PremissaFuncaoMesComRelacionamentos,
    CenarioEmpresaCreate, CenarioEmpresaResponse, CenarioEmpresaComClientes,
    CenarioClienteCreate, CenarioClienteUpdate, CenarioClienteResponse, CenarioClienteComSecoes,
    CenarioSecaoCreate, CenarioSecaoUpdate, CenarioSecaoResponse
)
from app.services.calculo_custos import calcular_custos_cenario, calcular_overhead_ineficiencia
from app.services.capacity_planning import (
    calcular_quantidades_span, aplicar_spans_ao_quadro,
    aplicar_calculo_span, recalcular_spans_afetados, recalcular_spans_afetados_sem_commit
)

router = APIRouter(prefix="/cenarios", tags=["Cenários"])


# ============================================
# CENÁRIOS
# ============================================

@router.get("", response_model=List[CenarioComRelacionamentos])
async def list_cenarios(
    skip: int = 0,
    limit: int = 100,
    ano_inicio: Optional[int] = None,
    ano_fim: Optional[int] = None,
    empresa_id: Optional[UUID] = None,
    status: Optional[str] = None,
    ativo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os cenários."""
    try:
        # Verificar schema do banco consultando informações da tabela
        # Usar query SQL direta para verificar se as colunas existem
        schema_check = await db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' 
            AND column_name IN ('ano', 'ano_inicio', 'ano_fim')
        """))
        columns = [row[0] for row in schema_check.fetchall()]
        has_ano = 'ano' in columns
        has_ano_inicio = 'ano_inicio' in columns
        
        # Se não tem nenhum, assumir schema antigo
        if not has_ano and not has_ano_inicio:
            has_ano = True
        
        # Construir query baseada no schema disponível
        if has_ano_inicio:
            # Schema novo - usar campos novos com SQLAlchemy ORM
            query = select(Cenario)
            if ano_inicio:
                query = query.where(Cenario.ano_inicio >= ano_inicio)
            if ano_fim:
                query = query.where(Cenario.ano_fim <= ano_fim)
            if status:
                query = query.where(Cenario.status == status)
            if ativo is not None:
                query = query.where(Cenario.ativo == ativo)
            if empresa_id:
                try:
                    query = query.join(CenarioEmpresa).where(CenarioEmpresa.empresa_id == empresa_id)
                except Exception:
                    pass
            query = query.order_by(Cenario.ano_inicio.desc(), Cenario.codigo)
            query = query.offset(skip).limit(limit)
            
            # Carregar empresas relacionadas
            try:
                query = query.options(
                    selectinload(Cenario.empresas_rel).selectinload(CenarioEmpresa.empresa)
                )
            except Exception:
                pass
            
            result = await db.execute(query)
            cenarios = result.scalars().all()
            
            # Converter para o formato esperado (schema novo)
            resultado = []
            for c in cenarios:
                empresas_list = []
                try:
                    if hasattr(c, 'empresas_rel') and c.empresas_rel:
                        empresas_list = [rel.empresa for rel in c.empresas_rel if hasattr(rel, 'empresa') and rel.empresa]
                except Exception:
                    empresas_list = []
                
                resultado.append(
                    CenarioComRelacionamentos(
                        id=c.id,
                        codigo=c.codigo,
                        nome=c.nome,
                        descricao=c.descricao,
                        ano_inicio=c.ano_inicio,
                        mes_inicio=c.mes_inicio,
                        ano_fim=c.ano_fim,
                        mes_fim=c.mes_fim,
                        status=c.status,
                        versao=c.versao,
                        ativo=c.ativo,
                        created_at=c.created_at,
                        updated_at=c.updated_at,
                        empresas=empresas_list
                    )
                )
            
            return resultado
        else:
            # Schema antigo - usar query SQL direta para evitar erro do SQLAlchemy
            # Selecionar apenas campos que existem no schema antigo
            sql = """
                SELECT id, codigo, nome, descricao, empresa_id, ano, mes_inicio, mes_fim, 
                       status, versao, ativo, created_at, updated_at
                FROM cenarios 
                WHERE 1=1
            """
            params = {}
            if ano_inicio:
                sql += " AND ano >= :ano_inicio"
                params['ano_inicio'] = ano_inicio
            if ano_fim:
                sql += " AND ano <= :ano_fim"
                params['ano_fim'] = ano_fim
            if status:
                sql += " AND status = :status"
                params['status'] = status
            if ativo is not None:
                sql += " AND ativo = :ativo"
                params['ativo'] = ativo
            if empresa_id:
                sql += " AND empresa_id = :empresa_id"
                params['empresa_id'] = str(empresa_id)
            
            sql += " ORDER BY ano DESC, codigo LIMIT :limit OFFSET :offset"
            params['limit'] = limit
            params['offset'] = skip
            
            result = await db.execute(text(sql), params)
            rows = result.fetchall()
            
            # Converter rows para objetos Cenario manualmente
            cenarios = []
            col_names = ['id', 'codigo', 'nome', 'descricao', 'empresa_id', 'ano', 
                        'mes_inicio', 'mes_fim', 'status', 'versao', 'ativo', 
                        'created_at', 'updated_at']
            
            for row in rows:
                # Criar objeto Cenario a partir da row
                c = Cenario()
                # Mapear campos da row para o objeto
                for i, col_name in enumerate(col_names):
                    if i < len(row):
                        value = row[i]
                        if hasattr(c, col_name):
                            setattr(c, col_name, value)
                cenarios.append(c)
            
            # Pular para a conversão
            resultado = []
            for c in cenarios:
                empresas_list = []
                try:
                    if hasattr(c, 'empresas_rel') and c.empresas_rel:
                        empresas_list = [rel.empresa for rel in c.empresas_rel if hasattr(rel, 'empresa') and rel.empresa]
                except Exception:
                    empresas_list = []
                
                # Converter schema antigo para novo
                ano_antigo = getattr(c, 'ano', 2025)
                mes_inicio = getattr(c, 'mes_inicio', 1)
                mes_fim = getattr(c, 'mes_fim', 12)
                
                resultado.append(
                    CenarioComRelacionamentos(
                        id=c.id,
                        codigo=c.codigo,
                        nome=c.nome,
                        descricao=c.descricao,
                        ano_inicio=ano_antigo,
                        mes_inicio=mes_inicio,
                        ano_fim=ano_antigo,
                        mes_fim=mes_fim,
                        status=c.status,
                        versao=c.versao,
                        ativo=c.ativo,
                        created_at=c.created_at,
                        updated_at=c.updated_at,
                        empresas=empresas_list
                    )
                )
            
            return resultado
    except Exception as e:
        # Log do erro para debug
        import traceback
        error_msg = f"Erro ao listar cenários: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_msg
        )


@router.get("/{cenario_id}", response_model=CenarioComRelacionamentos)
async def get_cenario(cenario_id: UUID, db: AsyncSession = Depends(get_db)):
    """Busca um cenário por ID."""
    # Verificar schema do banco
    schema_check = await db.execute(
        text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
        """)
    )
    has_new_schema = schema_check.scalar_one_or_none() is not None
    
    if has_new_schema:
        # Schema novo - usar ORM normal
        query = select(Cenario).options(
            selectinload(Cenario.empresas_rel).selectinload(CenarioEmpresa.empresa),
            selectinload(Cenario.premissas),
        ).where(Cenario.id == cenario_id)
        result = await db.execute(query)
        cenario = result.scalar_one_or_none()
        
        if not cenario:
            raise HTTPException(status_code=404, detail="Cenário não encontrado")
        
        return CenarioComRelacionamentos(
            id=cenario.id,
            codigo=cenario.codigo,
            nome=cenario.nome,
            descricao=cenario.descricao,
            ano_inicio=cenario.ano_inicio,
            mes_inicio=cenario.mes_inicio,
            ano_fim=cenario.ano_fim,
            mes_fim=cenario.mes_fim,
            status=cenario.status,
            versao=cenario.versao,
            ativo=cenario.ativo,
            created_at=cenario.created_at,
            updated_at=cenario.updated_at,
            empresas=[rel.empresa for rel in cenario.empresas_rel]
        )
    else:
        # Schema antigo - usar query SQL direta
        result = await db.execute(
            text("""
                SELECT id, codigo, nome, descricao, ano, mes_inicio, mes_fim, 
                       status, versao, ativo, created_at, updated_at
                FROM cenarios 
                WHERE id = :cenario_id
            """),
            {"cenario_id": cenario_id}
        )
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Cenário não encontrado")
        
        # Buscar empresas relacionadas (se existir tabela de associação)
        empresas_list = []
        try:
            empresas_result = await db.execute(
                text("""
                    SELECT e.id, e.codigo, e.razao_social, e.nome_fantasia
                    FROM empresas e
                    JOIN cenarios_empresas ce ON ce.empresa_id = e.id
                    WHERE ce.cenario_id = :cenario_id
                """),
                {"cenario_id": cenario_id}
            )
            empresas_rows = empresas_result.fetchall()
            empresas_list = [
                type('Empresa', (), {
                    'id': r[0],
                    'codigo': r[1],
                    'razao_social': r[2],
                    'nome_fantasia': r[3]
                })() for r in empresas_rows
            ]
        except Exception:
            # Se não existe tabela de associação, tentar empresa_id direto
            try:
                empresas_result = await db.execute(
                    text("""
                        SELECT id, codigo, razao_social, nome_fantasia
                        FROM empresas
                        WHERE id = (SELECT empresa_id FROM cenarios WHERE id = :cenario_id)
                    """),
                    {"cenario_id": cenario_id}
                )
                empresa_row = empresas_result.fetchone()
                if empresa_row:
                    empresas_list = [type('Empresa', (), {
                        'id': empresa_row[0],
                        'codigo': empresa_row[1],
                        'razao_social': empresa_row[2],
                        'nome_fantasia': empresa_row[3]
                    })()]
            except Exception:
                empresas_list = []
        
        # Converter ano para ano_inicio e ano_fim
        ano = row[4] if row[4] else 2025
        return CenarioComRelacionamentos(
            id=row[0],
            codigo=row[1],
            nome=row[2],
            descricao=row[3],
            ano_inicio=ano,
            mes_inicio=row[5] if row[5] else 1,
            ano_fim=ano,
            mes_fim=row[6] if row[6] else 12,
            status=row[7],
            versao=row[8],
            ativo=row[9],
            created_at=row[10],
            updated_at=row[11],
            empresas=empresas_list
        )


async def gerar_codigo_unico(nome: str, ano_inicio: int, mes_inicio: int, db: AsyncSession) -> str:
    """Gera um código único para o cenário baseado no nome e período."""
    from datetime import datetime
    
    # Base do código: primeiras 3 letras do nome (maiúsculas) + ano + mês + timestamp
    base = ''.join([c.upper() for c in nome if c.isalnum()])[:3]
    if not base:
        base = "CEN"
    
    timestamp = datetime.utcnow().strftime("%H%M%S")
    codigo_base = f"{base}_{ano_inicio}{mes_inicio:02d}_{timestamp}"
    
    # Verificar se já existe e incrementar se necessário
    # Usar query SQL direta para evitar erro com campos novos
    codigo = codigo_base
    counter = 1
    while True:
        result = await db.execute(
            text("SELECT id FROM cenarios WHERE codigo = :codigo"),
            {"codigo": codigo}
        )
        if not result.fetchone():
            break
        codigo = f"{codigo_base}_{counter}"
        counter += 1
    
    return codigo


@router.post("", response_model=CenarioResponse)
async def create_cenario(data: CenarioCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo cenário com código gerado automaticamente."""
    # Verificar schema do banco antes de criar
    schema_check = await db.execute(
        text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
        """)
    )
    has_new_schema = schema_check.scalar_one_or_none() is not None
    
    if not has_new_schema:
        raise HTTPException(
            status_code=400, 
            detail=(
                "Criação de cenário requer migração do banco de dados. "
                "Execute o script SQL em 'backend/migrations/migrate_cenarios_schema.sql' "
                "para adicionar as colunas: ano_inicio, mes_inicio, ano_fim, mes_fim "
                "e a tabela cenarios_empresas. "
                "Veja 'backend/migrations/README.md' para instruções detalhadas."
            )
        )
    
    # Validar período
    if data.ano_fim < data.ano_inicio or (data.ano_fim == data.ano_inicio and data.mes_fim < data.mes_inicio):
        raise HTTPException(status_code=400, detail="Período final deve ser posterior ao inicial")
    
    # Gerar código único
    codigo = await gerar_codigo_unico(data.nome, data.ano_inicio, data.mes_inicio, db)
    
    # Criar cenário (sempre como RASCUNHO)
    cenario = Cenario(
        codigo=codigo,
        nome=data.nome,
        descricao=data.descricao,
        cliente_nw_codigo=data.cliente_nw_codigo if hasattr(data, 'cliente_nw_codigo') and data.cliente_nw_codigo else None,
        ano_inicio=data.ano_inicio,
        mes_inicio=data.mes_inicio,
        ano_fim=data.ano_fim,
        mes_fim=data.mes_fim,
        status="RASCUNHO",
        ativo=data.ativo
    )
    db.add(cenario)
    await db.flush()  # Para obter o ID
    
    # Associar empresas
    if data.empresa_ids:
        for empresa_id in data.empresa_ids:
            # Verificar se empresa existe
            from app.db.models.orcamento import Empresa
            empresa_result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
            if not empresa_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail=f"Empresa {empresa_id} não encontrada")
            
            # Verificar se tabela de associação existe
            try:
                rel = CenarioEmpresa(cenario_id=cenario.id, empresa_id=empresa_id)
                db.add(rel)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao associar empresa. Tabela cenarios_empresas pode não existir. Erro: {str(e)}"
                )
    
    await db.commit()
    # Refresh sem carregar relacionamentos que podem causar erro
    await db.refresh(cenario, attribute_names=[col.name for col in Cenario.__table__.columns])
    
    return cenario


@router.put("/{cenario_id}", response_model=CenarioResponse)
async def update_cenario(cenario_id: UUID, data: CenarioUpdate, db: AsyncSession = Depends(get_db)):
    """Atualiza um cenário."""
    # Verificar schema do banco
    schema_check = await db.execute(
        text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
        """)
    )
    has_new_schema = schema_check.scalar_one_or_none() is not None
    
    if has_new_schema:
        result = await db.execute(
            select(Cenario).options(selectinload(Cenario.empresas_rel))
            .where(Cenario.id == cenario_id)
        )
        cenario = result.scalar_one_or_none()
    else:
        # Schema antigo - não permitir atualização até migração
        raise HTTPException(
            status_code=400, 
            detail="Atualização de cenário requer migração do banco de dados para o novo schema"
        )
    
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "BLOQUEADO":
        raise HTTPException(status_code=400, detail="Cenário bloqueado não pode ser alterado")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Atualizar empresas se fornecido
    if 'empresa_ids' in update_data:
        empresa_ids = update_data.pop('empresa_ids')
        # Remover associações existentes
        existing_rels = await db.execute(
            select(CenarioEmpresa).where(CenarioEmpresa.cenario_id == cenario_id)
        )
        for rel in existing_rels.scalars().all():
            await db.delete(rel)
        # Criar novas associações
        from app.db.models.orcamento import Empresa
        for empresa_id in empresa_ids:
            empresa_result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
            if not empresa_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail=f"Empresa {empresa_id} não encontrada")
            rel = CenarioEmpresa(cenario_id=cenario.id, empresa_id=empresa_id)
            db.add(rel)
    
    # Atualizar outros campos
    for key, value in update_data.items():
        setattr(cenario, key, value)
    
    # Validar período se foi atualizado
    if 'ano_fim' in update_data or 'mes_fim' in update_data or 'ano_inicio' in update_data or 'mes_inicio' in update_data:
        ano_inicio = cenario.ano_inicio
        mes_inicio = cenario.mes_inicio
        ano_fim = cenario.ano_fim
        mes_fim = cenario.mes_fim
        if ano_fim < ano_inicio or (ano_fim == ano_inicio and mes_fim < mes_inicio):
            raise HTTPException(status_code=400, detail="Período final deve ser posterior ao inicial")
    
    await db.commit()
    await db.refresh(cenario)
    return cenario


@router.delete("/{cenario_id}")
async def delete_cenario(cenario_id: UUID, db: AsyncSession = Depends(get_db)):
    """Exclui um cenário."""
    # Verificar schema e buscar cenário
    schema_check = await db.execute(
        text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
        """)
    )
    has_new_schema = schema_check.scalar_one_or_none() is not None
    
    if has_new_schema:
        result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
        cenario = result.scalar_one_or_none()
    else:
        result = await db.execute(
            text("SELECT id, status FROM cenarios WHERE id = :cenario_id"),
            {"cenario_id": cenario_id}
        )
        row = result.fetchone()
        if row:
            cenario = type('Cenario', (), {'id': row[0], 'status': row[1]})()
        else:
            cenario = None
    
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "APROVADO":
        raise HTTPException(status_code=400, detail="Cenário aprovado não pode ser excluído")
    
    # Usar delete SQL direto para compatibilidade
    await db.execute(
        text("DELETE FROM cenarios WHERE id = :cenario_id"),
        {"cenario_id": cenario_id}
    )
    await db.commit()
    return {"message": "Cenário excluído com sucesso"}


@router.post("/{cenario_id}/duplicar", response_model=CenarioResponse)
async def duplicar_cenario(
    cenario_id: UUID,
    novo_codigo: str = Query(..., description="Código do novo cenário"),
    novo_nome: str = Query(..., description="Nome do novo cenário"),
    db: AsyncSession = Depends(get_db)
):
    """Duplica um cenário existente com todas as posições."""
    # Verificar schema do banco
    schema_check = await db.execute(
        text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
        """)
    )
    has_new_schema = schema_check.scalar_one_or_none() is not None
    
    if not has_new_schema:
        raise HTTPException(
            status_code=400, 
            detail="Duplicação de cenário requer migração do banco de dados para o novo schema"
        )
    
    # Buscar cenário original
    result = await db.execute(
        select(Cenario).options(
            selectinload(Cenario.empresas_rel),
            selectinload(Cenario.posicoes)
        ).where(Cenario.id == cenario_id)
    )
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Verificar se novo código já existe - usar query SQL direta
    existing_result = await db.execute(
        text("SELECT id FROM cenarios WHERE codigo = :codigo"),
        {"codigo": novo_codigo}
    )
    if existing_result.fetchone():
        raise HTTPException(status_code=400, detail="Código já existe")
    
    # Criar novo cenário
    novo_cenario = Cenario(
        codigo=novo_codigo,
        nome=novo_nome,
        descricao=f"Cópia de {original.nome}",
        ano_inicio=original.ano_inicio,
        mes_inicio=original.mes_inicio,
        ano_fim=original.ano_fim,
        mes_fim=original.mes_fim,
        status="RASCUNHO",
        versao=1
    )
    db.add(novo_cenario)
    await db.flush()
    
    # Duplicar associações de empresas
    for rel_orig in original.empresas_rel:
        nova_rel = CenarioEmpresa(cenario_id=novo_cenario.id, empresa_id=rel_orig.empresa_id)
        db.add(nova_rel)
    await db.commit()
    await db.refresh(novo_cenario)
    
    # Duplicar posições
    for posicao_orig in original.posicoes:
        nova_posicao = QuadroPessoal(
            cenario_id=novo_cenario.id,
            funcao_id=posicao_orig.funcao_id,
            secao_id=posicao_orig.secao_id,
            centro_custo_id=posicao_orig.centro_custo_id,
            tabela_salarial_id=posicao_orig.tabela_salarial_id,
            regime=posicao_orig.regime,
            qtd_jan=posicao_orig.qtd_jan,
            qtd_fev=posicao_orig.qtd_fev,
            qtd_mar=posicao_orig.qtd_mar,
            qtd_abr=posicao_orig.qtd_abr,
            qtd_mai=posicao_orig.qtd_mai,
            qtd_jun=posicao_orig.qtd_jun,
            qtd_jul=posicao_orig.qtd_jul,
            qtd_ago=posicao_orig.qtd_ago,
            qtd_set=posicao_orig.qtd_set,
            qtd_out=posicao_orig.qtd_out,
            qtd_nov=posicao_orig.qtd_nov,
            qtd_dez=posicao_orig.qtd_dez,
            salario_override=posicao_orig.salario_override,
            span=posicao_orig.span,
            observacao=posicao_orig.observacao
        )
        db.add(nova_posicao)
    
    await db.commit()
    await db.refresh(novo_cenario)
    return novo_cenario


# ============================================
# PREMISSAS
# ============================================

# ============================================
# QUADRO DE PESSOAL
# ============================================

@router.get("/{cenario_id}/quadro", response_model=List[QuadroPessoalComRelacionamentos])
async def list_quadro_pessoal(
    cenario_id: UUID,
    funcao_id: Optional[UUID] = None,
    secao_id: Optional[UUID] = None,
    cenario_secao_id: Optional[UUID] = None,
    centro_custo_id: Optional[UUID] = None,
    regime: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista posições do quadro de pessoal de um cenário."""
    # Desabilitar carregamento do relacionamento cenario para evitar erro com campos novos
    query = select(QuadroPessoal).options(
        noload(QuadroPessoal.cenario),  # Não carregar cenario para evitar erro com campos novos
        selectinload(QuadroPessoal.funcao),
        selectinload(QuadroPessoal.secao),
        selectinload(QuadroPessoal.centro_custo),
        selectinload(QuadroPessoal.quantidades_mes)  # Carregar dados multi-ano
    ).where(QuadroPessoal.cenario_id == cenario_id)
    
    if funcao_id:
        query = query.where(QuadroPessoal.funcao_id == funcao_id)
    if cenario_secao_id:
        query = query.where(QuadroPessoal.cenario_secao_id == cenario_secao_id)
    if secao_id:
        query = query.where(QuadroPessoal.secao_id == secao_id)
    if centro_custo_id:
        query = query.where(QuadroPessoal.centro_custo_id == centro_custo_id)
    if regime:
        query = query.where(QuadroPessoal.regime == regime)
    
    query = query.where(QuadroPessoal.ativo == True).order_by(QuadroPessoal.created_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{cenario_id}/quadro", response_model=QuadroPessoalResponse)
async def create_posicao(
    cenario_id: UUID,
    data: QuadroPessoalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona uma posição ao quadro de pessoal."""
    # Verificar se cenário existe - usar query compatível com schema antigo
    # Verificar se existe coluna ano_inicio para determinar schema
    schema_check = await db.execute(
        text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
        """)
    )
    has_new_schema = schema_check.scalar_one_or_none() is not None
    
    if has_new_schema:
        # Schema novo - usar ORM normal
        result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
        cenario = result.scalar_one_or_none()
    else:
        # Schema antigo - usar query SQL direta
        result = await db.execute(
            text("SELECT id, status FROM cenarios WHERE id = :cenario_id"),
            {"cenario_id": cenario_id}
        )
        row = result.fetchone()
        if row:
            cenario = type('Cenario', (), {'id': row[0], 'status': row[1]})()
        else:
            cenario = None
    
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "BLOQUEADO":
        raise HTTPException(status_code=400, detail="Cenário bloqueado não pode ser alterado")
    
    # Preparar dados para inserção
    data_dict = data.model_dump()
    
    # Converter span_funcoes_base_ids de List[UUID] para List[str] para o JSONB
    if data_dict.get('span_funcoes_base_ids'):
        data_dict['span_funcoes_base_ids'] = [str(uid) for uid in data_dict['span_funcoes_base_ids']]
    
    # Se tabela_salarial_id não foi fornecida, buscar automaticamente
    if not data_dict.get('tabela_salarial_id'):
        from app.db.models.orcamento import TabelaSalarial
        regime = data_dict.get('regime', 'CLT')
        funcao_id = data_dict.get('funcao_id')
        
        # Buscar tabela salarial ativa para esta função e regime
        ts_result = await db.execute(
            select(TabelaSalarial).where(
                TabelaSalarial.funcao_id == funcao_id,
                TabelaSalarial.regime == regime,
                TabelaSalarial.ativo == True
            ).limit(1)
        )
        tabela_salarial = ts_result.scalar_one_or_none()
        
        if tabela_salarial:
            data_dict['tabela_salarial_id'] = tabela_salarial.id
    
    posicao = QuadroPessoal(**data_dict)
    posicao.cenario_id = cenario_id
    db.add(posicao)
    await db.flush()  # Flush para obter o ID antes do cálculo
    
    # Se for tipo SPAN, calcular as quantidades automaticamente
    if posicao.tipo_calculo == 'span':
        await aplicar_calculo_span(db, posicao)
    
    # Invalidar custos calculados (pois o quadro mudou)
    await invalidar_custos_cenario(db, cenario_id, posicao.cenario_secao_id)
    
    await db.commit()
    # Refresh sem carregar relacionamento cenario para evitar erro com campos novos
    await db.refresh(posicao, attribute_names=[col.name for col in QuadroPessoal.__table__.columns])
    return posicao


@router.put("/{cenario_id}/quadro/{posicao_id}", response_model=QuadroPessoalResponse)
async def update_posicao(
    cenario_id: UUID,
    posicao_id: UUID,
    data: QuadroPessoalUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma posição do quadro de pessoal."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        result = await db.execute(
            select(QuadroPessoal).options(noload(QuadroPessoal.cenario)).where(
                QuadroPessoal.id == posicao_id,
                QuadroPessoal.cenario_id == cenario_id
            )
        )
        posicao = result.scalar_one_or_none()
        
        if not posicao:
            raise HTTPException(status_code=404, detail="Posição não encontrada")
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Extrair quantidades_mes se presente (novo formato multi-ano)
        quantidades_mes = update_data.pop('quantidades_mes', None)
        
        # Converter span_funcoes_base_ids de List[UUID] para List[str] para o JSONB
        if 'span_funcoes_base_ids' in update_data and update_data['span_funcoes_base_ids']:
            update_data['span_funcoes_base_ids'] = [str(uid) for uid in update_data['span_funcoes_base_ids']]
        
        # Verificar se quantidades foram alteradas (para recalcular SPANs)
        qtd_fields = [f'qtd_{m}' for m in ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']]
        qtd_changed = any(field in update_data for field in qtd_fields)
        
        # Se temos quantidades_mes, também consideramos como mudança
        if quantidades_mes:
            qtd_changed = True
        
        funcao_id = posicao.funcao_id
        cenario_secao_id = posicao.cenario_secao_id
        
        # Atualizar campos simples
        for key, value in update_data.items():
            setattr(posicao, key, value)
        
        # Processar quantidades_mes (nova estrutura multi-ano)
        if quantidades_mes:
            logger.info(f"[UPDATE QUADRO] Processando {len(quantidades_mes)} registros de quantidades_mes")
            
            # Remover registros existentes
            from sqlalchemy import delete
            await db.execute(
                delete(QuadroPessoalMes).where(QuadroPessoalMes.quadro_pessoal_id == posicao_id)
            )
            
            # Inserir novos registros
            for item in quantidades_mes:
                novo_mes = QuadroPessoalMes(
                    quadro_pessoal_id=posicao_id,
                    ano=item['ano'],
                    mes=item['mes'],
                    quantidade=item['quantidade']
                )
                db.add(novo_mes)
            
            # Também atualizar as colunas qtd_xxx para compatibilidade (primeiro ano)
            meses_keys = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
            primeiro_ano = min(item['ano'] for item in quantidades_mes)
            for item in quantidades_mes:
                if item['ano'] == primeiro_ano:
                    mes_key = meses_keys[item['mes'] - 1]
                    setattr(posicao, f'qtd_{mes_key}', item['quantidade'])
            
            # IMPORTANTE: Flush para que os dados estejam visíveis para o cálculo de SPAN
            await db.flush()
            logger.info(f"[UPDATE QUADRO] Flush realizado - dados de quantidades_mes disponíveis para SPAN")
        
        # Se quantidades foram alteradas e não é uma posição SPAN, recalcular SPANs afetados
        # Recalcula em TODAS as seções (não apenas na seção atual) pois um SPAN pode depender
        # de funções base de outras seções
        logger.info(f"[UPDATE QUADRO] qtd_changed={qtd_changed}, tipo_calculo={posicao.tipo_calculo}, funcao_id={funcao_id}")
        
        if qtd_changed and posicao.tipo_calculo != 'span':
            logger.info(f"[UPDATE QUADRO] Disparando recálculo de SPANs para funcao_id={funcao_id}")
            recalculadas = await recalcular_spans_afetados_sem_commit(db, cenario_id, funcao_id, None)
            logger.info(f"[UPDATE QUADRO] SPANs recalculadas: {recalculadas}")
        
        await db.commit()
        
        # Invalidar custos calculados (pois o quadro mudou)
        await invalidar_custos_cenario(db, cenario_id, posicao.cenario_secao_id)
        
        # Refresh sem carregar relacionamento cenario para evitar erro com campos novos
        await db.refresh(posicao, attribute_names=[col.name for col in QuadroPessoal.__table__.columns])
        return posicao
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar posição: {str(e)}")


@router.delete("/{cenario_id}/quadro/{posicao_id}")
async def delete_posicao(
    cenario_id: UUID,
    posicao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove uma posição do quadro de pessoal."""
    result = await db.execute(
        select(QuadroPessoal).options(noload(QuadroPessoal.cenario)).where(
            QuadroPessoal.id == posicao_id,
            QuadroPessoal.cenario_id == cenario_id
        )
    )
    posicao = result.scalar_one_or_none()
    
    if not posicao:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    
    # Guardar dados antes de deletar
    cenario_secao_id = posicao.cenario_secao_id
    funcao_id = posicao.funcao_id
    
    # Remover premissas associadas a esta posição
    from sqlalchemy import delete as sql_delete
    stmt_premissas = sql_delete(PremissaFuncaoMes).where(
        PremissaFuncaoMes.cenario_id == cenario_id,
        PremissaFuncaoMes.cenario_secao_id == cenario_secao_id,
        PremissaFuncaoMes.funcao_id == funcao_id
    )
    await db.execute(stmt_premissas)
    
    # Remover a posição
    await db.delete(posicao)
    
    # Invalidar custos calculados (pois o quadro mudou)
    await invalidar_custos_cenario(db, cenario_id, cenario_secao_id)
    
    await db.commit()
    return {"message": "Posição e premissas excluídas com sucesso"}


# ============================================
# UTILITÁRIOS INTERNOS
# ============================================

async def invalidar_custos_cenario(db: AsyncSession, cenario_id: UUID, cenario_secao_id: Optional[UUID] = None):
    """
    Invalida (remove) os custos calculados de um cenário.
    Deve ser chamado quando houver mudanças que afetam o cálculo de custos.
    """
    from sqlalchemy import delete
    from app.db.models.orcamento import CustoCalculado
    
    stmt = delete(CustoCalculado).where(CustoCalculado.cenario_id == cenario_id)
    if cenario_secao_id:
        stmt = stmt.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    
    await db.execute(stmt)


# ============================================
# CÁLCULOS
# ============================================

@router.get("/{cenario_id}/calcular-custos")
async def get_custos_cenario(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula os custos totais de um cenário.
    Retorna salários, benefícios, encargos e provisões por mês.
    """
    try:
        resumo = await calcular_custos_cenario(db, cenario_id)
        return resumo.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no cálculo: {str(e)}")


@router.get("/{cenario_id}/calcular-overhead")
async def get_overhead_cenario(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula o overhead necessário para cobrir ineficiências.
    Considera absenteísmo, turnover e férias.
    """
    try:
        resultado = await calcular_overhead_ineficiencia(db, cenario_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no cálculo: {str(e)}")


# ============================================
# FUNÇÃO SPAN (Cálculo Automático de Quantidades)
# ============================================

@router.get("/{cenario_id}/spans", response_model=List[FuncaoSpanComRelacionamentos])
async def list_spans(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Lista spans configurados para um cenário."""
    result = await db.execute(
        select(FuncaoSpan)
        .options(selectinload(FuncaoSpan.funcao))
        .where(FuncaoSpan.cenario_id == cenario_id, FuncaoSpan.ativo == True)
        .order_by(FuncaoSpan.created_at)
    )
    spans = result.scalars().all()
    return spans


@router.post("/{cenario_id}/spans", response_model=FuncaoSpanResponse)
async def create_span(
    cenario_id: UUID,
    data: FuncaoSpanCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma configuração de span para cálculo automático."""
    # Verificar se cenário existe
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Verificar se função existe
    from app.db.models.orcamento import Funcao
    funcao_result = await db.execute(select(Funcao).where(Funcao.id == data.funcao_id))
    if not funcao_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Função não encontrada")
    
    # Verificar se funções base existem
    funcoes_base_result = await db.execute(
        select(Funcao).where(Funcao.id.in_(data.funcoes_base_ids))
    )
    funcoes_base = funcoes_base_result.scalars().all()
    if len(funcoes_base) != len(data.funcoes_base_ids):
        raise HTTPException(status_code=400, detail="Uma ou mais funções base não encontradas")
    
    # Verificar se já existe span para esta função neste cenário
    existing = await db.execute(
        select(FuncaoSpan).where(
            FuncaoSpan.cenario_id == cenario_id,
            FuncaoSpan.funcao_id == data.funcao_id,
            FuncaoSpan.ativo == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um span configurado para esta função neste cenário")
    
    span = FuncaoSpan(
        cenario_id=cenario_id,
        funcao_id=data.funcao_id,
        funcoes_base_ids=data.funcoes_base_ids,  # JSON será serializado automaticamente
        span_ratio=data.span_ratio,
        ativo=data.ativo
    )
    db.add(span)
    await db.commit()
    await db.refresh(span)
    return span


@router.put("/{cenario_id}/spans/{span_id}", response_model=FuncaoSpanResponse)
async def update_span(
    cenario_id: UUID,
    span_id: UUID,
    data: FuncaoSpanUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma configuração de span."""
    result = await db.execute(
        select(FuncaoSpan).where(
            FuncaoSpan.id == span_id,
            FuncaoSpan.cenario_id == cenario_id
        )
    )
    span = result.scalar_one_or_none()
    if not span:
        raise HTTPException(status_code=404, detail="Span não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Se atualizando funções base, verificar se existem
    if 'funcoes_base_ids' in update_data:
        from app.db.models.orcamento import Funcao
        funcoes_base_result = await db.execute(
            select(Funcao).where(Funcao.id.in_(update_data['funcoes_base_ids']))
        )
        funcoes_base = funcoes_base_result.scalars().all()
        if len(funcoes_base) != len(update_data['funcoes_base_ids']):
            raise HTTPException(status_code=400, detail="Uma ou mais funções base não encontradas")
    
    for key, value in update_data.items():
        setattr(span, key, value)
    
    await db.commit()
    await db.refresh(span)
    return span


@router.delete("/{cenario_id}/spans/{span_id}")
async def delete_span(
    cenario_id: UUID,
    span_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove uma configuração de span (soft delete)."""
    result = await db.execute(
        select(FuncaoSpan).where(
            FuncaoSpan.id == span_id,
            FuncaoSpan.cenario_id == cenario_id
        )
    )
    span = result.scalar_one_or_none()
    if not span:
        raise HTTPException(status_code=404, detail="Span não encontrado")
    
    span.ativo = False
    await db.commit()
    return {"message": "Span removido com sucesso"}


@router.post("/{cenario_id}/calcular-spans")
async def calcular_spans(
    cenario_id: UUID,
    aplicar: bool = Query(False, description="Se True, aplica os cálculos ao quadro de pessoal"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula quantidades baseadas em spans configurados.
    Se aplicar=True, atualiza o quadro de pessoal com as quantidades calculadas.
    """
    # Verificar se cenário existe
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if aplicar:
        # Aplicar spans ao quadro
        resultado = await aplicar_spans_ao_quadro(db, cenario_id)
        return {
            "aplicado": True,
            **resultado
        }
    else:
        # Apenas calcular (sem aplicar)
        quantidades = await calcular_quantidades_span(db, cenario_id)
        return {
            "aplicado": False,
            "quantidades": quantidades,
            "total_funcoes": len(set(k.split('_')[0] for k in quantidades.keys())),
            "total_meses": len(quantidades)
        }


# ============================================
# PREMISSAS POR FUNÇÃO E MÊS
# ============================================

@router.get("/{cenario_id}/premissas-funcao", response_model=List[PremissaFuncaoMesComRelacionamentos])
async def list_premissas_funcao(
    cenario_id: UUID,
    funcao_id: Optional[UUID] = None,
    cenario_secao_id: Optional[UUID] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista premissas por função e mês de um cenário."""
    query = select(PremissaFuncaoMes).options(
        selectinload(PremissaFuncaoMes.funcao)
    ).where(PremissaFuncaoMes.cenario_id == cenario_id)
    
    if funcao_id:
        query = query.where(PremissaFuncaoMes.funcao_id == funcao_id)
    if cenario_secao_id:
        query = query.where(PremissaFuncaoMes.cenario_secao_id == cenario_secao_id)
    if mes:
        query = query.where(PremissaFuncaoMes.mes == mes)
    if ano:
        query = query.where(PremissaFuncaoMes.ano == ano)
    
    query = query.order_by(PremissaFuncaoMes.ano, PremissaFuncaoMes.mes, PremissaFuncaoMes.funcao_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{cenario_id}/premissas-funcao", response_model=PremissaFuncaoMesResponse)
async def create_premissa_funcao(
    cenario_id: UUID,
    data: PremissaFuncaoMesCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria ou atualiza uma premissa por função e mês."""
    # Verificar se cenário existe
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Verificar se função existe
    from app.db.models.orcamento import Funcao
    funcao_result = await db.execute(select(Funcao).where(Funcao.id == data.funcao_id))
    if not funcao_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Função não encontrada")
    
    # Verificar se já existe (upsert) - incluindo cenario_secao_id na verificação
    query = select(PremissaFuncaoMes).where(
        PremissaFuncaoMes.cenario_id == cenario_id,
        PremissaFuncaoMes.funcao_id == data.funcao_id,
        PremissaFuncaoMes.mes == data.mes,
        PremissaFuncaoMes.ano == data.ano
    )
    if data.cenario_secao_id:
        query = query.where(PremissaFuncaoMes.cenario_secao_id == data.cenario_secao_id)
    else:
        query = query.where(PremissaFuncaoMes.cenario_secao_id.is_(None))
    
    existing = await db.execute(query)
    premissa = existing.scalar_one_or_none()
    
    if premissa:
        # Atualizar existente
        update_data = data.model_dump(exclude={'cenario_id', 'funcao_id', 'mes', 'ano', 'cenario_secao_id'})
        for key, value in update_data.items():
            setattr(premissa, key, value)
    else:
        # Criar nova
        premissa = PremissaFuncaoMes(**data.model_dump())
        db.add(premissa)
    
    await db.commit()
    await db.refresh(premissa)
    return premissa


@router.put("/{cenario_id}/premissas-funcao/{premissa_id}", response_model=PremissaFuncaoMesResponse)
async def update_premissa_funcao(
    cenario_id: UUID,
    premissa_id: UUID,
    data: PremissaFuncaoMesUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma premissa por função e mês."""
    result = await db.execute(
        select(PremissaFuncaoMes).where(
            PremissaFuncaoMes.id == premissa_id,
            PremissaFuncaoMes.cenario_id == cenario_id
        )
    )
    premissa = result.scalar_one_or_none()
    if not premissa:
        raise HTTPException(status_code=404, detail="Premissa não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(premissa, key, value)
    
    await db.commit()
    await db.refresh(premissa)
    return premissa


@router.post("/{cenario_id}/premissas-funcao/bulk", response_model=List[PremissaFuncaoMesResponse])
async def bulk_premissas_funcao(
    cenario_id: UUID,
    premissas: List[PremissaFuncaoMesCreate],
    db: AsyncSession = Depends(get_db)
):
    """Cria ou atualiza múltiplas premissas por função e mês."""
    # Verificar se cenário existe
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    from app.db.models.orcamento import Funcao, CenarioSecao
    resultados = []
    
    for data in premissas:
        # Verificar se função existe
        funcao_result = await db.execute(select(Funcao).where(Funcao.id == data.funcao_id))
        if not funcao_result.scalar_one_or_none():
            continue  # Pular se função não existe
        
        # Verificar se cenario_secao_id existe (se fornecido)
        if data.cenario_secao_id:
            secao_result = await db.execute(
                select(CenarioSecao).where(CenarioSecao.id == data.cenario_secao_id)
            )
            if not secao_result.scalar_one_or_none():
                continue  # Pular se seção não existe (foi excluída)
        
        # Verificar se já existe (incluindo cenario_secao_id)
        query = select(PremissaFuncaoMes).where(
            PremissaFuncaoMes.cenario_id == cenario_id,
            PremissaFuncaoMes.funcao_id == data.funcao_id,
            PremissaFuncaoMes.mes == data.mes,
            PremissaFuncaoMes.ano == data.ano
        )
        if data.cenario_secao_id:
            query = query.where(PremissaFuncaoMes.cenario_secao_id == data.cenario_secao_id)
        else:
            query = query.where(PremissaFuncaoMes.cenario_secao_id.is_(None))
        
        existing = await db.execute(query)
        premissa = existing.scalar_one_or_none()
        
        if premissa:
            # Atualizar
            update_data = data.model_dump(exclude={'cenario_id', 'funcao_id', 'mes', 'ano', 'cenario_secao_id'})
            for key, value in update_data.items():
                setattr(premissa, key, value)
        else:
            # Criar
            premissa = PremissaFuncaoMes(**data.model_dump())
            db.add(premissa)
        
        resultados.append(premissa)
    
    # Invalidar custos calculados (pois as premissas mudaram)
    # Invalida todo o cenário já que as premissas afetam todos os cálculos
    await invalidar_custos_cenario(db, cenario_id)
    
    await db.commit()
    for premissa in resultados:
        await db.refresh(premissa)
    
    return resultados


@router.delete("/{cenario_id}/premissas-funcao/{premissa_id}")
async def delete_premissa_funcao(
    cenario_id: UUID,
    premissa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui uma premissa por função e mês."""
    result = await db.execute(
        select(PremissaFuncaoMes).where(
            PremissaFuncaoMes.id == premissa_id,
            PremissaFuncaoMes.cenario_id == cenario_id
        )
    )
    premissa = result.scalar_one_or_none()
    if not premissa:
        raise HTTPException(status_code=404, detail="Premissa não encontrada")
    
    await db.delete(premissa)
    await db.commit()
    return {"message": "Premissa excluída com sucesso"}


# ============================================
# EMPRESAS DO CENÁRIO (Hierarquia Master-Detail)
# Cenário > Empresa > Cliente > Seção
# ============================================

@router.get("/{cenario_id}/empresas", response_model=List[CenarioEmpresaComClientes])
async def list_empresas_cenario(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Lista as empresas do cenário com clientes e seções (estrutura hierárquica completa)."""
    # Verificar se cenário existe
    cenario_result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    if not cenario_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    result = await db.execute(
        select(CenarioEmpresa)
        .options(
            selectinload(CenarioEmpresa.empresa),
            selectinload(CenarioEmpresa.clientes)
            .selectinload(CenarioCliente.secoes)
            .selectinload(CenarioSecao.secao)
        )
        .where(CenarioEmpresa.cenario_id == cenario_id)
        .order_by(CenarioEmpresa.created_at)
    )
    return result.scalars().all()


@router.post("/{cenario_id}/empresas", response_model=CenarioEmpresaResponse)
async def add_empresa_cenario(
    cenario_id: UUID,
    data: CenarioEmpresaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona uma empresa ao cenário."""
    # Verificar se cenário existe
    cenario_result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = cenario_result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "BLOQUEADO":
        raise HTTPException(status_code=400, detail="Cenário bloqueado não pode ser alterado")
    
    # Verificar se empresa já existe no cenário
    existing = await db.execute(
        select(CenarioEmpresa).where(
            CenarioEmpresa.cenario_id == cenario_id,
            CenarioEmpresa.empresa_id == data.empresa_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Empresa já existe neste cenário")
    
    cenario_empresa = CenarioEmpresa(
        cenario_id=cenario_id,
        empresa_id=data.empresa_id
    )
    db.add(cenario_empresa)
    await db.commit()
    await db.refresh(cenario_empresa)
    return cenario_empresa


@router.delete("/{cenario_id}/empresas/{cenario_empresa_id}")
async def delete_empresa_cenario(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove uma empresa do cenário (e todos os clientes/seções associados)."""
    result = await db.execute(
        select(CenarioEmpresa).where(
            CenarioEmpresa.id == cenario_empresa_id,
            CenarioEmpresa.cenario_id == cenario_id
        )
    )
    cenario_empresa = result.scalar_one_or_none()
    if not cenario_empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada no cenário")
    
    await db.delete(cenario_empresa)
    await db.commit()
    return {"message": "Empresa removida do cenário com sucesso"}


# ============================================
# CLIENTES DA EMPRESA (CenarioCliente)
# ============================================

@router.post("/{cenario_id}/empresas/{cenario_empresa_id}/clientes", response_model=CenarioClienteResponse)
async def add_cliente_empresa(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    data: CenarioClienteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona um cliente a uma empresa do cenário."""
    # Verificar se empresa existe no cenário
    empresa_result = await db.execute(
        select(CenarioEmpresa).where(
            CenarioEmpresa.id == cenario_empresa_id,
            CenarioEmpresa.cenario_id == cenario_id
        )
    )
    cenario_empresa = empresa_result.scalar_one_or_none()
    if not cenario_empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada no cenário")
    
    # Verificar se cliente já existe nesta empresa
    existing = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.cenario_empresa_id == cenario_empresa_id,
            CenarioCliente.cliente_nw_codigo == data.cliente_nw_codigo,
            CenarioCliente.ativo == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cliente já existe nesta empresa")
    
    cliente = CenarioCliente(
        cenario_empresa_id=cenario_empresa_id,
        cliente_nw_codigo=data.cliente_nw_codigo,
        nome_cliente=data.nome_cliente
    )
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cenario_id}/empresas/{cenario_empresa_id}/clientes/{cliente_id}")
async def delete_cliente_empresa(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    cliente_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove um cliente da empresa (e suas seções, quadro e premissas em cascata)."""
    result = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.id == cliente_id,
            CenarioCliente.cenario_empresa_id == cenario_empresa_id
        )
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado na empresa")
    
    # Delete físico - remove completamente (CASCADE remove seções, quadro, premissas e spans)
    await db.delete(cliente)
    await db.commit()
    return {"message": "Cliente e todos os dados relacionados removidos com sucesso"}


# ============================================
# SEÇÕES DO CLIENTE (CenarioSecao)
# ============================================

@router.post("/{cenario_id}/empresas/{cenario_empresa_id}/clientes/{cliente_id}/secoes", response_model=CenarioSecaoResponse)
async def add_secao_cliente(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    cliente_id: UUID,
    data: CenarioSecaoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona uma seção a um cliente."""
    # Verificar se cliente existe na empresa
    cliente_result = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.id == cliente_id,
            CenarioCliente.cenario_empresa_id == cenario_empresa_id,
            CenarioCliente.ativo == True
        )
    )
    cliente = cliente_result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado na empresa")
    
    # Verificar se seção existe
    secao_result = await db.execute(select(Secao).where(Secao.id == data.secao_id))
    if not secao_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Seção não encontrada")
    
    # Verificar se seção já está associada a este cliente
    existing = await db.execute(
        select(CenarioSecao).where(
            CenarioSecao.cenario_cliente_id == cliente_id,
            CenarioSecao.secao_id == data.secao_id,
            CenarioSecao.ativo == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Seção já está associada a este cliente")
    
    cenario_secao = CenarioSecao(
        cenario_cliente_id=cliente_id,
        secao_id=data.secao_id
    )
    db.add(cenario_secao)
    await db.commit()
    await db.refresh(cenario_secao)
    
    # Carregar relacionamento para retorno
    await db.refresh(cenario_secao, attribute_names=['secao'])
    return cenario_secao


@router.delete("/{cenario_id}/empresas/{cenario_empresa_id}/clientes/{cliente_id}/secoes/{secao_id}")
async def delete_secao_cliente(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    cliente_id: UUID,
    secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove uma seção de um cliente."""
    # Verificar se cliente existe na empresa
    cliente_result = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.id == cliente_id,
            CenarioCliente.cenario_empresa_id == cenario_empresa_id
        )
    )
    if not cliente_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado na empresa")
    
    # Buscar a seção
    result = await db.execute(
        select(CenarioSecao).where(
            CenarioSecao.id == secao_id,
            CenarioSecao.cenario_cliente_id == cliente_id
        )
    )
    cenario_secao = result.scalar_one_or_none()
    if not cenario_secao:
        raise HTTPException(status_code=404, detail="Seção não encontrada")
    
    # Delete físico - remove completamente (CASCADE remove quadro, premissas e spans)
    await db.delete(cenario_secao)
    await db.commit()
    return {"message": "Seção e todos os dados relacionados removidos com sucesso"}


# ============================================
# SEÇÕES DA EMPRESA - NOVA HIERARQUIA SIMPLIFICADA
# Empresa -> Seção (sem passar por Cliente)
# ============================================

@router.get("/{cenario_id}/empresas/{cenario_empresa_id}/secoes", response_model=List[CenarioSecaoResponse])
async def listar_secoes_empresa(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    apenas_ativas: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista seções diretamente associadas a uma empresa do cenário.
    NOVA HIERARQUIA: Cenário -> Empresa -> Seção (representa Cliente)
    """
    query = select(CenarioSecao).where(
        CenarioSecao.cenario_empresa_id == cenario_empresa_id
    ).options(selectinload(CenarioSecao.secao))
    
    if apenas_ativas:
        query = query.where(CenarioSecao.ativo == True)
    
    result = await db.execute(query)
    secoes = result.scalars().all()
    
    # Converter para response schema
    from app.schemas.orcamento import CenarioSecaoResponse, SecaoSimples
    
    response = []
    for cs in secoes:
        secao_simples = None
        if cs.secao:
            secao_simples = SecaoSimples(
                id=cs.secao.id,
                codigo=cs.secao.codigo,
                nome=cs.secao.nome
            )
        
        response.append(CenarioSecaoResponse(
            id=cs.id,
            cenario_cliente_id=cs.cenario_cliente_id,
            cenario_empresa_id=cs.cenario_empresa_id,
            secao_id=cs.secao_id,
            ativo=cs.ativo,
            created_at=cs.created_at,
            updated_at=cs.updated_at,
            secao=secao_simples,
            is_corporativo=cs.is_corporativo
        ))
    
    return response


@router.post("/{cenario_id}/empresas/{cenario_empresa_id}/secoes", response_model=CenarioSecaoResponse)
async def adicionar_secao_empresa(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    data: CenarioSecaoCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Adiciona uma seção diretamente a uma empresa do cenário.
    NOVA HIERARQUIA: Cenário -> Empresa -> Seção (representa Cliente)
    A Seção agora representa o "Cliente" (ex: CLARO, VIVO, CORPORATIVO).
    """
    # Verificar se empresa existe no cenário
    empresa_result = await db.execute(
        select(CenarioEmpresa).where(
            CenarioEmpresa.id == cenario_empresa_id,
            CenarioEmpresa.cenario_id == cenario_id
        )
    )
    empresa = empresa_result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada no cenário")
    
    # Verificar se seção existe
    secao_result = await db.execute(select(Secao).where(Secao.id == data.secao_id))
    secao = secao_result.scalar_one_or_none()
    if not secao:
        raise HTTPException(status_code=404, detail="Seção não encontrada")
    
    # Verificar se seção já está associada a esta empresa
    existing = await db.execute(
        select(CenarioSecao).where(
            CenarioSecao.cenario_empresa_id == cenario_empresa_id,
            CenarioSecao.secao_id == data.secao_id,
            CenarioSecao.ativo == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Seção já está associada a esta empresa")
    
    cenario_secao = CenarioSecao(
        cenario_empresa_id=cenario_empresa_id,
        secao_id=data.secao_id
    )
    db.add(cenario_secao)
    await db.commit()
    await db.refresh(cenario_secao)
    
    # Carregar relacionamento para retorno
    await db.refresh(cenario_secao, attribute_names=['secao'])
    
    # Converter para response schema
    from app.schemas.orcamento import CenarioSecaoResponse, SecaoSimples
    
    secao_simples = None
    if cenario_secao.secao:
        secao_simples = SecaoSimples(
            id=cenario_secao.secao.id,
            codigo=cenario_secao.secao.codigo,
            nome=cenario_secao.secao.nome
        )
    
    return CenarioSecaoResponse(
        id=cenario_secao.id,
        cenario_cliente_id=cenario_secao.cenario_cliente_id,
        cenario_empresa_id=cenario_secao.cenario_empresa_id,
        secao_id=cenario_secao.secao_id,
        ativo=cenario_secao.ativo,
        created_at=cenario_secao.created_at,
        updated_at=cenario_secao.updated_at,
        secao=secao_simples,
        is_corporativo=cenario_secao.is_corporativo
    )


@router.delete("/{cenario_id}/empresas/{cenario_empresa_id}/secoes/{cenario_secao_id}")
async def remover_secao_empresa(
    cenario_id: UUID,
    cenario_empresa_id: UUID,
    cenario_secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Remove uma seção de uma empresa do cenário.
    NOTA: Remove também todos os dados relacionados (quadro pessoal, premissas, spans).
    """
    # Buscar a seção
    result = await db.execute(
        select(CenarioSecao).where(
            CenarioSecao.id == cenario_secao_id,
            CenarioSecao.cenario_empresa_id == cenario_empresa_id
        )
    )
    cenario_secao = result.scalar_one_or_none()
    if not cenario_secao:
        raise HTTPException(status_code=404, detail="Seção não encontrada na empresa")
    
    # Delete físico - remove completamente (CASCADE remove quadro, premissas e spans)
    await db.delete(cenario_secao)
    await db.commit()
    return {"message": "Seção e todos os dados relacionados removidos com sucesso"}


# ============================================
# VALIDAÇÃO DE CENTRO DE CUSTO vs SEÇÃO
# ============================================

def validar_cc_para_secao(secao: Secao, centro_custo: CentroCusto) -> tuple[bool, str]:
    """
    Valida se um Centro de Custo pode ser usado com uma Seção.
    
    Regras:
    - Se Seção é CORPORATIVO -> só pode usar CC tipo POOL
    - Se Seção não é CORPORATIVO -> só pode usar CC tipo OPERACIONAL
    
    Retorna: (is_valid, mensagem_erro)
    """
    # Verificar se seção é corporativo (por código ou nome)
    codigo_upper = (secao.codigo or "").upper()
    nome_upper = (secao.nome or "").upper()
    is_corporativo = "CORPORATIVO" in codigo_upper or "CORPORATIVO" in nome_upper
    
    # Verificar tipo do CC
    cc_tipo = (centro_custo.tipo or "").upper()
    is_pool = cc_tipo == "POOL"
    is_operacional = cc_tipo in ["OPERACIONAL", "ADMINISTRATIVO", "OVERHEAD"]
    
    if is_corporativo:
        if not is_pool:
            return False, f"Seção CORPORATIVO só pode usar Centro de Custo tipo POOL. CC '{centro_custo.nome}' é tipo '{cc_tipo}'."
        return True, ""
    else:
        if is_pool:
            return False, f"Seção '{secao.nome}' não pode usar Centro de Custo tipo POOL. Use um CC tipo OPERACIONAL."
        return True, ""


@router.post("/{cenario_id}/validar-cc-secao")
async def validar_centro_custo_secao(
    cenario_id: UUID,
    secao_id: UUID,
    centro_custo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Valida se um Centro de Custo pode ser usado com uma Seção.
    
    Regras:
    - CORPORATIVO → só CC tipo POOL
    - Outras seções → só CC tipo OPERACIONAL
    """
    # Buscar seção
    secao_result = await db.execute(select(Secao).where(Secao.id == secao_id))
    secao = secao_result.scalar_one_or_none()
    if not secao:
        raise HTTPException(status_code=404, detail="Seção não encontrada")
    
    # Buscar centro de custo
    cc_result = await db.execute(select(CentroCusto).where(CentroCusto.id == centro_custo_id))
    centro_custo = cc_result.scalar_one_or_none()
    if not centro_custo:
        raise HTTPException(status_code=404, detail="Centro de Custo não encontrado")
    
    is_valid, mensagem = validar_cc_para_secao(secao, centro_custo)
    
    return {
        "valido": is_valid,
        "mensagem": mensagem,
        "secao": {
            "id": str(secao.id),
            "codigo": secao.codigo,
            "nome": secao.nome,
            "is_corporativo": "CORPORATIVO" in (secao.codigo or "").upper() or "CORPORATIVO" in (secao.nome or "").upper()
        },
        "centro_custo": {
            "id": str(centro_custo.id),
            "codigo": centro_custo.codigo,
            "nome": centro_custo.nome,
            "tipo": centro_custo.tipo
        }
    }


@router.get("/{cenario_id}/centros-custo-disponiveis")
async def listar_centros_custo_para_secao(
    cenario_id: UUID,
    cenario_secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista os Centros de Custo disponíveis para uma Seção.
    Filtra automaticamente com base no tipo da seção:
    - CORPORATIVO → apenas CC tipo POOL
    - Outras seções → apenas CC tipo OPERACIONAL
    """
    # Buscar cenário seção com a seção
    cs_result = await db.execute(
        select(CenarioSecao)
        .where(CenarioSecao.id == cenario_secao_id)
        .options(selectinload(CenarioSecao.secao))
    )
    cenario_secao = cs_result.scalar_one_or_none()
    if not cenario_secao:
        raise HTTPException(status_code=404, detail="Cenário Seção não encontrado")
    
    # Determinar se é corporativo
    is_corporativo = cenario_secao.is_corporativo
    
    # Filtrar CCs pelo tipo adequado
    if is_corporativo:
        query = select(CentroCusto).where(
            CentroCusto.ativo == True,
            CentroCusto.tipo == "POOL"
        )
    else:
        query = select(CentroCusto).where(
            CentroCusto.ativo == True,
            CentroCusto.tipo.in_(["OPERACIONAL", "ADMINISTRATIVO", "OVERHEAD"])
        )
    
    result = await db.execute(query.order_by(CentroCusto.nome))
    centros_custo = result.scalars().all()
    
    return {
        "cenario_secao_id": str(cenario_secao_id),
        "is_corporativo": is_corporativo,
        "tipo_cc_permitido": "POOL" if is_corporativo else "OPERACIONAL",
        "centros_custo": [
            {
                "id": str(cc.id),
                "codigo": cc.codigo,
                "nome": cc.nome,
                "tipo": cc.tipo
            }
            for cc in centros_custo
        ]
    }


# ============================================
# CENTROS DE CUSTO DA SEÇÃO
# ============================================

from app.db.models.orcamento import CenarioSecaoCC
from app.schemas.orcamento import CenarioSecaoCCCreate, CenarioSecaoCCResponse, CentroCustoSimples

@router.get("/{cenario_id}/secoes/{cenario_secao_id}/centros-custo", response_model=List[CenarioSecaoCCResponse])
async def listar_ccs_secao(
    cenario_id: UUID,
    cenario_secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os Centros de Custo associados a uma Seção do cenário."""
    result = await db.execute(
        select(CenarioSecaoCC)
        .where(
            CenarioSecaoCC.cenario_secao_id == cenario_secao_id,
            CenarioSecaoCC.ativo == True
        )
        .options(selectinload(CenarioSecaoCC.centro_custo))
        .order_by(CenarioSecaoCC.created_at)
    )
    return result.scalars().all()


@router.post("/{cenario_id}/secoes/{cenario_secao_id}/centros-custo", response_model=CenarioSecaoCCResponse)
async def adicionar_cc_secao(
    cenario_id: UUID,
    cenario_secao_id: UUID,
    data: CenarioSecaoCCCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona um Centro de Custo a uma Seção do cenário."""
    # Verificar se seção existe
    secao_result = await db.execute(
        select(CenarioSecao).where(CenarioSecao.id == cenario_secao_id)
    )
    cenario_secao = secao_result.scalar_one_or_none()
    if not cenario_secao:
        raise HTTPException(status_code=404, detail="Seção não encontrada no cenário")
    
    # Verificar se CC existe
    cc_result = await db.execute(
        select(CentroCusto).where(CentroCusto.id == data.centro_custo_id)
    )
    cc = cc_result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Centro de Custo não encontrado")
    
    # Verificar se já existe associação
    existing = await db.execute(
        select(CenarioSecaoCC).where(
            CenarioSecaoCC.cenario_secao_id == cenario_secao_id,
            CenarioSecaoCC.centro_custo_id == data.centro_custo_id
        )
    )
    existing_record = existing.scalar_one_or_none()
    if existing_record:
        # Reativar se estava inativo
        if not existing_record.ativo:
            existing_record.ativo = True
            await db.commit()
            await db.refresh(existing_record, attribute_names=['centro_custo'])
            return existing_record
        raise HTTPException(status_code=400, detail="Centro de Custo já está associado a esta Seção")
    
    # Criar nova associação
    associacao = CenarioSecaoCC(
        cenario_secao_id=cenario_secao_id,
        centro_custo_id=data.centro_custo_id
    )
    db.add(associacao)
    await db.commit()
    await db.refresh(associacao, attribute_names=['centro_custo'])
    
    return associacao


@router.delete("/{cenario_id}/secoes/{cenario_secao_id}/centros-custo/{centro_custo_id}")
async def remover_cc_secao(
    cenario_id: UUID,
    cenario_secao_id: UUID,
    centro_custo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove um Centro de Custo de uma Seção do cenário."""
    result = await db.execute(
        select(CenarioSecaoCC).where(
            CenarioSecaoCC.cenario_secao_id == cenario_secao_id,
            CenarioSecaoCC.centro_custo_id == centro_custo_id
        )
    )
    associacao = result.scalar_one_or_none()
    if not associacao:
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    
    # Soft delete
    associacao.ativo = False
    await db.commit()
    
    return {"message": "Centro de Custo removido da Seção com sucesso"}

