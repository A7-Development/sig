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
from app.db.models.orcamento import Cenario, Premissa, QuadroPessoal, CenarioEmpresa, FuncaoSpan, PremissaFuncaoMes, CenarioCliente, CenarioSecao, Secao
from app.schemas.orcamento import (
    CenarioCreate, CenarioUpdate, CenarioResponse, CenarioComRelacionamentos,
    PremissaCreate, PremissaUpdate, PremissaResponse,
    QuadroPessoalCreate, QuadroPessoalUpdate, QuadroPessoalResponse, QuadroPessoalComRelacionamentos,
    FuncaoSpanCreate, FuncaoSpanUpdate, FuncaoSpanResponse, FuncaoSpanComRelacionamentos,
    PremissaFuncaoMesCreate, PremissaFuncaoMesUpdate, PremissaFuncaoMesResponse, PremissaFuncaoMesComRelacionamentos,
    CenarioClienteCreate, CenarioClienteUpdate, CenarioClienteResponse, CenarioClienteComSecoes,
    CenarioSecaoCreate, CenarioSecaoUpdate, CenarioSecaoResponse
)
from app.services.calculo_custos import calcular_custos_cenario, calcular_overhead_ineficiencia
from app.services.capacity_planning import calcular_quantidades_span, aplicar_spans_ao_quadro

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
    
    # Criar premissa padrão
    premissa = Premissa(cenario_id=cenario.id)
    db.add(premissa)
    
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
            selectinload(Cenario.premissas),
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
    
    # Duplicar premissas
    for premissa_orig in original.premissas:
        nova_premissa = Premissa(
            cenario_id=novo_cenario.id,
            absenteismo=premissa_orig.absenteismo,
            turnover=premissa_orig.turnover,
            ferias_indice=premissa_orig.ferias_indice,
            dias_treinamento=premissa_orig.dias_treinamento,
            reajuste_data=premissa_orig.reajuste_data,
            reajuste_percentual=premissa_orig.reajuste_percentual,
            dissidio_mes=premissa_orig.dissidio_mes,
            dissidio_percentual=premissa_orig.dissidio_percentual
        )
        db.add(nova_premissa)
    
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

@router.get("/{cenario_id}/premissas", response_model=List[PremissaResponse])
async def list_premissas(cenario_id: UUID, db: AsyncSession = Depends(get_db)):
    """Lista premissas de um cenário."""
    # Desabilitar carregamento do relacionamento cenario para evitar erro com campos novos
    result = await db.execute(
        select(Premissa).options(noload(Premissa.cenario)).where(Premissa.cenario_id == cenario_id)
    )
    return result.scalars().all()


