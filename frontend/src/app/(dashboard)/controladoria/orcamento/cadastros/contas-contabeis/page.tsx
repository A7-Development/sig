"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, Search, Loader2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContaContabil {
  codigo: string;
  descricao: string;
  nivel1: string | null;
  nivel2: string | null;
  nivel3: string | null;
  nivel4: string | null;
  nivel5: string | null;
}

export default function ContasContabeisPage() {
  const [busca, setBusca] = useState("");

  // Buscar contas contábeis
  const { data: contas = [], isLoading, error } = useQuery<ContaContabil[]>({
    queryKey: ["contas-contabeis-lista", busca],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (busca.length >= 2) params.append("busca", busca);
      params.append("limit", "500");
      return api.get<ContaContabil[]>(`/api/v1/orcamento/nw/contas-contabeis?${params}`);
    },
    enabled: true,
  });

  const getNiveis = (conta: ContaContabil): string[] => {
    const niveis = [conta.nivel1, conta.nivel2, conta.nivel3, conta.nivel4, conta.nivel5];
    return niveis.filter((n): n is string => n !== null && n !== "");
  };

  const getNivelBadgeColor = (idx: number) => {
    switch (idx) {
      case 0: return "bg-blue-50 text-blue-700 border-blue-200";
      case 1: return "bg-green-50 text-green-700 border-green-200";
      case 2: return "bg-purple-50 text-purple-700 border-purple-200";
      case 3: return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Contas Contábeis</h1>
          <p className="text-sm text-muted-foreground">
            Consulta de contas contábeis do sistema NW (somente leitura)
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 gap-1">
                <Info className="size-3" />
                View NW
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Dados vêm da view vw_conta_contabil_niveis</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title flex items-center gap-2">
                <BookOpen className="size-4" />
                Plano de Contas ({contas.length} contas)
              </CardTitle>
              <CardDescription>
                As contas são obtidas diretamente do NW e não podem ser editadas aqui
              </CardDescription>
            </div>
            <div className="relative w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição (mín. 2 caracteres)..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="empty-state">
              <BookOpen className="size-12 text-red-500/50 mx-auto mb-4" />
              <p className="text-red-500">
                Erro ao carregar contas. Verifique a conexão com o NW.
              </p>
            </div>
          ) : contas.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {busca.length < 2
                  ? "Digite ao menos 2 caracteres para pesquisar"
                  : "Nenhuma conta encontrada"}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Hierarquia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.map((conta) => {
                    const niveis = getNiveis(conta);
                    return (
                      <TableRow key={conta.codigo}>
                        <TableCell className="font-mono text-xs">{conta.codigo}</TableCell>
                        <TableCell className="font-semibold text-sm">{conta.descricao}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {niveis.map((nivel, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-[9px] h-5 ${getNivelBadgeColor(idx)}`}
                              >
                                N{idx + 1}: {nivel}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-muted/20 mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="font-medium">Níveis hierárquicos:</span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="h-5 text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                N1
              </Badge>
              <span>Grupo</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="h-5 text-[9px] bg-green-50 text-green-700 border-green-200">
                N2
              </Badge>
              <span>Subgrupo</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="h-5 text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                N3
              </Badge>
              <span>Conta</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="h-5 text-[9px] bg-orange-50 text-orange-700 border-orange-200">
                N4
              </Badge>
              <span>Subconta</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="h-5 text-[9px] bg-gray-50 text-gray-700 border-gray-200">
                N5
              </Badge>
              <span>Analítica</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
