"""
Motor de cálculo de custos de pessoal.
Calcula todas as 30 rubricas para um cenário.
"""

from typing import List, Dict, Optional, Any
from uuid import UUID
from decimal import Decimal
from datetime import date
import calendar
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.orcamento import (
    Cenario, CenarioSecao, QuadroPessoal, TipoCusto, CustoCalculado,
    ParametroCusto, PremissaFuncaoMes, TabelaSalarial, PoliticaBeneficio,
    Funcao, Feriado, FaixaSalarial
)


# Códigos Totvs das rubricas
COD_SALARIO = "0001"
COD_HE_50 = "0012"
COD_HE_100 = "0014"
COD_DSR = "0020"
COD_HONORARIOS = "0018"
COD_VT = "0069"
COD_VR = "B217"
COD_AM = "B001"
COD_CRECHE = "0092"
COD_HO = "0736"
COD_FGTS = "E0087"
COD_INSS_EMP = "E0080"
COD_INSS_TERC = "E0082"
COD_SAT_RAT = "E0083"
COD_PROV_FERIAS = "E0002"
COD_FGTS_FERIAS = "E0007"
COD_INSS_FERIAS = "E0003"
COD_PROV_13 = "E0040"
COD_FGTS_13 = "E0045"
COD_INSS_13 = "E0041"
COD_INDENIZ = "E0001"
COD_AVISO_IND = "0500"
COD_MULTA_FGTS = "B350"
COD_BONUS = "0047"
COD_PREMIACAO = "0574"
COD_DESC_480 = "0580"
COD_DESC_AVISO = "0499"
COD_DESC_FALTAS = "0101"
COD_DESC_VT = "0107"
COD_DESC_VR = "0123"