@router.put("/{cenario_id}/premissas/{premissa_id}", response_model=PremissaResponse)
async def update_premissa(
    cenario_id: UUID, 
    premissa_id: UUID, 
    data: PremissaUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma premissa."""
    result = await db.execute(
        select(Premissa).options(noload(Premissa.cenario)).where(
            Premissa.id == premissa_id,
            Premissa.cenario_id == cenario_id
        )
    )
    premissa = result.scalar_one_or_none()
    
    if not premissa:
        raise HTTPException(status_code=404, detail="Premissa não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(premissa, key, value)
    
    await db.commit()
    # Refresh sem carregar relacionamento cenario para evitar erro com campos novos
    await db.refresh(premissa, attribute_names=[col.name for col in Premissa.__table__.columns])
    return premissa


# ============================================
# QUADRO DE PESSOAL
# ============================================

@router.get("/{cenario_id}/quadro", response_model=List[QuadroPessoalComRelacionamentos])
async def list_quadro_pessoal(
    cenario_id: UUID,
    funcao_id: Optional[UUID] = None,
    secao_id: Optional[UUID] = None,
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
        selectinload(QuadroPessoal.centro_custo)
    ).where(QuadroPessoal.cenario_id == cenario_id)
    
    if funcao_id:
        query = query.where(QuadroPessoal.funcao_id == funcao_id)
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
    
    posicao = QuadroPessoal(**data.model_dump())
    posicao.cenario_id = cenario_id
    db.add(posicao)
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
    for key, value in update_data.items():
        setattr(posicao, key, value)
    
    await db.commit()
    # Refresh sem carregar relacionamento cenario para evitar erro com campos novos
    await db.refresh(posicao, attribute_names=[col.name for col in QuadroPessoal.__table__.columns])
    return posicao


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
    
    await db.delete(posicao)
    await db.commit()
    return {"message": "Posição excluída com sucesso"}


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
    
    # Verificar se já existe (upsert)
    existing = await db.execute(
        select(PremissaFuncaoMes).where(
            PremissaFuncaoMes.cenario_id == cenario_id,
            PremissaFuncaoMes.funcao_id == data.funcao_id,
            PremissaFuncaoMes.mes == data.mes,
            PremissaFuncaoMes.ano == data.ano
        )
    )
    premissa = existing.scalar_one_or_none()
    
    if premissa:
        # Atualizar existente
        update_data = data.model_dump(exclude={'cenario_id', 'funcao_id', 'mes', 'ano'})
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
    
    from app.db.models.orcamento import Funcao
    resultados = []
    
    for data in premissas:
        # Verificar se função existe
        funcao_result = await db.execute(select(Funcao).where(Funcao.id == data.funcao_id))
        if not funcao_result.scalar_one_or_none():
            continue  # Pular se função não existe
        
        # Verificar se já existe
        existing = await db.execute(
            select(PremissaFuncaoMes).where(
                PremissaFuncaoMes.cenario_id == cenario_id,
                PremissaFuncaoMes.funcao_id == data.funcao_id,
                PremissaFuncaoMes.mes == data.mes,
                PremissaFuncaoMes.ano == data.ano
            )
        )
        premissa = existing.scalar_one_or_none()
        
        if premissa:
            # Atualizar
            update_data = data.model_dump(exclude={'cenario_id', 'funcao_id', 'mes', 'ano'})
            for key, value in update_data.items():
                setattr(premissa, key, value)
        else:
            # Criar
            premissa = PremissaFuncaoMes(**data.model_dump())
            db.add(premissa)
        
        resultados.append(premissa)
    
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
# CLIENTES DO CENÁRIO (CenarioCliente)
# ============================================

@router.get("/{cenario_id}/clientes", response_model=List[CenarioClienteComSecoes])
async def list_clientes_cenario(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Lista os clientes associados a um cenário, com suas seções."""
    # Verificar se cenário existe
    cenario_result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    if not cenario_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    result = await db.execute(
        select(CenarioCliente)
        .options(
            selectinload(CenarioCliente.secoes).selectinload(CenarioSecao.secao)
        )
        .where(CenarioCliente.cenario_id == cenario_id, CenarioCliente.ativo == True)
        .order_by(CenarioCliente.created_at)
    )
    return result.scalars().all()


@router.post("/{cenario_id}/clientes", response_model=CenarioClienteResponse)
async def add_cliente_cenario(
    cenario_id: UUID,
    data: CenarioClienteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona um cliente ao cenário."""
    # Verificar se cenário existe
    cenario_result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = cenario_result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "BLOQUEADO":
        raise HTTPException(status_code=400, detail="Cenário bloqueado não pode ser alterado")
    
    # Verificar se cliente já existe no cenário
    existing = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.cenario_id == cenario_id,
            CenarioCliente.cliente_nw_codigo == data.cliente_nw_codigo,
            CenarioCliente.ativo == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cliente já existe neste cenário")
    
    cliente = CenarioCliente(
        cenario_id=cenario_id,
        cliente_nw_codigo=data.cliente_nw_codigo,
        nome_cliente=data.nome_cliente
    )
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cenario_id}/clientes/{cliente_id}")
async def delete_cliente_cenario(
    cenario_id: UUID,
    cliente_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove um cliente do cenário (e suas seções)."""
    result = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.id == cliente_id,
            CenarioCliente.cenario_id == cenario_id
        )
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado no cenário")
    
    # Soft delete - marca como inativo
    cliente.ativo = False
    await db.commit()
    return {"message": "Cliente removido do cenário com sucesso"}


# ============================================
# SEÇÕES DO CLIENTE (CenarioSecao)
# ============================================

@router.post("/{cenario_id}/clientes/{cliente_id}/secoes", response_model=CenarioSecaoResponse)
async def add_secao_cliente(
    cenario_id: UUID,
    cliente_id: UUID,
    data: CenarioSecaoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona uma seção a um cliente do cenário."""
    # Verificar se cliente existe no cenário
    cliente_result = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.id == cliente_id,
            CenarioCliente.cenario_id == cenario_id,
            CenarioCliente.ativo == True
        )
    )
    cliente = cliente_result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado no cenário")
    
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
        secao_id=data.secao_id,
        fator_pa=data.fator_pa
    )
    db.add(cenario_secao)
    await db.commit()
    await db.refresh(cenario_secao)
    
    # Carregar relacionamento para retorno
    await db.refresh(cenario_secao, attribute_names=['secao'])
    return cenario_secao


@router.delete("/{cenario_id}/clientes/{cliente_id}/secoes/{secao_id}")
async def delete_secao_cliente(
    cenario_id: UUID,
    cliente_id: UUID,
    secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove uma seção de um cliente do cenário."""
    # Verificar se cliente existe no cenário
    cliente_result = await db.execute(
        select(CenarioCliente).where(
            CenarioCliente.id == cliente_id,
            CenarioCliente.cenario_id == cenario_id
        )
    )
    if not cliente_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado no cenário")
    
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
    
    # Soft delete
    cenario_secao.ativo = False
    await db.commit()
    return {"message": "Seção removida do cliente com sucesso"}

