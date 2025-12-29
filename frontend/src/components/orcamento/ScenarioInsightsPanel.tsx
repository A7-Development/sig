"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Clock, RefreshCw, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { custosApi, rateios, type DREResponse, type RateioGrupoComValidacao, type ValidacaoResponse } from "@/lib/api/orcamento";
import { cn } from "@/lib/utils";

interface ScenarioInsightsPanelProps {
  cenarioId: string;
  anoReferencia: number;
  refreshKey: number;
}

export function ScenarioInsightsPanel({ cenarioId, anoReferencia, refreshKey }: ScenarioInsightsPanelProps) {
  const { accessToken: token } = useAuthStore();
  const [dre, setDre] = useState<DREResponse | null>(null);
  const [validacao, setValidacao] = useState<ValidacaoResponse | null>(null);
  const [rateioGrupos, setRateioGrupos] = useState<RateioGrupoComValidacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const calcularResumo = useMemo(() => {
    if (!dre?.linhas?.length) {
      return { receitas: 0, custos: 0, resultado: dre?.total_geral || 0 };
    }
    const receitas = dre.linhas.reduce((acc, linha) => (linha.total > 0 ? acc + linha.total : acc), 0);
    const custos = dre.linhas.reduce((acc, linha) => (linha.total < 0 ? acc + Math.abs(linha.total) : acc), 0);
    return {
      receitas,
      custos,
      resultado: dre.total_geral,
    };
  }, [dre]);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const executarAtualizacao = async () => {
    if (!token || !cenarioId) return;
    setUpdating(true);
    try {
      await Promise.allSettled([
        custosApi.calcular(token, cenarioId, undefined, anoReferencia),
        custosApi.calcularTecnologia(token, cenarioId, undefined, anoReferencia),
      ]);

      const [dreData, validacaoData, rateiosData] = await Promise.all([
        custosApi.dre(token, cenarioId, undefined, anoReferencia),
        custosApi.validar(token, cenarioId),
        rateios.listar(token, cenarioId, false),
      ]);

      setDre(dreData);
      setValidacao(validacaoData);
      setRateioGrupos(rateiosData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Erro ao atualizar insights:", error);
    } finally {
      setUpdating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !cenarioId) return;

    setLoading(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      executarAtualizacao();
    }, 600);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [refreshKey, token, cenarioId, anoReferencia]);

  const rateiosInvalidos = rateioGrupos.filter((grupo) => !grupo.is_valido);
  const totalRateios = rateioGrupos.length;
  const checklistItems = [
    {
      label: "Políticas de benefícios",
      status: validacao?.tem_erros || validacao?.tem_avisos ? "warning" : "ok",
      description: validacao?.tem_erros || validacao?.tem_avisos
        ? `${validacao.total_funcoes_sem_politica} função(ões) sem política vinculada`
        : "Tudo certo para este cenário",
    },
    {
      label: "Rateios Pool configurados",
      status: totalRateios === 0 || rateiosInvalidos.length > 0 ? "warning" : "ok",
      description: totalRateios === 0
        ? "Nenhum rateio Pool definido"
        : rateiosInvalidos.length > 0
          ? `${rateiosInvalidos.length} rateio(s) com percentuais incompletos`
          : "Rateios válidos",
    },
  ];

  return (
    <div className="w-80 shrink-0 border-l bg-muted/10 h-full flex flex-col">
      <div className="p-4 space-y-4 overflow-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Resultado em tempo real
            </CardTitle>
            <CardDescription>
              Atualiza automaticamente ao ajustar o cenário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Receitas</p>
                    <p className="font-semibold text-green-700">
                      {formatCurrency(calcularResumo.receitas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custos</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(calcularResumo.custos)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Resultado</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    calcularResumo.resultado >= 0 ? "text-green-700" : "text-red-600"
                  )}>
                    {formatCurrency(calcularResumo.resultado)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastUpdated ? lastUpdated.toLocaleTimeString("pt-BR") : "—"}
                  </div>
                  <Button variant="ghost" size="xs" onClick={executarAtualizacao} disabled={updating}>
                    <RefreshCw className={cn("h-3 w-3 mr-1", updating && "animate-spin")} />
                    Atualizar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Checklist de consistência</CardTitle>
            <CardDescription>Itens que impactam o DRE final.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              checklistItems.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2",
                    item.status === "ok" ? "bg-green-50/60 border-green-200" : "bg-amber-50/60 border-amber-200"
                  )}
                >
                  {item.status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))
            )}
            {!loading && validacao?.items?.length ? (
              <Badge variant="outline" className="text-[10px]">
                {validacao.items.length} alerta(s) detalhado(s) no DRE
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
