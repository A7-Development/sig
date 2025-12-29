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
        self._premissas_cache: Dict[tuple, Dict] = {}  # Cache de premissas: (funcao_id, mes) -> dados
    
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
    
    async def _carregar_premissas_secao(
        self, 
        cenario_id: UUID, 
        cenario_secao_id: UUID, 
        ano: int
    ) -> None:
        """
        Pré-carrega TODAS as premissas de uma seção de uma vez.
        Otimização: evita N queries (1 por função/mês) substituindo por 1 query.
        """
        self._premissas_cache = {}
        
        result = await self.db.execute(
            select(PremissaFuncaoMes).where(
                PremissaFuncaoMes.cenario_id == cenario_id,
                PremissaFuncaoMes.cenario_secao_id == cenario_secao_id,
                PremissaFuncaoMes.ano == ano
            )
        )
        premissas = result.scalars().all()
        
        # Indexar por (funcao_id, mes) para acesso O(1)
        for p in premissas:
            key = (p.funcao_id, p.mes)
            self._premissas_cache[key] = {
                'absenteismo': float(p.absenteismo or 0),
                'abs_pct_justificado': float(p.abs_pct_justificado or 75),
                'turnover': float(p.turnover or 0),
                'ferias_indice': float(p.ferias_indice or 8.33),
                'dias_treinamento': p.dias_treinamento,
            }
    
    def _get_premissa_cached(self, funcao_id: UUID, mes: int) -> Optional[Dict]:
        """Obtém premissa do cache (acesso O(1))."""
        return self._premissas_cache.get((funcao_id, mes))
    
    async def _calcular_custos_secao(
        self, 
        cenario_id: UUID, 
        cenario_secao_id: UUID,
        ano: int
    ) -> List[CustoCalculado]:
        """Calcula custos para uma seção específica."""
        
        # OTIMIZAÇÃO: Pré-carregar todas as premissas de uma vez
        await self._carregar_premissas_secao(cenario_id, cenario_secao_id, ano)
        
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
                
                # OTIMIZAÇÃO: Usar premissa do cache (sem query)
                premissa = self._get_premissa_cached(quadro.funcao_id, mes)
                
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
                            centro_custo_id=quadro.centro_custo_id,  # CC do quadro de pessoal
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
                                "centro_custo_id": str(quadro.centro_custo_id) if quadro.centro_custo_id else None,
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
            # FGTS - alíquota do cadastro (padrão 8%)
            base = self._calcular_base_encargo("incide_fgts")
            aliquota = self._get_aliquota(tipo, 8.0)
            return base * aliquota
        
        elif codigo == COD_INSS_EMP:
            # INSS Empresa - alíquota do cadastro (padrão 20%)
            base = self._calcular_base_encargo("incide_inss")
            aliquota = self._get_aliquota(tipo, 20.0)
            return base * aliquota
        
        elif codigo == COD_INSS_TERC:
            # INSS Terceiros - alíquota do cadastro (padrão 5.8%)
            base = self._calcular_base_encargo("incide_inss")
            aliquota = self._get_aliquota(tipo, 5.8)
            return base * aliquota
        
        elif codigo == COD_SAT_RAT:
            # SAT/RAT - alíquota do cadastro (padrão 3%)
            base = self._calcular_base_encargo("incide_inss")
            aliquota = self._get_aliquota(tipo, 3.0)
            return base * aliquota
        
        # ============================================
        # PROVISÕES
        # ============================================
        
        elif codigo == COD_PROV_FERIAS:
            # Provisão Férias - alíquota do cadastro (padrão 11.11% = 1/12 + 1/3)
            base = self._calcular_base_reflexo("reflexo_ferias")
            aliquota = self._get_aliquota(tipo, 11.11)
            return base * aliquota
        
        elif codigo == COD_FGTS_FERIAS:
            # FGTS sobre Férias - alíquota do cadastro (padrão 8%)
            prov_ferias = self._custos_calculados.get(COD_PROV_FERIAS, Decimal(0))
            aliquota = self._get_aliquota(tipo, 8.0)
            return float(prov_ferias) * aliquota
        
        elif codigo == COD_INSS_FERIAS:
            # INSS sobre Férias - alíquota do cadastro (padrão 28.8%)
            prov_ferias = self._custos_calculados.get(COD_PROV_FERIAS, Decimal(0))
            aliquota = self._get_aliquota(tipo, 28.8)
            return float(prov_ferias) * aliquota
        
        elif codigo == COD_PROV_13:
            # Provisão 13º - alíquota do cadastro (padrão 8.33%)
            base = self._calcular_base_reflexo("reflexo_13")
            aliquota = self._get_aliquota(tipo, 8.33)
            return base * aliquota
        
        elif codigo == COD_FGTS_13:
            # FGTS sobre 13º - alíquota do cadastro (padrão 8%)
            prov_13 = self._custos_calculados.get(COD_PROV_13, Decimal(0))
            aliquota = self._get_aliquota(tipo, 8.0)
            return float(prov_13) * aliquota
        
        elif codigo == COD_INSS_13:
            # INSS sobre 13º - alíquota do cadastro (padrão 28.8%)
            prov_13 = self._custos_calculados.get(COD_PROV_13, Decimal(0))
            aliquota = self._get_aliquota(tipo, 28.8)
            return float(prov_13) * aliquota
        
        elif codigo == COD_INDENIZ:
            # Indenizações Trabalhistas - alíquota do cadastro sobre o Salário (0001)
            salario_total = self._custos_calculados.get(COD_SALARIO, Decimal(0))
            aliquota = self._get_aliquota(tipo, 0)  # Padrão 0 se não cadastrado
            return float(salario_total) * aliquota
        
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
    
    def _get_aliquota(self, tipo: TipoCusto, padrao: float) -> float:
        """
        Obtém a alíquota do cadastro do evento (tipos_custo.aliquota_padrao).
        Se não houver alíquota cadastrada, usa o valor padrão.
        
        Args:
            tipo: Objeto TipoCusto
            padrao: Valor padrão caso não haja alíquota cadastrada
        
        Returns:
            Alíquota em decimal (ex: 8.33% retorna 0.0833)
        """
        if tipo and tipo.aliquota_padrao is not None:
            return float(tipo.aliquota_padrao) / 100
        return padrao / 100
    
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
    from sqlalchemy import delete
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    
    service = CalculoCustosService(db)
    
    # Limpar custos anteriores
    stmt = delete(CustoCalculado).where(CustoCalculado.cenario_id == cenario_id)
    if cenario_secao_id:
        stmt = stmt.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    await db.execute(stmt)
    
    # Calcular novos custos
    custos = await service.calcular_custos_cenario(cenario_id, cenario_secao_id, ano)
    
    if not custos:
        await db.commit()
        return 0
    
    # OTIMIZAÇÃO: Bulk insert em vez de add() individual
    # Converter objetos para dicts para bulk insert
    BATCH_SIZE = 1000  # Inserir em lotes para evitar memory issues
    
    for i in range(0, len(custos), BATCH_SIZE):
        batch = custos[i:i + BATCH_SIZE]
        valores = [
            {
                "cenario_id": c.cenario_id,
                "cenario_secao_id": c.cenario_secao_id,
                "funcao_id": c.funcao_id,
                "faixa_id": c.faixa_id,
                "tipo_custo_id": c.tipo_custo_id,
                "centro_custo_id": c.centro_custo_id,
                "mes": c.mes,
                "ano": c.ano,
                "hc_base": c.hc_base,
                "valor_base": c.valor_base,
                "indice_aplicado": c.indice_aplicado,
                "valor_calculado": c.valor_calculado,
                "memoria_calculo": c.memoria_calculo,
            }
            for c in batch
        ]
        
        # Usar insert nativo do SQLAlchemy (funciona com qualquer banco)
        await db.execute(
            CustoCalculado.__table__.insert(),
            valores
        )
    
    await db.commit()
    
    # Aplicar rateio de custos de CCs POOL para CCs operacionais
    resumo_rateio = await aplicar_rateio_custos(db, cenario_id)
    
    return {
        "quantidade": len(custos),
        "rateio": resumo_rateio
    }


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
    from sqlalchemy import delete
    
    service = CalculoCustosService(db)
    
    # Limpar custos anteriores
    stmt = delete(CustoCalculado).where(CustoCalculado.cenario_id == cenario_id)
    if cenario_secao_id:
        stmt = stmt.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    await db.execute(stmt)
    
    # Calcular novos custos
    custos = await service.calcular_custos_cenario(cenario_id, cenario_secao_id, ano)
    
    if custos:
        # OTIMIZAÇÃO: Bulk insert em vez de add() individual
        BATCH_SIZE = 1000
        
        for i in range(0, len(custos), BATCH_SIZE):
            batch = custos[i:i + BATCH_SIZE]
            valores = [
                {
                    "cenario_id": c.cenario_id,
                    "cenario_secao_id": c.cenario_secao_id,
                    "funcao_id": c.funcao_id,
                    "faixa_id": c.faixa_id,
                    "tipo_custo_id": c.tipo_custo_id,
                    "centro_custo_id": c.centro_custo_id,
                    "mes": c.mes,
                    "ano": c.ano,
                    "hc_base": c.hc_base,
                    "valor_base": c.valor_base,
                    "indice_aplicado": c.indice_aplicado,
                    "valor_calculado": c.valor_calculado,
                    "memoria_calculo": c.memoria_calculo,
                }
                for c in batch
            ]
            
            await db.execute(
                CustoCalculado.__table__.insert(),
                valores
            )
    
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


