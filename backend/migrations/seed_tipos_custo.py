"""
Script para popular as 30 rubricas padrão de custos.
"""

import sys
from pathlib import Path

# Adicionar o diretório pai ao path para imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.core.config import settings


# Definição das 30 rubricas padrão
RUBRICAS = [
    # REMUNERAÇÃO BASE (1-5)
    {
        "codigo": "SALARIO",
        "nome": "Salários e Ordenados",
        "descricao": "Salário base multiplicado pelo HC Folha",
        "categoria": "REMUNERACAO",
        "tipo_calculo": "HC_X_SALARIO",
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": True,
        "reflexo_13": True,
        "ordem": 1,
    },
    {
        "codigo": "HE_50",
        "nome": "Horas Extras 50%",
        "descricao": "Horas extras com adicional de 50%",
        "categoria": "REMUNERACAO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": True,
        "reflexo_13": True,
        "ordem": 2,
    },
    {
        "codigo": "HE_100",
        "nome": "Horas Extras 100%",
        "descricao": "Horas extras em feriados com adicional de 100%",
        "categoria": "REMUNERACAO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": True,
        "reflexo_13": True,
        "ordem": 3,
    },
    {
        "codigo": "DSR",
        "nome": "D.S.R. sobre Horas Extras",
        "descricao": "Descanso Semanal Remunerado sobre horas extras",
        "categoria": "REMUNERACAO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": True,
        "reflexo_13": True,
        "ordem": 4,
    },
    {
        "codigo": "HONORARIOS",
        "nome": "Honorários PJ",
        "descricao": "Remuneração de funcionários PJ",
        "categoria": "REMUNERACAO",
        "tipo_calculo": "HC_X_SALARIO",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 5,
    },
    
    # BENEFÍCIOS (6-10)
    {
        "codigo": "VT",
        "nome": "Vale Transporte",
        "descricao": "Vale transporte por dia trabalhado",
        "categoria": "BENEFICIO",
        "tipo_calculo": "HC_X_VALOR",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 6,
    },
    {
        "codigo": "VR",
        "nome": "Vale Refeição",
        "descricao": "Vale refeição por dia trabalhado",
        "categoria": "BENEFICIO",
        "tipo_calculo": "HC_X_VALOR",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 7,
    },
    {
        "codigo": "AM",
        "nome": "Assistência Médica/Odonto",
        "descricao": "Plano de saúde e odontológico",
        "categoria": "BENEFICIO",
        "tipo_calculo": "HC_X_VALOR",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 8,
    },
    {
        "codigo": "CRECHE",
        "nome": "Auxílio Creche",
        "descricao": "Auxílio para funcionários com filhos menores de 6 anos",
        "categoria": "BENEFICIO",
        "tipo_calculo": "HC_X_VALOR",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 9,
    },
    {
        "codigo": "HO",
        "nome": "Auxílio Home Office",
        "descricao": "Ajuda de custo para trabalho remoto",
        "categoria": "BENEFICIO",
        "tipo_calculo": "HC_X_VALOR",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 10,
    },
    
    # ENCARGOS (11-14)
    {
        "codigo": "FGTS",
        "nome": "FGTS 8%",
        "descricao": "Fundo de Garantia por Tempo de Serviço",
        "categoria": "ENCARGO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 8.0,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 11,
    },
    {
        "codigo": "INSS_EMP",
        "nome": "INSS Empresa 20%",
        "descricao": "Contribuição patronal ao INSS",
        "categoria": "ENCARGO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 20.0,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 12,
    },
    {
        "codigo": "INSS_TERC",
        "nome": "INSS Terceiros 5,8%",
        "descricao": "Contribuição a terceiros (Sistema S, INCRA, etc.)",
        "categoria": "ENCARGO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 5.8,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 13,
    },
    {
        "codigo": "SAT_RAT",
        "nome": "SAT/RAT 3%",
        "descricao": "Seguro de Acidente de Trabalho",
        "categoria": "ENCARGO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 3.0,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 14,
    },
    
    # PROVISÕES (15-23)
    {
        "codigo": "PROV_FERIAS",
        "nome": "Provisão Férias",
        "descricao": "Provisão mensal de férias (11,11%)",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 11.11,
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 15,
    },
    {
        "codigo": "FGTS_FERIAS",
        "nome": "FGTS sobre Férias",
        "descricao": "FGTS incidente sobre provisão de férias",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 8.0,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 16,
    },
    {
        "codigo": "INSS_FERIAS",
        "nome": "INSS sobre Férias",
        "descricao": "INSS incidente sobre provisão de férias (28,8%)",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 28.8,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 17,
    },
    {
        "codigo": "PROV_13",
        "nome": "Provisão 13º Salário",
        "descricao": "Provisão mensal de 13º (8,33%)",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 8.33,
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 18,
    },
    {
        "codigo": "FGTS_13",
        "nome": "FGTS sobre 13º",
        "descricao": "FGTS incidente sobre provisão de 13º",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 8.0,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 19,
    },
    {
        "codigo": "INSS_13",
        "nome": "INSS sobre 13º",
        "descricao": "INSS incidente sobre provisão de 13º (28,8%)",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "aliquota_padrao": 28.8,
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 20,
    },
    {
        "codigo": "INDENIZ",
        "nome": "Indenizações Trabalhistas",
        "descricao": "Provisão para demandas trabalhistas",
        "categoria": "PROVISAO",
        "tipo_calculo": "PERCENTUAL_RUBRICA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 21,
    },
    {
        "codigo": "AVISO_IND",
        "nome": "Aviso Prévio Indenizado",
        "descricao": "Provisão para aviso prévio indenizado (demissões pela empresa)",
        "categoria": "PROVISAO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": True,
        "incide_inss": True,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 22,
    },
    {
        "codigo": "MULTA_FGTS",
        "nome": "Multa 40% FGTS",
        "descricao": "Provisão para multa rescisória de FGTS",
        "categoria": "PROVISAO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 23,
    },
    
    # PRÊMIOS (24-25)
    {
        "codigo": "BONUS_PLR",
        "nome": "Bônus / PLR",
        "descricao": "Bônus e Participação nos Lucros e Resultados",
        "categoria": "PREMIO",
        "tipo_calculo": "PERCENTUAL_RECEITA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 24,
    },
    {
        "codigo": "PREMIOS",
        "nome": "Prêmios e Gratificações",
        "descricao": "Prêmios por desempenho e gratificações",
        "categoria": "PREMIO",
        "tipo_calculo": "PERCENTUAL_RECEITA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 25,
    },
    
    # DESCONTOS (26-30)
    {
        "codigo": "DESC_480",
        "nome": "Desconto Art. 480 CLT",
        "descricao": "Desconto por pedido de demissão em período de experiência",
        "categoria": "DESCONTO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 26,
    },
    {
        "codigo": "DESC_AVISO",
        "nome": "Desconto Aviso Prévio",
        "descricao": "Desconto por não cumprimento de aviso prévio",
        "categoria": "DESCONTO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 27,
    },
    {
        "codigo": "DESC_FALTAS",
        "nome": "Desconto Dias Faltas",
        "descricao": "Desconto por faltas injustificadas",
        "categoria": "DESCONTO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 28,
    },
    {
        "codigo": "DESC_VT",
        "nome": "Desconto Vale Transporte",
        "descricao": "Desconto de VT do funcionário (6% do salário, limitado ao VT)",
        "categoria": "DESCONTO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 29,
    },
    {
        "codigo": "DESC_VR",
        "nome": "Desconto Vale Refeição",
        "descricao": "Desconto de VR do funcionário",
        "categoria": "DESCONTO",
        "tipo_calculo": "FORMULA",
        "incide_fgts": False,
        "incide_inss": False,
        "reflexo_ferias": False,
        "reflexo_13": False,
        "ordem": 30,
    },
]


