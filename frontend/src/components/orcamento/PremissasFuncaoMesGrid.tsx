"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Save, AlertCircle, CheckCircle } from "lucide-react";
import { 
  type Funcao, 
  type PremissaFuncaoMes,
  type PremissaFuncaoMesCreate,
  cenariosApi
} from "@/lib/api/orcamento";
import { useAuthStore } from "@/stores/auth-store";

interface PremissasFuncaoMesGridProps {
  cenarioId: string;
  funcoes: Funcao[];
  anoInicio: number;
  mesInicio: number;
  anoFim: number;
  mesFim: number;
}

type MesData = {
  mes: number;
  ano: number;
  nome: string;
};

export function PremissasFuncaoMesGrid({
  cenarioId,
  funcoes,
  anoInicio,
  mesInicio,
  anoFim,
  mesFim,
}: PremissasFuncaoMesGridProps) {
  const { accessToken: token } = useAuthStore();
  const [premissas, setPremissas] = useState<PremissaFuncaoMes[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<Record<string, Partial<PremissaFuncaoMes>>>({});

  // Gerar lista de meses do período
  const meses: MesData[] = [];
  let anoAtual = anoInicio;
  let mesAtual = mesInicio;
  
  while (anoAtual < anoFim || (anoAtual === anoFim && mesAtual <= mesFim)) {
    const nomesMeses = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    meses.push({
      mes: mesAtual,
      ano: anoAtual,
      nome: nomesMeses[mesAtual - 1],
    });
    
    mesAtual++;
    if (mesAtual > 12) {
      mesAtual = 1;
      anoAtual++;
    }
  }

  useEffect(() => {
    if (token && cenarioId) {
      carregarPremissas();
    }
  }, [token, cenarioId]);

  const carregarPremissas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cenariosApi.getPremissasFuncao(token, cenarioId);
      setPremissas(data);
      
      // Inicializar valores padrão para células vazias
      const editandoInicial: Record<string, Partial<PremissaFuncaoMes>> = {};
      funcoes.forEach((funcao) => {
        meses.forEach((mesData) => {
          const key = `${funcao.id}_${mesData.mes}_${mesData.ano}`;
          const premissa = data.find(
            (p) =>
              p.funcao_id === funcao.id &&
              p.mes === mesData.mes &&
              p.ano === mesData.ano
          );
          if (premissa) {
            editandoInicial[key] = {
              absenteismo: premissa.absenteismo,
              turnover: premissa.turnover,
              ferias_indice: premissa.ferias_indice,
              dias_treinamento: premissa.dias_treinamento,
            };
          } else {
            // Valores padrão
            editandoInicial[key] = {
              absenteismo: 3.0,
              turnover: 5.0,
              ferias_indice: 8.33,
              dias_treinamento: 15,
            };
          }
        });
      });
      setEditando(editandoInicial);
    } catch (error) {
      console.error("Erro ao carregar premissas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (
    funcaoId: string,
    mes: number,
    ano: number,
    campo: keyof PremissaFuncaoMes,
    valor: number
  ) => {
    const key = `${funcaoId}_${mes}_${ano}`;
    setEditando((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [campo]: valor,
      },
    }));
  };

  const handleCopyMes = (mesOrigem: MesData, mesDestino: MesData) => {
    funcoes.forEach((funcao) => {
      const keyOrigem = `${funcao.id}_${mesOrigem.mes}_${mesOrigem.ano}`;
      const keyDestino = `${funcao.id}_${mesDestino.mes}_${mesDestino.ano}`;
      const valoresOrigem = editando[keyOrigem];
      if (valoresOrigem) {
        setEditando((prev) => ({
          ...prev,
          [keyDestino]: { ...valoresOrigem },
        }));
      }
    });
  };

  const handleSalvar = async () => {
    if (!token) return;
    setSalvando(true);
    try {
      const premissasParaSalvar: PremissaFuncaoMesCreate[] = [];
      
      funcoes.forEach((funcao) => {
        meses.forEach((mesData) => {
          const key = `${funcao.id}_${mesData.mes}_${mesData.ano}`;
          const valores = editando[key];
          if (valores) {
            premissasParaSalvar.push({
              cenario_id: cenarioId,
              funcao_id: funcao.id,
              mes: mesData.mes,
              ano: mesData.ano,
              absenteismo: valores.absenteismo || 3.0,
              turnover: valores.turnover || 5.0,
              ferias_indice: valores.ferias_indice || 8.33,
              dias_treinamento: valores.dias_treinamento || 15,
            });
          }
        });
      });

      await cenariosApi.bulkPremissasFuncao(token, cenarioId, premissasParaSalvar);
      await carregarPremissas();
      alert("Premissas salvas com sucesso!");
    } catch (error: any) {
      alert(error.message || "Erro ao salvar premissas");
    } finally {
      setSalvando(false);
    }
  };

  const funcoesAtivas = funcoes.filter((f) => f.ativo !== false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-4 border-b bg-muted/10">
        <div>
          <h2 className="section-title">Premissas por Função e Mês</h2>
          <p className="page-subtitle">
            Configure índices de ineficiência (ABS, TO) por função e por mês
          </p>
        </div>
        <Button
          size="sm"
          variant="success"
          onClick={handleSalvar}
          disabled={salvando}
        >
          <Save className="h-4 w-4 mr-1" />
          {salvando ? "Salvando..." : "Salvar Todas"}
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando premissas...</div>
        ) : funcoesAtivas.length === 0 ? (
          <div className="empty-state m-6">
            <AlertCircle className="empty-state-icon" />
            <p className="empty-state-title">Nenhuma função disponível</p>
            <p className="empty-state-description">
              Adicione funções ao quadro de pessoal primeiro
            </p>
          </div>
        ) : (
          <div className="p-4">
            <Table className="corporate-table">
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-muted/95 z-20">
                    Função
                  </TableHead>
                  {meses.map((mesData) => (
                    <TableHead key={`${mesData.ano}_${mesData.mes}`} className="text-center min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold">{mesData.nome}</span>
                        <span className="text-[10px] text-muted-foreground">{mesData.ano}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcoesAtivas.map((funcao) => (
                  <TableRow key={funcao.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      {funcao.nome}
                    </TableCell>
                    {meses.map((mesData) => {
                      const key = `${funcao.id}_${mesData.mes}_${mesData.ano}`;
                      const valores = editando[key] || {};
                      return (
                        <TableCell key={`${funcao.id}_${mesData.mes}_${mesData.ano}`} className="p-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <label className="text-[9px] text-muted-foreground w-8">ABS:</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={valores.absenteismo?.toFixed(1) || "3.0"}
                                onChange={(e) =>
                                  handleCellChange(
                                    funcao.id,
                                    mesData.mes,
                                    mesData.ano,
                                    "absenteismo",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-6 text-xs font-mono w-16"
                              />
                              <span className="text-[9px] text-muted-foreground">%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-[9px] text-muted-foreground w-8">TO:</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={valores.turnover?.toFixed(1) || "5.0"}
                                onChange={(e) =>
                                  handleCellChange(
                                    funcao.id,
                                    mesData.mes,
                                    mesData.ano,
                                    "turnover",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-6 text-xs font-mono w-16"
                              />
                              <span className="text-[9px] text-muted-foreground">%</span>
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="shrink-0 p-4 border-t bg-muted/10 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>ABS = Absenteísmo, TO = Turnover</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Valores são salvos em lote ao clicar em "Salvar Todas"</span>
          </div>
        </div>
      </div>
    </div>
  );
}