# ============================================
# RATEIO DE CUSTOS (POOL -> OPERACIONAL)
# ============================================

async def _calcular_percentuais_rateio(
    db: AsyncSession,
    grupo,  # RateioGrupo
    cenario_id: UUID
) -> Dict[UUID, float]:
    """
    Calcula os percentuais de rateio para cada CC destino baseado no tipo de rateio.
    
    Tipos suportados:
    - MANUAL: usa percentuais definidos em RateioDestino
    - HC: proporcional ao HC Folha de cada CC destino
    - AREA: proporcional à área (m²) de cada CC destino
    - PA: proporcional às Posições de Atendimento de cada CC destino
    
    Returns:
        Dict[cc_destino_id, percentual]
    """
    from app.db.models.orcamento import QuadroPessoal, CentroCusto
    
    tipo = grupo.tipo_rateio or "MANUAL"
    destinos_ids = [d.cc_destino_id for d in grupo.destinos]
    
    if tipo == "MANUAL":
        # Usa percentuais definidos manualmente
        return {d.cc_destino_id: float(d.percentual or 0) for d in grupo.destinos}
    
    elif tipo == "HC":
        # Proporcional ao HC Folha de cada CC destino
        MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
        
        # Buscar quadro de pessoal dos CCs destino
        result = await db.execute(
            select(QuadroPessoal).where(
                QuadroPessoal.cenario_id == cenario_id,
                QuadroPessoal.centro_custo_id.in_(destinos_ids),
                QuadroPessoal.ativo == True
            )
        )
        quadros = result.scalars().all()
        
        # Calcular HC médio por CC
        hc_por_cc: Dict[UUID, float] = {cc_id: 0.0 for cc_id in destinos_ids}
        for q in quadros:
            cc_id = q.centro_custo_id
            if cc_id:
                hc_total = sum(float(getattr(q, f"qtd_{mes}", 0) or 0) for mes in MESES)
                hc_medio = hc_total / 12  # Média mensal
                hc_por_cc[cc_id] = hc_por_cc.get(cc_id, 0.0) + hc_medio
        
        # Calcular percentuais
        total_hc = sum(hc_por_cc.values())
        if total_hc > 0:
            return {cc_id: (hc / total_hc) * 100 for cc_id, hc in hc_por_cc.items()}
        else:
            # Se não há HC, distribui igualmente
            n = len(destinos_ids)
            return {cc_id: 100 / n for cc_id in destinos_ids} if n > 0 else {}
    
    elif tipo == "AREA":
        # Proporcional à área (m²) de cada CC destino
        result = await db.execute(
            select(CentroCusto).where(CentroCusto.id.in_(destinos_ids))
        )
        ccs = result.scalars().all()
        
        area_por_cc: Dict[UUID, float] = {}
        for cc in ccs:
            area_por_cc[cc.id] = float(cc.area_m2 or 0)
        
        # Calcular percentuais
        total_area = sum(area_por_cc.values())
        if total_area > 0:
            return {cc_id: (area / total_area) * 100 for cc_id, area in area_por_cc.items()}
        else:
            # Se não há área cadastrada, distribui igualmente
            n = len(destinos_ids)
            return {cc_id: 100 / n for cc_id in destinos_ids} if n > 0 else {}
    
    elif tipo == "PA":
        # Proporcional às Posições de Atendimento de cada CC destino
        MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
        
        # Buscar quadro de pessoal dos CCs destino
        result = await db.execute(
            select(QuadroPessoal).where(
                QuadroPessoal.cenario_id == cenario_id,
                QuadroPessoal.centro_custo_id.in_(destinos_ids),
                QuadroPessoal.ativo == True
            )
        )
        quadros = result.scalars().all()
        
        # Calcular PAs por CC (HC / fator_pa)
        pa_por_cc: Dict[UUID, float] = {cc_id: 0.0 for cc_id in destinos_ids}
        for q in quadros:
            cc_id = q.centro_custo_id
            if cc_id:
                fator_pa = float(q.fator_pa or 1.0)
                if fator_pa <= 0:
                    fator_pa = 1.0
                hc_total = sum(float(getattr(q, f"qtd_{mes}", 0) or 0) for mes in MESES)
                hc_medio = hc_total / 12
                pa_medio = hc_medio / fator_pa
                pa_por_cc[cc_id] = pa_por_cc.get(cc_id, 0.0) + pa_medio
        
        # Calcular percentuais
        total_pa = sum(pa_por_cc.values())
        if total_pa > 0:
            return {cc_id: (pa / total_pa) * 100 for cc_id, pa in pa_por_cc.items()}
        else:
            # Se não há PAs, distribui igualmente
            n = len(destinos_ids)
            return {cc_id: 100 / n for cc_id in destinos_ids} if n > 0 else {}
    
    # Fallback: distribui igualmente
    n = len(destinos_ids)
    return {cc_id: 100 / n for cc_id in destinos_ids} if n > 0 else {}


