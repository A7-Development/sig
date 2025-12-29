"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Split, Users } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cenariosApi } from "@/lib/api/orcamento";

interface RateioFuncoesPanelProps {
  cenarioId: string;
  onGoToCapacity?: () => void;
}

interface GrupoRateio {
  id: string;
  funcaoNome: string;
  total: number;
  itens: { ccNome: string; percentual: number }[];
}

export function RateioFuncoesPanel({ cenarioId, onGoToCapacity }: RateioFuncoesPanelProps) {
  const { accessToken: token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<GrupoRateio[]>([]);

  useEffect(() => {
    const carregar = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const quadro = await cenariosApi.getQuadro(token, cenarioId);
        const rateios = quadro.filter((item) => item.tipo_calculo === "rateio" && item.rateio_grupo_id);

        const gruposMap = new Map<string, GrupoRateio>();
        rateios.forEach((item) => {
          if (!item.rateio_grupo_id) return;
          const grupo = gruposMap.get(item.rateio_grupo_id) || {
            id: item.rateio_grupo_id,
            funcaoNome: item.funcao?.nome || "Função",
            total: item.rateio_qtd_total || 0,
            itens: [],
          };
          grupo.itens.push({
            ccNome: item.centro_custo?.nome || "Centro de Custo",
            percentual: item.rateio_percentual || 0,
          });
          gruposMap.set(item.rateio_grupo_id, grupo);
        });

        setGrupos(Array.from(gruposMap.values()));
      } catch (error) {
        console.error("Erro ao carregar rateios de função:", error);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [token, cenarioId]);

  const totalRateios = useMemo(() => grupos.length, [grupos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Split className="h-4 w-4 text-amber-600" />
          Rateio de Funções
        </CardTitle>
        <CardDescription>
          Distribuições de headcount entre centros de custo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : totalRateios === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nenhuma função com rateio configurado.
          </div>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{grupo.funcaoNome}</p>
                  <p className="text-xs text-muted-foreground">
                    Total distribuído: {grupo.total}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {grupo.itens.length} CC(s)
                </Badge>
              </div>
              <div className="space-y-1">
                {grupo.itens.map((item, idx) => (
                  <div key={`${grupo.id}-${idx}`} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.ccNome}</span>
                    <span className="font-medium">{item.percentual}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          Ajustes detalhados são feitos na aba Capacity.
        </div>
        <Button variant="outline" size="sm" onClick={onGoToCapacity} disabled={!onGoToCapacity}>
          Ir para Capacity
        </Button>
      </CardContent>
    </Card>
  );
}