class CalculoCustosService:
    """Serviço para cálculo de custos de pessoal."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self._tipos_custo: Dict[str, TipoCusto] = {}
        self._parametros: Dict[str, float] = {}
        self._custos_calculados: Dict[str, Decimal] = {}  # Para referências entre rubricas
    
    async def carregar_tipos_custo(self) -> None:
        """Carrega todos os tipos de custo ativos."""
        result = await self.db.execute(
            select(TipoCusto).where(TipoCusto.ativo == True).order_by(TipoCusto.ordem)
        )
        tipos = result.scalars().all()
        self._tipos_custo = {tc.codigo: tc for tc in tipos}
    
    async def carregar_parametros(self, cenario_id: UUID, cenario_secao_id: Optional[UUID] = None) -> None:
        """Carrega parâmetros de custo para o cenário/seção."""
        query = select(ParametroCusto).where(ParametroCusto.cenario_id == cenario_id)
        if cenario_secao_id:
            query = query.where(
                (ParametroCusto.cenario_secao_id == cenario_secao_id) | 
                (ParametroCusto.cenario_secao_id.is_(None))
            )
        result = await self.db.execute(query)
        params = result.scalars().all()
        
        for p in params:
            key = f"{p.tipo_custo_id or 'global'}:{p.chave}"
            self._parametros[key] = float(p.valor)
    
    def get_parametro(self, chave: str, tipo_custo_id: Optional[UUID] = None, default: float = 0) -> float:
        """Obtém um parâmetro de custo."""
        # Tenta primeiro com tipo_custo específico
        if tipo_custo_id:
            key = f"{tipo_custo_id}:{chave}"
            if key in self._parametros:
                return self._parametros[key]
        # Tenta parâmetro global
        key = f"global:{chave}"
        return self._parametros.get(key, default)
    
    async def calcular_custos_cenario(
        self, 
        cenario_id: UUID,
        cenario_secao_id: Optional[UUID] = None,
        ano: Optional[int] = None
    ) -> List[CustoCalculado]:
        """
        Calcula todos os custos para um cenário.
        
        Args:
            cenario_id: ID do cenário
            cenario_secao_id: ID da seção (opcional, se None calcula todas)
            ano: Ano para cálculo (opcional, se None usa ano do cenário)
        
        Returns:
            Lista de custos calculados
        """
        # Carregar tipos de custo
        await self.carregar_tipos_custo()
        
        # Carregar cenário
        cenario = await self.db.get(Cenario, cenario_id)
        if not cenario:
            raise ValueError(f"Cenário {cenario_id} não encontrado")
        
        if not ano:
            ano = cenario.ano_inicio
        
        # Determinar seções a calcular
        if cenario_secao_id:
            secoes_ids = [cenario_secao_id]
        else:
            # Buscar todas as seções que tem quadro pessoal neste cenário
            result = await self.db.execute(
                select(QuadroPessoal.cenario_secao_id)
                .where(QuadroPessoal.cenario_id == cenario_id)
                .where(QuadroPessoal.cenario_secao_id.isnot(None))
                .distinct()
            )
            secoes_ids = [row[0] for row in result.fetchall()]
        
        todos_custos = []
        
        for secao_id in secoes_ids:
            await self.carregar_parametros(cenario_id, secao_id)
            custos_secao = await self._calcular_custos_secao(cenario_id, secao_id, ano)
            todos_custos.extend(custos_secao)
        
        return todos_custos
    
    async def _calcular_custos_secao(
        self, 
        cenario_id: UUID, 
        cenario_secao_id: UUID,
        ano: int
    ) -> List[CustoCalculado]:
        """Calcula custos para uma seção específica."""
        
        # Carregar quadro pessoal da seção
        result = await self.db.execute(
            select(QuadroPessoal).options(
                selectinload(QuadroPessoal.funcao),
                selectinload(QuadroPessoal.tabela_salarial).selectinload(TabelaSalarial.politica)
            ).where(
                QuadroPessoal.cenario_id == cenario_id,
                QuadroPessoal.cenario_secao_id == cenario_secao_id,
                QuadroPessoal.ativo == True
            )
        )
        quadro_itens = result.scalars().all()
        
        if not quadro_itens:
            return []
        
        custos = []
        
        # Para cada item do quadro (função)
        for quadro in quadro_itens:
            # Para cada mês
            for mes in range(1, 13):
                # Limpar cache de custos calculados para este mês
                self._custos_calculados = {}
                
                # Calcular HC do mês
                hc_operando = self._get_hc_mes(quadro, mes)
                if hc_operando <= 0:
                    continue
                
                # Carregar premissas do mês
                premissa = await self._get_premissa(cenario_id, cenario_secao_id, quadro.funcao_id, mes, ano)
                
                # Calcular HC Folha (com ineficiências)
                hc_folha = self._calcular_hc_folha(hc_operando, premissa)
                
                # Obter salário
                salario = self._get_salario(quadro)
                
                # Obter política de benefícios
                politica = quadro.tabela_salarial.politica if quadro.tabela_salarial else None
                
                # Calcular cada rubrica na ordem correta
                for tipo in sorted(self._tipos_custo.values(), key=lambda x: x.ordem):
                    valor = await self._calcular_rubrica(
                        tipo=tipo,
                        quadro=quadro,
                        hc_operando=hc_operando,
                        hc_folha=hc_folha,
                        salario=salario,
                        politica=politica,
                        premissa=premissa,
                        mes=mes,
                        ano=ano
                    )
                    
                    if valor != 0:
                        custo = CustoCalculado(
                            cenario_id=cenario_id,
                            cenario_secao_id=cenario_secao_id,
                            funcao_id=quadro.funcao_id,
                            faixa_id=quadro.tabela_salarial.faixa_id if quadro.tabela_salarial else None,
                            tipo_custo_id=tipo.id,
                            mes=mes,
                            ano=ano,
                            hc_base=Decimal(str(hc_folha)),
                            valor_base=Decimal(str(salario)),
                            indice_aplicado=Decimal(str(tipo.aliquota_padrao or 0)),
                            valor_calculado=Decimal(str(valor)),
                            memoria_calculo={
                                "hc_operando": hc_operando,
                                "hc_folha": hc_folha,
                                "salario": salario,
                                "tipo_calculo": tipo.tipo_calculo,
                            }
                        )
                        custos.append(custo)
                        
                        # Guardar no cache para referências
                        self._custos_calculados[tipo.codigo] = Decimal(str(valor))
        
        return custos
    
    def _get_hc_mes(self, quadro: QuadroPessoal, mes: int) -> float:
        """Obtém HC de um mês específico."""
        meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
        campo = f"qtd_{meses[mes-1]}"
        return float(getattr(quadro, campo, 0) or 0)
    
    def _calcular_hc_folha(self, hc_operando: float, premissa: Optional[Dict]) -> float:
        """Calcula HC Folha com base em ineficiências."""
        if not premissa:
            return hc_operando
        
        abs_pct = premissa.get('absenteismo', 0) / 100
        ferias_pct = premissa.get('ferias_indice', 8.33) / 100
        turnover_pct = premissa.get('turnover', 0) / 100
        
        # Fórmula: HC_Folha = HC_Operando / (1 - ABS - Férias) * (1 + TO/2)
        fator_ineficiencia = 1 - abs_pct - ferias_pct
        if fator_ineficiencia <= 0:
            fator_ineficiencia = 0.5  # Mínimo para evitar divisão por zero
        
        hc_folha = hc_operando / fator_ineficiencia
        hc_folha = hc_folha * (1 + turnover_pct / 2)  # TO com metade do peso (treinamento)
        
        return hc_folha
    
    def _get_salario(self, quadro: QuadroPessoal) -> float:
        """Obtém salário do quadro (override ou tabela salarial)."""
        if quadro.salario_override:
            return float(quadro.salario_override)
        if quadro.tabela_salarial:
            return float(quadro.tabela_salarial.salario_base)
        return 0
    
    async def _get_premissa(
        self, 
        cenario_id: UUID, 
        cenario_secao_id: UUID,
        funcao_id: UUID,
        mes: int,
        ano: int
    ) -> Optional[Dict]:
        """Obtém premissas para uma função/mês."""
        result = await self.db.execute(
            select(PremissaFuncaoMes).where(
                PremissaFuncaoMes.cenario_id == cenario_id,
                PremissaFuncaoMes.cenario_secao_id == cenario_secao_id,
                PremissaFuncaoMes.funcao_id == funcao_id,
                PremissaFuncaoMes.mes == mes,
                PremissaFuncaoMes.ano == ano
            )
        )
        premissa = result.scalar_one_or_none()
        
        if premissa:
            return {
                'absenteismo': float(premissa.absenteismo),
                'abs_pct_justificado': float(premissa.abs_pct_justificado),
                'turnover': float(premissa.turnover),
                'ferias_indice': float(premissa.ferias_indice),
                'dias_treinamento': premissa.dias_treinamento,
            }
        return None
    
    async def _calcular_rubrica(
        self,
        tipo: TipoCusto,
        quadro: QuadroPessoal,
        hc_operando: float,
        hc_folha: float,
        salario: float,
        politica: Optional[PoliticaBeneficio],
        premissa: Optional[Dict],
        mes: int,
        ano: int
    ) -> float:
        """Calcula o valor de uma rubrica específica."""
        
        codigo = tipo.codigo
        
        # ============================================
        # REMUNERAÇÃO BASE
        # ============================================
        
        if codigo == COD_SALARIO:
            # HC_Folha x Salário
            return hc_folha * salario
        
        elif codigo == COD_HE_50:
            # Horas extras 50% - usar parâmetro
            pct_he = self.get_parametro("pct_horas_extras_50", tipo.id, 0)
            return hc_folha * salario * (pct_he / 100) * 1.5
        
        elif codigo == COD_HE_100:
            # Horas extras 100% (feriados) - calcular automaticamente
            # TODO: Implementar cálculo baseado em feriados
            pct_he = self.get_parametro("pct_horas_extras_100", tipo.id, 0)
            return hc_folha * salario * (pct_he / 100) * 2.0
        
        elif codigo == COD_DSR:
            # DSR sobre horas extras
            he_50 = self._custos_calculados.get(COD_HE_50, Decimal(0))
            he_100 = self._custos_calculados.get(COD_HE_100, Decimal(0))
            total_he = float(he_50 + he_100)
            
            # Escala 6x1: 26 trabalhados, 4 descanso -> 4/26
            # Escala 5x2: 21 trabalhados, 9 descanso -> 9/21
            escala = politica.escala if politica else "6x1"
            if escala == "5x2":
                fator = 9 / 21
            elif escala == "12x36":
                fator = 0  # Não tem DSR em 12x36
            else:  # 6x1
                fator = 4 / 26
            
            return total_he * fator
        
        elif codigo == COD_HONORARIOS:
            # Funcionários PJ
            funcao = quadro.funcao
            if funcao and funcao.is_pj:
                return hc_folha * salario
            return 0
        
        # ============================================
        # BENEFÍCIOS
        # ============================================
        
        elif codigo == COD_VT:
            # Vale Transporte
            if not politica or politica.vt_dia <= 0:
                return 0
            
            funcao = quadro.funcao
            if funcao and funcao.is_home_office:
                return 0  # Home office não recebe VT
            
            # HC efetivo (descontando ABS e férias)
            abs_pct = (premissa.get('absenteismo', 0) if premissa else 0) / 100
            ferias_pct = (premissa.get('ferias_indice', 8.33) if premissa else 8.33) / 100
            hc_efetivo = hc_folha * (1 - abs_pct - ferias_pct)
            
            # Dias trabalhados no mês
            dias_trabalhados = self._get_dias_trabalhados(mes, ano, politica.escala if politica else "6x1")
            
            return hc_efetivo * dias_trabalhados * float(politica.vt_dia)
        
        elif codigo == COD_VR:
            # Vale Refeição
            if not politica or politica.vr_dia <= 0:
                return 0
            
            abs_pct = (premissa.get('absenteismo', 0) if premissa else 0) / 100
            ferias_pct = (premissa.get('ferias_indice', 8.33) if premissa else 8.33) / 100
            hc_efetivo = hc_folha * (1 - abs_pct - ferias_pct)
            
            dias_trabalhados = self._get_dias_trabalhados(mes, ano, politica.escala if politica else "6x1")
            
            return hc_efetivo * dias_trabalhados * float(politica.vr_dia)
        
        elif codigo == COD_AM:
            # Assistência Médica
            if not politica or politica.plano_saude <= 0:
                return 0
            
            idx_elegibilidade = self.get_parametro("pct_elegibilidade_am", tipo.id, 100) / 100
            return hc_folha * float(politica.plano_saude) * idx_elegibilidade
        
        elif codigo == COD_CRECHE:
            # Auxílio Creche
            if not politica or politica.aux_creche <= 0:
                return 0
            
            idx_elegibilidade = self.get_parametro("pct_elegibilidade_creche", tipo.id, 
                                                   float(politica.aux_creche_percentual)) / 100
            return hc_folha * float(politica.aux_creche) * idx_elegibilidade
        
        elif codigo == COD_HO:
            # Auxílio Home Office
            if not politica or politica.aux_home_office <= 0:
                return 0
            
            funcao = quadro.funcao
            if not funcao or not funcao.is_home_office:
                return 0
            
            return hc_folha * float(politica.aux_home_office)
        
        # ============================================
        # ENCARGOS
        # ============================================
        
        elif codigo == COD_FGTS:
            # FGTS 8%
            base = self._calcular_base_encargo("incide_fgts")
            return base * 0.08
        
        elif codigo == COD_INSS_EMP:
            # INSS Empresa 20%
            base = self._calcular_base_encargo("incide_inss")
            return base * 0.20
        
        elif codigo == COD_INSS_TERC:
            # INSS Terceiros 5.8%
            base = self._calcular_base_encargo("incide_inss")
            return base * 0.058
        
        elif codigo == COD_SAT_RAT:
            # SAT/RAT 3%
            base = self._calcular_base_encargo("incide_inss")
            return base * 0.03
        
        # ============================================
        # PROVISÕES
        # ============================================
        
        elif codigo == COD_PROV_FERIAS:
            # Provisão Férias: 11.11% (1/12 + 1/3)
            base = self._calcular_base_reflexo("reflexo_ferias")
            return base * 0.1111
        
        elif codigo == COD_FGTS_FERIAS:
            # FGTS sobre Férias
            prov_ferias = self._custos_calculados.get(COD_PROV_FERIAS, Decimal(0))
            return float(prov_ferias) * 0.08
        
        elif codigo == COD_INSS_FERIAS:
            # INSS sobre Férias (28.8%)
            prov_ferias = self._custos_calculados.get(COD_PROV_FERIAS, Decimal(0))
            return float(prov_ferias) * 0.288
        
        elif codigo == COD_PROV_13:
            # Provisão 13º: 8.33%
            base = self._calcular_base_reflexo("reflexo_13")
            return base * 0.0833
        
        elif codigo == COD_FGTS_13:
            # FGTS sobre 13º
            prov_13 = self._custos_calculados.get(COD_PROV_13, Decimal(0))
            return float(prov_13) * 0.08
        
        elif codigo == COD_INSS_13:
            # INSS sobre 13º (28.8%)
            prov_13 = self._custos_calculados.get(COD_PROV_13, Decimal(0))
            return float(prov_13) * 0.288
        
        elif codigo == COD_INDENIZ:
            # Indenizações Trabalhistas
            pct = self.get_parametro("pct_indenizacoes", tipo.id, 0)
            salario_total = self._custos_calculados.get(COD_SALARIO, Decimal(0))
            return float(salario_total) * (pct / 100)
        
        elif codigo == COD_AVISO_IND:
            # Aviso Prévio Indenizado
            turnover = (premissa.get('turnover', 0) if premissa else 0) / 100
            pct_deslig_empresa = self.get_parametro("pct_deslig_empresa", tipo.id, 50) / 100
            return hc_folha * salario * turnover * pct_deslig_empresa
        
        elif codigo == COD_MULTA_FGTS:
            # Multa 40% FGTS
            turnover = (premissa.get('turnover', 0) if premissa else 0) / 100
            pct_deslig_empresa = self.get_parametro("pct_deslig_empresa", tipo.id, 50) / 100
            # Saldo médio FGTS: 8% x salário x 6 meses (média)
            saldo_fgts = hc_folha * salario * 0.08 * 6
            return saldo_fgts * 0.4 * turnover * pct_deslig_empresa / 12  # Dividido por 12 para mensal
        
        # ============================================
        # PRÊMIOS
        # ============================================
        
        elif codigo == COD_BONUS:
            # Bônus - % da receita (implementar quando houver receita)
            pct = self.get_parametro("pct_bonus_receita", tipo.id, 0)
            # TODO: Implementar quando módulo de receitas estiver pronto
            return 0
        
        elif codigo == COD_PREMIACAO:
            # Premiação
            pct = self.get_parametro("pct_premios_receita", tipo.id, 0)
            # TODO: Implementar quando módulo de receitas estiver pronto
            return 0
        
        # ============================================
        # DESCONTOS
        # ============================================
        
        elif codigo == COD_DESC_480:
            # Desconto Art. 480 CLT
            turnover = (premissa.get('turnover', 0) if premissa else 0) / 100
            pct_pedido_demissao = 1 - self.get_parametro("pct_deslig_empresa", tipo.id, 50) / 100
            # 50% do período restante de experiência (média 22 dias)
            return -(hc_folha * (salario / 30) * 22 * 0.5 * turnover * pct_pedido_demissao / 12)
        
        elif codigo == COD_DESC_AVISO:
            # Desconto Aviso Prévio
            turnover = (premissa.get('turnover', 0) if premissa else 0) / 100
            pct_pedido_demissao = 1 - self.get_parametro("pct_deslig_empresa", tipo.id, 50) / 100
            pct_nao_cumpre = self.get_parametro("pct_nao_cumpre_aviso", tipo.id, 30) / 100
            return -(hc_folha * salario * turnover * pct_pedido_demissao * pct_nao_cumpre)
        
        elif codigo == COD_DESC_FALTAS:
            # Desconto Dias Faltas (ABS Injustificado)
            if not premissa:
                return 0
            abs_total = premissa.get('absenteismo', 0) / 100
            abs_just = premissa.get('abs_pct_justificado', 75) / 100
            abs_injust = abs_total * (1 - abs_just)
            
            dias_uteis = self._get_dias_uteis(mes, ano)
            hc_base = hc_folha * (1 - premissa.get('ferias_indice', 8.33) / 100)
            
            return -(hc_base * dias_uteis * abs_injust * (salario / 30))
        
        elif codigo == COD_DESC_VT:
            # Desconto VT (6% do salário, limitado ao VT)
            vt_valor = self._custos_calculados.get(COD_VT, Decimal(0))
            if vt_valor <= 0:
                return 0
            
            desconto = hc_folha * salario * 0.06
            return -min(desconto, float(vt_valor))
        
        elif codigo == COD_DESC_VR:
            # Desconto VR
            vr_valor = self._custos_calculados.get(COD_VR, Decimal(0))
            if vr_valor <= 0:
                return 0
            
            pct_desconto = float(politica.pct_desconto_vr) / 100 if politica else 0
            return -(float(vr_valor) * pct_desconto)
        
        return 0
    
    def _calcular_base_encargo(self, flag: str) -> float:
        """Calcula a base para encargos (soma das rubricas com flag True)."""
        base = Decimal(0)
        for codigo, tipo in self._tipos_custo.items():
            if getattr(tipo, flag, False) and codigo in self._custos_calculados:
                base += self._custos_calculados[codigo]
        return float(base)
    
    def _calcular_base_reflexo(self, flag: str) -> float:
        """Calcula a base para reflexos (férias, 13º)."""
        return self._calcular_base_encargo(flag)
    
    def _get_dias_trabalhados(self, mes: int, ano: int, escala: str) -> int:
        """Obtém dias trabalhados no mês baseado na escala."""
        dias_mes = calendar.monthrange(ano, mes)[1]
        
        if escala == "6x1":
            return int(dias_mes * 26 / 30)
        elif escala == "5x2":
            return int(dias_mes * 21 / 30)
        elif escala == "12x36":
            return int(dias_mes * 15 / 30)
        else:
            return dias_mes
    
    def _get_dias_uteis(self, mes: int, ano: int) -> int:
        """Obtém dias úteis do mês."""
        dias_mes = calendar.monthrange(ano, mes)[1]
        # Aproximação: 22 dias úteis por mês
        return min(22, dias_mes - 8)


async def calcular_e_salvar_custos(
    db: AsyncSession,
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = None,
    ano: Optional[int] = None
) -> int:
    """
    Calcula e salva os custos de um cenário.
    
    Returns:
        Quantidade de custos calculados
    """
    service = CalculoCustosService(db)
    
    # Limpar custos anteriores
    from sqlalchemy import delete
    stmt = delete(CustoCalculado).where(CustoCalculado.cenario_id == cenario_id)
    if cenario_secao_id:
        stmt = stmt.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    await db.execute(stmt)
    
    # Calcular novos custos
    custos = await service.calcular_custos_cenario(cenario_id, cenario_secao_id, ano)
    
    # Salvar custos
    for custo in custos:
        db.add(custo)
    
    await db.commit()
    
    return len(custos)


class ResumoCustos:
    """Classe para armazenar resumo de custos."""
    
    def __init__(self, cenario_id: UUID, custos: List[CustoCalculado]):
        self.cenario_id = cenario_id
        self.custos = custos
        self._por_categoria: Dict[str, float] = {}
        self._total_geral: float = 0
        self._processar_custos()
    
    def _processar_custos(self):
        """Processa os custos e calcula totais."""
        for custo in self.custos:
            valor = float(custo.valor_calculado)
            self._total_geral += valor
            
            if custo.tipo_custo:
                categoria = custo.tipo_custo.categoria or "OUTROS"
            else:
                categoria = "OUTROS"
            
            if categoria not in self._por_categoria:
                self._por_categoria[categoria] = 0
            self._por_categoria[categoria] += valor
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cenario_id": str(self.cenario_id),
            "por_categoria": self._por_categoria,
            "total_geral": self._total_geral,
        }


async def calcular_custos_cenario(
    db: AsyncSession,
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = None,
    ano: Optional[int] = None
) -> ResumoCustos:
    """
    Calcula custos de um cenário e retorna um resumo.
    
    Args:
        db: Sessão do banco de dados
        cenario_id: ID do cenário
        cenario_secao_id: ID da seção (opcional)
        ano: Ano para cálculo (opcional)
    
    Returns:
        ResumoCustos com os custos calculados
    """
    service = CalculoCustosService(db)
    
    # Limpar custos anteriores
    from sqlalchemy import delete
    stmt = delete(CustoCalculado).where(CustoCalculado.cenario_id == cenario_id)
    if cenario_secao_id:
        stmt = stmt.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    await db.execute(stmt)
    
    # Calcular novos custos
    custos = await service.calcular_custos_cenario(cenario_id, cenario_secao_id, ano)
    
    # Salvar custos
    for custo in custos:
        db.add(custo)
    
    await db.commit()
    
    # Recarregar custos com relações
    result = await db.execute(
        select(CustoCalculado).options(
            selectinload(CustoCalculado.tipo_custo)
        ).where(CustoCalculado.cenario_id == cenario_id)
    )
    custos_recarregados = result.scalars().all()
    
    return ResumoCustos(cenario_id, custos_recarregados)


async def calcular_overhead_ineficiencia(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict[str, Any]:
    """
    Calcula o overhead necessário para cobrir ineficiências.
    
    Args:
        db: Sessão do banco de dados
        cenario_id: ID do cenário
    
    Returns:
        Dicionário com cálculos de overhead
    """
    # Carregar cenário
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise ValueError(f"Cenário {cenario_id} não encontrado")
    
    # Buscar quadro de pessoal
    result = await db.execute(
        select(QuadroPessoal).options(
            selectinload(QuadroPessoal.funcao)
        ).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.ativo == True
        )
    )
    quadro_itens = result.scalars().all()
    
    # Buscar premissas
    result = await db.execute(
        select(PremissaFuncaoMes).where(
            PremissaFuncaoMes.cenario_id == cenario_id
        )
    )
    premissas = result.scalars().all()
    
    # Calcular médias de ineficiência
    total_hc_operando = 0
    total_abs_ponderado = 0
    total_ferias_ponderado = 0
    total_to_ponderado = 0
    
    for quadro in quadro_itens:
        # Calcular HC médio do quadro
        hc_medio = sum(
            float(getattr(quadro, f"qtd_{m}", 0) or 0)
            for m in ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
        ) / 12
        
        if hc_medio <= 0:
            continue
        
        total_hc_operando += hc_medio
        
        # Buscar premissas desta função
        premissas_funcao = [
            p for p in premissas 
            if p.funcao_id == quadro.funcao_id
        ]
        
        if premissas_funcao:
            abs_medio = sum(float(p.absenteismo or 0) for p in premissas_funcao) / len(premissas_funcao)
            ferias_medio = sum(float(p.ferias_indice or 8.33) for p in premissas_funcao) / len(premissas_funcao)
            to_medio = sum(float(p.turnover or 0) for p in premissas_funcao) / len(premissas_funcao)
        else:
            abs_medio = 5.0
            ferias_medio = 8.33
            to_medio = 5.0
        
        total_abs_ponderado += hc_medio * abs_medio
        total_ferias_ponderado += hc_medio * ferias_medio
        total_to_ponderado += hc_medio * to_medio
    
    if total_hc_operando <= 0:
        return {
            "hc_operando_total": 0,
            "hc_folha_necessario": 0,
            "overhead_pct": 0,
            "overhead_hc": 0,
            "detalhes": {
                "absenteismo_medio": 0,
                "ferias_medio": 8.33,
                "turnover_medio": 0,
            }
        }
    
    # Calcular médias ponderadas
    abs_medio = total_abs_ponderado / total_hc_operando
    ferias_medio = total_ferias_ponderado / total_hc_operando
    to_medio = total_to_ponderado / total_hc_operando
    
    # Calcular fator de ineficiência
    fator = 1 - (abs_medio / 100) - (ferias_medio / 100)
    if fator <= 0:
        fator = 0.5
    
    hc_base = total_hc_operando / fator
    hc_folha = hc_base * (1 + (to_medio / 100) / 2)
    
    overhead_hc = hc_folha - total_hc_operando
    overhead_pct = (overhead_hc / total_hc_operando) * 100 if total_hc_operando > 0 else 0
    
    return {
        "hc_operando_total": round(total_hc_operando, 2),
        "hc_folha_necessario": round(hc_folha, 2),
        "overhead_pct": round(overhead_pct, 2),
        "overhead_hc": round(overhead_hc, 2),
        "detalhes": {
            "absenteismo_medio": round(abs_medio, 2),
            "ferias_medio": round(ferias_medio, 2),
            "turnover_medio": round(to_medio, 2),
        }
    }
