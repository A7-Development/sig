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
import { BookOpen, Search, RefreshCw, Info } from "lucide-react";
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas Contábeis</h1>
          <p className="text-sm text-muted-foreground">
            Consulta de contas contábeis do sistema NW (somente leitura)
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 gap-1">
                <Info className="h-3 w-3" />
                View NW
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Dados vêm da view vw_conta_contabil_niveis</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição (mín. 2 caracteres)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Contas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Plano de Contas ({contas.length} contas)
          </CardTitle>
          <CardDescription className="text-xs">
            As contas são obtidas diretamente do NW e não podem ser editadas aqui
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32 text-xs">Código</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Hierarquia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Carregando contas do NW...</span>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="text-red-500 text-sm">
                        Erro ao carregar contas. Verifique a conexão com o NW.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : contas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {busca.length < 2
                        ? "Digite ao menos 2 caracteres para pesquisar"
                        : "Nenhuma conta encontrada"}
                    </TableCell>
                  </TableRow>
                ) : (
                  contas.map((conta) => {
                    const niveis = getNiveis(conta);
                    return (
                      <TableRow key={conta.codigo} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{conta.codigo}</TableCell>
                        <TableCell className="text-xs">{conta.descricao}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {niveis.map((nivel, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-[9px] h-5 ${
                                  idx === 0
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : idx === 1
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : idx === 2
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : idx === 3
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }`}
                              >
                                N{idx + 1}: {nivel}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-muted/20">
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