async def aplicar_rateio_custos(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict[str, Any]:
    """
    Aplica os rateios configurados para distribuir custos de CCs POOL para CCs OPERACIONAIS.
    
    Suporta 4 tipos de rateio:
    - MANUAL: percentuais definidos pelo usuário
    - HC: proporcional ao HC Folha de cada CC destino
    - AREA: proporcional à área (m²) de cada CC destino
    - PA: proporcional às Posições de Atendimento de cada CC destino
    
    Esta função:
    1. Busca todos os grupos de rateio ativos do cenário
    2. Para cada grupo, calcula os percentuais baseado no tipo de rateio
    3. Busca custos do CC POOL de origem
    4. Distribui proporcionalmente para os CCs OPERACIONAIS de destino
    5. Cria registros de CustoCalculado com os valores rateados
    
    Returns:
        Dict com resumo do rateio aplicado
    """
    from app.db.models.orcamento import RateioGrupo, RateioDestino, CentroCusto
    
    # Buscar grupos de rateio ativos
    result = await db.execute(
        select(RateioGrupo)
        .where(
            RateioGrupo.cenario_id == cenario_id,
            RateioGrupo.ativo == True
        )
        .options(
            selectinload(RateioGrupo.destinos).selectinload(RateioDestino.cc_destino),
            selectinload(RateioGrupo.cc_origem)
        )
    )
    grupos = result.scalars().all()
    
    resumo = {
        "grupos_processados": 0,
        "custos_rateados": 0,
        "valor_total_rateado": Decimal("0"),
        "detalhes_grupos": [],
        "erros": []
    }
    
    for grupo in grupos:
        if not grupo.destinos:
            resumo["erros"].append(f"Grupo '{grupo.nome}' não tem destinos configurados")
            continue
        
        # Calcular percentuais baseado no tipo de rateio
        tipo_rateio = grupo.tipo_rateio or "MANUAL"
        percentuais = await _calcular_percentuais_rateio(db, grupo, cenario_id)
        
        # Verificar se percentuais somam 100%
        total_pct = sum(percentuais.values())
        if abs(total_pct - 100.0) > 0.01 and tipo_rateio == "MANUAL":
            resumo["erros"].append(f"Grupo '{grupo.nome}' tem percentual total de {total_pct:.2f}% (deve ser 100%)")
            continue
        
        # Normalizar percentuais para somar exatamente 100% (para tipos calculados)
        if total_pct > 0 and tipo_rateio != "MANUAL":
            fator = 100.0 / total_pct
            percentuais = {cc_id: pct * fator for cc_id, pct in percentuais.items()}
        
        # Buscar custos calculados do CC origem (POOL)
        custos_origem = await db.execute(
            select(CustoCalculado).where(
                CustoCalculado.cenario_id == cenario_id,
                CustoCalculado.centro_custo_id == grupo.cc_origem_pool_id
            )
        )
        custos_pool = custos_origem.scalars().all()
        
        # Buscar custos diretos do CC origem (POOL) - ex: Aluguel
        from app.db.models.orcamento import CustoDireto, ProdutoTecnologia, TipoCusto
        
        custos_diretos_origem = await db.execute(
            select(CustoDireto, ProdutoTecnologia).join(
                ProdutoTecnologia, CustoDireto.item_custo_id == ProdutoTecnologia.id
            ).where(
                CustoDireto.cenario_id == cenario_id,
                CustoDireto.centro_custo_id == grupo.cc_origem_pool_id,
                CustoDireto.ativo == True
            )
        )
        custos_diretos_pool = custos_diretos_origem.fetchall()
        
        # Buscar o cenário para obter o ano
        cenario = await db.get(Cenario, cenario_id)
        ano_cenario = cenario.ano_inicio if cenario else 2026
        
        if not custos_pool and not custos_diretos_pool:
            continue
        
        grupo_detalhe = {
            "nome": grupo.nome,
            "tipo_rateio": tipo_rateio,
            "cc_origem": grupo.cc_origem.nome if grupo.cc_origem else str(grupo.cc_origem_pool_id),
            "custos_origem": len(custos_pool) + len(custos_diretos_pool),
            "destinos": []
        }
        
        # Para cada custo calculado, criar rateios nos destinos
        for custo_original in custos_pool:
            for destino in grupo.destinos:
                cc_destino_id = destino.cc_destino_id
                percentual = percentuais.get(cc_destino_id, 0)
                
                if percentual <= 0:
                    continue
                
                valor_rateado = custo_original.valor_calculado * Decimal(str(percentual / 100))
                
                # Criar novo registro de custo rateado
                custo_rateado = CustoCalculado(
                    cenario_id=cenario_id,
                    cenario_secao_id=custo_original.cenario_secao_id,
                    funcao_id=custo_original.funcao_id,
                    faixa_id=custo_original.faixa_id,
                    tipo_custo_id=custo_original.tipo_custo_id,
                    centro_custo_id=cc_destino_id,
                    mes=custo_original.mes,
                    ano=custo_original.ano,
                    hc_base=custo_original.hc_base * Decimal(str(percentual / 100)),
                    valor_base=custo_original.valor_base,
                    indice_aplicado=custo_original.indice_aplicado,
                    valor_calculado=valor_rateado,
                    memoria_calculo={
                        "tipo": "rateio",
                        "tipo_rateio": tipo_rateio,
                        "grupo_rateio": str(grupo.id),
                        "grupo_nome": grupo.nome,
                        "cc_origem": str(grupo.cc_origem_pool_id),
                        "cc_destino": str(cc_destino_id),
                        "percentual": round(percentual, 2),
                        "custo_original_id": str(custo_original.id),
                    }
                )
                db.add(custo_rateado)
                resumo["custos_rateados"] += 1
                resumo["valor_total_rateado"] += valor_rateado
        
        # Para cada custo direto (ex: Aluguel), criar rateios nos destinos
        for custo_direto, produto in custos_diretos_pool:
            # Buscar ou criar TipoCusto correspondente ao produto
            tipo_custo_result = await db.execute(
                select(TipoCusto).where(
                    TipoCusto.codigo == f"CD_{produto.codigo}"
                )
            )
            tipo_custo = tipo_custo_result.scalar_one_or_none()
            
            if not tipo_custo:
                # Criar TipoCusto para o custo direto
                tipo_custo = TipoCusto(
                    codigo=f"CD_{produto.codigo}",
                    nome=produto.nome,
                    categoria=produto.categoria or "CUSTO_DIRETO",
                    tipo_calculo="HC_X_VALOR",
                    conta_contabil_codigo=produto.conta_contabil_codigo,
                    conta_contabil_descricao=produto.conta_contabil_descricao,
                    ativo=True
                )
                db.add(tipo_custo)
                await db.flush()
            
            # Calcular valor mensal
            valor_mensal = Decimal(str(custo_direto.valor_fixo or 0))
            if custo_direto.tipo_valor in ["VARIAVEL", "FIXO_VARIAVEL"] and custo_direto.valor_unitario_variavel:
                # TODO: Calcular baseado no HC/PA real
                valor_mensal += Decimal(str(custo_direto.valor_unitario_variavel or 0)) * 100
            
            # Criar custo rateado para cada mês e cada destino
            for mes in range(1, 13):
                for destino in grupo.destinos:
                    cc_destino_id = destino.cc_destino_id
                    percentual = percentuais.get(cc_destino_id, 0)
                    
                    if percentual <= 0:
                        continue
                    
                    valor_rateado = valor_mensal * Decimal(str(percentual / 100))
                    
                    custo_rateado = CustoCalculado(
                        cenario_id=cenario_id,
                        cenario_secao_id=custo_direto.cenario_secao_id,
                        funcao_id=None,
                        faixa_id=None,
                        tipo_custo_id=tipo_custo.id,
                        centro_custo_id=cc_destino_id,
                        mes=mes,
                        ano=ano_cenario,
                        hc_base=Decimal("0"),
                        valor_base=valor_mensal,
                        indice_aplicado=Decimal(str(percentual / 100)),
                        valor_calculado=valor_rateado,
                        memoria_calculo={
                            "tipo": "rateio",
                            "tipo_rateio": tipo_rateio,
                            "grupo_rateio": str(grupo.id),
                            "grupo_nome": grupo.nome,
                            "cc_origem": str(grupo.cc_origem_pool_id),
                            "cc_destino": str(cc_destino_id),
                            "percentual": round(percentual, 2),
                            "custo_direto_id": str(custo_direto.id),
                            "produto_nome": produto.nome,
                        }
                    )
                    db.add(custo_rateado)
                    resumo["custos_rateados"] += 1
                    resumo["valor_total_rateado"] += valor_rateado
        
        # Registrar detalhes do grupo
        for destino in grupo.destinos:
            cc_nome = destino.cc_destino.nome if destino.cc_destino else str(destino.cc_destino_id)
            pct = percentuais.get(destino.cc_destino_id, 0)
            grupo_detalhe["destinos"].append({
                "cc_nome": cc_nome,
                "percentual": round(pct, 2)
            })
        
        resumo["detalhes_grupos"].append(grupo_detalhe)
        resumo["grupos_processados"] += 1
    
    await db.commit()
    
    resumo["valor_total_rateado"] = float(resumo["valor_total_rateado"])
    return resumo