def seed_tipos_custo():
    """Popula a tabela tipos_custo com as rubricas padrão."""
    
    # Criar engine síncrono para seed
    database_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(database_url, echo=False)
    
    print("=" * 60)
    print("Populando tipos de custo (rubricas)")
    print("=" * 60)
    
    with engine.connect() as conn:
        for rubrica in RUBRICAS:
            # Verificar se já existe
            try:
                result = conn.execute(
                    text("SELECT id FROM tipos_custo WHERE codigo = :codigo"),
                    {"codigo": rubrica["codigo"]}
                )
                existe = result.fetchone()
                
                if existe:
                    print(f"  [SKIP] {rubrica['codigo']} - já existe")
                    continue
            except Exception:
                # Ignorar erro e tentar inserir
                conn.rollback()
            
            # Inserir nova rubrica com UUID gerado
            cols = ["id"] + list(rubrica.keys())
            vals = ["gen_random_uuid()"] + [f":{c}" for c in rubrica.keys()]
            vals_str = ", ".join(vals)
            col_names = ", ".join(cols)
            
            try:
                conn.execute(
                    text(f"INSERT INTO tipos_custo ({col_names}) VALUES ({vals_str})"),
                    rubrica
                )
                conn.commit()
                print(f"  [OK] {rubrica['codigo']} - {rubrica['nome']}")
            except Exception as e:
                conn.rollback()
                print(f"  [ERRO] {rubrica['codigo']}: {e}")
    
    print("\n" + "=" * 60)
    print("Seed concluído!")
    print("=" * 60)


if __name__ == "__main__":
    seed_tipos_custo()

