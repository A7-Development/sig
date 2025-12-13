"""
Serviço de Cálculo de Custos de Pessoal.
Calcula salários, benefícios, encargos e provisões por cenário.
"""

from typing import List, Dict, Optional
from uuid import UUID
from decimal import Decimal
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.orcamento import (
    Cenario, Premissa, QuadroPessoal, 
    TabelaSalarial, PoliticaBeneficio,
    Empresa, Encargo, Tributo, Provisao
)


@dataclass
class CustoMensal:
    """Custo mensal de uma posição."""
    mes: int
    quantidade: int
    salario_base: Decimal
    salario_total: Decimal
    beneficios: Dict[str, Decimal]
    total_beneficios: Decimal
    encargos: Dict[str, Decimal]
    total_encargos: Decimal
    provisoes: Dict[str, Decimal]
    total_provisoes: Decimal
    custo_total: Decimal
    
    def to_dict(self) -> dict:
        return {
            "mes": self.mes,
            "quantidade": self.quantidade,
            "salario_base": float(self.salario_base),
            "salario_total": float(self.salario_total),
            "beneficios": {k: float(v) for k, v in self.beneficios.items()},
            "total_beneficios": float(self.total_beneficios),
            "encargos": {k: float(v) for k, v in self.encargos.items()},
            "total_encargos": float(self.total_encargos),
            "provisoes": {k: float(v) for k, v in self.provisoes.items()},
            "total_provisoes": float(self.total_provisoes),
            "custo_total": float(self.custo_total),
        }


@dataclass
class CustoPosicao:
    """Custo total de uma posição no cenário."""
    posicao_id: UUID
    funcao_nome: str
    regime: str
    custos_mensais: List[CustoMensal]
    custo_anual: Decimal
    
    def to_dict(self) -> dict:
        return {
            "posicao_id": str(self.posicao_id),
            "funcao_nome": self.funcao_nome,
            "regime": self.regime,
            "custos_mensais": [c.to_dict() for c in self.custos_mensais],
            "custo_anual": float(self.custo_anual),
        }


@dataclass
class ResumoCenario:
    """Resumo de custos do cenário."""
    cenario_id: UUID
    cenario_nome: str
    ano: int
    total_headcount_medio: float
    custo_total_anual: Decimal
    custo_mensal_medio: Decimal
    custos_por_mes: Dict[int, Decimal]
    custos_por_funcao: Dict[str, Decimal]
    
    def to_dict(self) -> dict:
        return {
            "cenario_id": str(self.cenario_id),
            "cenario_nome": self.cenario_nome,
            "ano": self.ano,
            "total_headcount_medio": self.total_headcount_medio,
            "custo_total_anual": float(self.custo_total_anual),
            "custo_mensal_medio": float(self.custo_mensal_medio),
            "custos_por_mes": {k: float(v) for k, v in self.custos_por_mes.items()},
            "custos_por_funcao": {k: float(v) for k, v in self.custos_por_funcao.items()},
        }


MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


async def calcular_custos_cenario(
    db: AsyncSession,
    cenario_id: UUID
) -> ResumoCenario:
    """
    Calcula todos os custos de um cenário de orçamento.
    """
    # Carregar cenário com relacionamentos
    result = await db.execute(
        select(Cenario).options(
            selectinload(Cenario.empresa).selectinload(Empresa.encargos),
            selectinload(Cenario.empresa).selectinload(Empresa.tributos),
            selectinload(Cenario.premissas),
            selectinload(Cenario.posicoes).selectinload(QuadroPessoal.funcao),
            selectinload(Cenario.posicoes).selectinload(QuadroPessoal.tabela_salarial).selectinload(TabelaSalarial.politica),
        ).where(Cenario.id == cenario_id)
    )
    cenario = result.scalar_one_or_none()
    
    if not cenario:
        raise ValueError("Cenário não encontrado")
    
    # Carregar provisões globais
    result_prov = await db.execute(select(Provisao).where(Provisao.ativo == True))
    provisoes = result_prov.scalars().all()
    
    # Encargos da empresa
    encargos_clt = []
    encargos_pj = []
    if cenario.empresa:
        for enc in cenario.empresa.encargos:
            if enc.ativo:
                if enc.regime == 'CLT':
                    encargos_clt.append(enc)
                else:
                    encargos_pj.append(enc)
    
    # Premissa do cenário
    premissa = cenario.premissas[0] if cenario.premissas else None
    
    # Calcular custos por posição
    custos_por_mes: Dict[int, Decimal] = {i: Decimal('0') for i in range(1, 13)}
    custos_por_funcao: Dict[str, Decimal] = {}
    total_headcount = Decimal('0')
    
    for posicao in cenario.posicoes:
        if not posicao.ativo:
            continue
        
        funcao_nome = posicao.funcao.nome if posicao.funcao else "Sem função"
        if funcao_nome not in custos_por_funcao:
            custos_por_funcao[funcao_nome] = Decimal('0')
        
        # Obter salário
        salario = Decimal('0')
        politica = None
        
        if posicao.salario_override:
            salario = Decimal(str(posicao.salario_override))
        elif posicao.tabela_salarial:
            salario = Decimal(str(posicao.tabela_salarial.salario_base))
            politica = posicao.tabela_salarial.politica
        
        # Encargos baseado no regime
        encargos = encargos_clt if posicao.regime == 'CLT' else encargos_pj
        
        # Calcular para cada mês
        for mes_idx, mes_nome in enumerate(MESES, 1):
            qtd = getattr(posicao, f'qtd_{mes_nome}', 0)
            if qtd == 0:
                continue
            
            qtd_decimal = Decimal(str(qtd))
            total_headcount += qtd_decimal
            
            # Salário mensal total
            salario_mes = salario * qtd_decimal
            
            # Benefícios
            total_beneficios = Decimal('0')
            if politica and posicao.regime == 'CLT':
                # Dias trabalhados estimados (22 dias para 5x2, 26 para 6x1)
                dias_trabalhados = 26 if politica.escala == '6x1' else 22
                
                # VT
                vt = Decimal(str(politica.vt_dia or 0)) * dias_trabalhados * qtd_decimal
                # Desconto 6% se aplicável
                if politica.vt_desconto_6pct:
                    desconto_vt = min(vt, salario_mes * Decimal('0.06'))
                    vt = max(Decimal('0'), vt - desconto_vt)
                
                # VR/VA
                vr = Decimal(str(politica.vr_dia or 0)) * dias_trabalhados * qtd_decimal
                va = Decimal(str(politica.va_dia or 0)) * dias_trabalhados * qtd_decimal
                
                # Benefícios fixos mensais
                plano_saude = Decimal(str(politica.plano_saude or 0)) * qtd_decimal
                plano_dental = Decimal(str(politica.plano_dental or 0)) * qtd_decimal
                seguro_vida = Decimal(str(politica.seguro_vida or 0)) * qtd_decimal
                aux_creche = Decimal(str(politica.aux_creche or 0)) * qtd_decimal * Decimal(str(politica.aux_creche_percentual or 0)) / 100
                aux_home_office = Decimal(str(politica.aux_home_office or 0)) * qtd_decimal
                
                total_beneficios = vt + vr + va + plano_saude + plano_dental + seguro_vida + aux_creche + aux_home_office
            
            # Encargos
            total_encargos = Decimal('0')
            base_encargos = salario_mes
            
            for enc in encargos:
                aliquota = Decimal(str(enc.aliquota)) / 100
                if enc.base_calculo == 'SALARIO':
                    total_encargos += base_encargos * aliquota
                elif enc.base_calculo == 'TOTAL':
                    total_encargos += (base_encargos + total_beneficios) * aliquota
            
            # Provisões (apenas CLT)
            total_provisoes = Decimal('0')
            if posicao.regime == 'CLT':
                for prov in provisoes:
                    percentual = Decimal(str(prov.percentual)) / 100
                    valor_provisao = salario_mes * percentual
                    
                    # Se incide encargos sobre provisão
                    if prov.incide_encargos:
                        for enc in encargos:
                            aliquota = Decimal(str(enc.aliquota)) / 100
                            if enc.base_calculo == 'SALARIO':
                                valor_provisao += valor_provisao * aliquota
                    
                    total_provisoes += valor_provisao
            
            # Custo total do mês
            custo_mes = salario_mes + total_beneficios + total_encargos + total_provisoes
            
            custos_por_mes[mes_idx] += custo_mes
            custos_por_funcao[funcao_nome] += custo_mes
    
    # Totais
    custo_total_anual = sum(custos_por_mes.values())
    custo_mensal_medio = custo_total_anual / 12 if custo_total_anual > 0 else Decimal('0')
    headcount_medio = float(total_headcount) / 12
    
    return ResumoCenario(
        cenario_id=cenario.id,
        cenario_nome=cenario.nome,
        ano=cenario.ano,
        total_headcount_medio=headcount_medio,
        custo_total_anual=custo_total_anual,
        custo_mensal_medio=custo_mensal_medio,
        custos_por_mes=custos_por_mes,
        custos_por_funcao=custos_por_funcao,
    )


async def calcular_overhead_ineficiencia(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict:
    """
    Calcula o overhead necessário para cobrir ineficiências (ABS, TO, Férias).
    """
    result = await db.execute(
        select(Cenario).options(
            selectinload(Cenario.premissas),
            selectinload(Cenario.posicoes).selectinload(QuadroPessoal.funcao),
        ).where(Cenario.id == cenario_id)
    )
    cenario = result.scalar_one_or_none()
    
    if not cenario:
        raise ValueError("Cenário não encontrado")
    
    premissa = cenario.premissas[0] if cenario.premissas else None
    if not premissa:
        return {"mensagem": "Sem premissas configuradas"}
    
    # Índices de ineficiência
    abs_pct = float(premissa.absenteismo) / 100
    to_pct = float(premissa.turnover) / 100
    ferias_pct = float(premissa.ferias_indice) / 100
    
    # Fator de overhead total
    fator_overhead = 1 + abs_pct + to_pct + ferias_pct
    
    resultado_por_mes = {}
    
    for mes_idx, mes_nome in enumerate(MESES, 1):
        headcount_produtivo = 0
        
        for posicao in cenario.posicoes:
            if posicao.ativo:
                qtd = getattr(posicao, f'qtd_{mes_nome}', 0)
                headcount_produtivo += qtd
        
        headcount_necessario = headcount_produtivo * fator_overhead
        overhead = headcount_necessario - headcount_produtivo
        
        resultado_por_mes[mes_idx] = {
            "headcount_produtivo": headcount_produtivo,
            "headcount_necessario": round(headcount_necessario, 1),
            "overhead": round(overhead, 1),
            "fator": round(fator_overhead, 4),
        }
    
    return {
        "cenario_id": str(cenario_id),
        "premissas": {
            "absenteismo": float(premissa.absenteismo),
            "turnover": float(premissa.turnover),
            "ferias": float(premissa.ferias_indice),
        },
        "fator_overhead_total": round(fator_overhead, 4),
        "meses": resultado_por_mes,
    }

