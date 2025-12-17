"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Receipt, Search, Edit, BookOpen, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TipoCusto {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  tipo_calculo: string;
  conta_contabil_codigo: string | null;
  conta_contabil_descricao: string | null;
  incide_fgts: boolean;
  incide_inss: boolean;
  reflexo_ferias: boolean;
  reflexo_13: boolean;
  aliquota_padrao: number | null;
  ordem: number;
  ativo: boolean;
}

interface ContaContabil {
  codigo: string;
  descricao: string;
  nivel1: string | null;
  nivel2: string | null;
  nivel3: string | null;
  nivel4: string | null;
  nivel5: string | null;
}

const CATEGORIAS: Record<string, { label: string; color: string }> = {
  PROVENTO: { label: "Provento", color: "bg-blue-100 text-blue-700" },
  REMUNERACAO: { label: "Remuneração", color: "bg-blue-100 text-blue-700" },
  BENEFICIO: { label: "Benefício", color: "bg-green-100 text-green-700" },
  ENCARGO: { label: "Encargo", color: "bg-purple-100 text-purple-700" },
  PROVISAO: { label: "Provisão", color: "bg-orange-100 text-orange-700" },
  PREMIO: { label: "Prêmio", color: "bg-yellow-100 text-yellow-700" },
  DESCONTO: { label: "Desconto", color: "bg-red-100 text-red-700" },
};

export default function RubricasPage() {
  const queryClient = useQueryClient();
  const [filtroCategoria, setFiltroCategoria] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rubricaSelecionada, setRubricaSelecionada] = useState<TipoCusto | null>(null);
  const [dialogContasOpen, setDialogContasOpen] = useState(false);
  const [buscaConta, setBuscaConta] = useState("");

  // Buscar rubricas
  const { data: rubricas = [], isLoading } = useQuery<TipoCusto[]>({
    queryKey: ["tipos-custo", filtroCategoria],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroCategoria) params.append("categoria", filtroCategoria);
      const url = `/api/v1/orcamento/custos/tipos${params.toString() ? `?${params}` : ""}`;
      return api.get<TipoCusto[]>(url);
    },
  });

  // Buscar contas contábeis
  const { data: contas = [], isLoading: isLoadingContas } = useQuery<ContaContabil[]>({
    queryKey: ["contas-contabeis", buscaConta],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (buscaConta) params.append("busca", buscaConta);
      params.append("limit", "100");
      return api.get<ContaContabil[]>(`/api/v1/orcamento/nw/contas-contabeis?${params}`);
    },
    enabled: dialogContasOpen,
  });

  // Mutation para atualizar rubrica
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<TipoCusto> }) => {
      return api.put(`/api/v1/orcamento/custos/tipos/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-custo"] });
      toast.success("Rubrica atualizada com sucesso");
      setDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar rubrica");
    },
  });

  const rubricasFiltradas = rubricas.filter((r) =>
    busca
      ? r.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        r.nome.toLowerCase().includes(busca.toLowerCase())
      : true
  );

  const handleEditar = (rubrica: TipoCusto) => {
    setRubricaSelecionada({ ...rubrica });
    setDialogOpen(true);
  };

  const handleSalvar = () => {
    if (!rubricaSelecionada) return;
    updateMutation.mutate({
      id: rubricaSelecionada.id,
      updates: {
        conta_contabil_codigo: rubricaSelecionada.conta_contabil_codigo,
        conta_contabil_descricao: rubricaSelecionada.conta_contabil_descricao,
        incide_fgts: rubricaSelecionada.incide_fgts,
        incide_inss: rubricaSelecionada.incide_inss,
        reflexo_ferias: rubricaSelecionada.reflexo_ferias,
        reflexo_13: rubricaSelecionada.reflexo_13,
        aliquota_padrao: rubricaSelecionada.aliquota_padrao,
        ativo: rubricaSelecionada.ativo,
      },
    });
  };

  const handleSelecionarConta = (conta: ContaContabil) => {
    if (rubricaSelecionada) {
      setRubricaSelecionada({
        ...rubricaSelecionada,
        conta_contabil_codigo: conta.codigo,
        conta_contabil_descricao: conta.descricao,
      });
    }
    setDialogContasOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rubricas de Custo</h1>
          <p className="text-sm text-muted-foreground">
            Configure as rubricas de custo e vincule às contas contábeis
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select 
              value={filtroCategoria || "__all__"} 
              onValueChange={(val) => setFiltroCategoria(val === "__all__" ? "" : val)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as categorias</SelectItem>
                {Object.entries(CATEGORIAS).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Rubricas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Rubricas ({rubricasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20 text-xs">Código</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="w-28 text-xs">Categoria</TableHead>
                <TableHead className="w-32 text-xs text-center">Conta Contábil</TableHead>
                <TableHead className="w-16 text-xs text-center">FGTS</TableHead>
                <TableHead className="w-16 text-xs text-center">INSS</TableHead>
                <TableHead className="w-16 text-xs text-center">Férias</TableHead>
                <TableHead className="w-16 text-xs text-center">13º</TableHead>
                <TableHead className="w-20 text-xs text-center">Alíquota</TableHead>
                <TableHead className="w-16 text-xs text-center">Ativo</TableHead>
                <TableHead className="w-16 text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </TableCell>
                </TableRow>
              ) : rubricasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Nenhuma rubrica encontrada
                  </TableCell>
                </TableRow>
              ) : (
                rubricasFiltradas.map((rubrica) => (
                  <TableRow key={rubrica.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{rubrica.codigo}</TableCell>
                    <TableCell className="text-xs">{rubrica.nome}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${CATEGORIAS[rubrica.categoria]?.color || ""}`}
                      >
                        {CATEGORIAS[rubrica.categoria]?.label || rubrica.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.conta_contabil_codigo ? (
                        <span className="text-xs font-mono">{rubrica.conta_contabil_codigo}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.incide_fgts ? (
                        <Check className="h-4 w-4 mx-auto text-green-600" />
                      ) : (
                        <X className="h-4 w-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.incide_inss ? (
                        <Check className="h-4 w-4 mx-auto text-green-600" />
                      ) : (
                        <X className="h-4 w-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.reflexo_ferias ? (
                        <Check className="h-4 w-4 mx-auto text-green-600" />
                      ) : (
                        <X className="h-4 w-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.reflexo_13 ? (
                        <Check className="h-4 w-4 mx-auto text-green-600" />
                      ) : (
                        <X className="h-4 w-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {rubrica.aliquota_padrao ? `${rubrica.aliquota_padrao}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.ativo ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px]">
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 text-[10px]">
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditar(rubrica)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Rubrica</DialogTitle>
            <DialogDescription>
              {rubricaSelecionada?.codigo} - {rubricaSelecionada?.nome}
            </DialogDescription>
          </DialogHeader>

          {rubricaSelecionada && (
            <div className="space-y-4 py-4">
              {/* Conta Contábil */}
              <div className="space-y-2">
                <Label>Conta Contábil</Label>
                <div className="flex gap-2">
                  <Input
                    value={rubricaSelecionada.conta_contabil_codigo || ""}
                    placeholder="Selecione uma conta..."
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDialogContasOpen(true)}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </div>
                {rubricaSelecionada.conta_contabil_descricao && (
                  <p className="text-xs text-muted-foreground">
                    {rubricaSelecionada.conta_contabil_descricao}
                  </p>
                )}
              </div>

              {/* Alíquota */}
              <div className="space-y-2">
                <Label>Alíquota Padrão (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={rubricaSelecionada.aliquota_padrao || ""}
                  onChange={(e) =>
                    setRubricaSelecionada({
                      ...rubricaSelecionada,
                      aliquota_padrao: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-32"
                />
              </div>

              {/* Flags de Incidência */}
              <div className="space-y-3">
                <Label>Incidências</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={rubricaSelecionada.incide_fgts}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          incide_fgts: !!checked,
                        })
                      }
                    />
                    <span className="text-sm">Incide FGTS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={rubricaSelecionada.incide_inss}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          incide_inss: !!checked,
                        })
                      }
                    />
                    <span className="text-sm">Incide INSS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={rubricaSelecionada.reflexo_ferias}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          reflexo_ferias: !!checked,
                        })
                      }
                    />
                    <span className="text-sm">Reflexo Férias</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={rubricaSelecionada.reflexo_13}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          reflexo_13: !!checked,
                        })
                      }
                    />
                    <span className="text-sm">Reflexo 13º</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rubricaSelecionada.ativo}
                  onCheckedChange={(checked) =>
                    setRubricaSelecionada({
                      ...rubricaSelecionada,
                      ativo: !!checked,
                    })
                  }
                />
                <Label>Rubrica ativa</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Seleção de Conta Contábil */}
      <Dialog open={dialogContasOpen} onOpenChange={setDialogContasOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Conta Contábil</DialogTitle>
            <DialogDescription>Pesquise e selecione uma conta contábil do NW</DialogDescription>
          </DialogHeader>

          <div className="relative py-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={buscaConta}
              onChange={(e) => setBuscaConta(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs w-32">Código</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingContas ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </TableCell>
                  </TableRow>
                ) : contas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  contas.map((conta) => (
                    <TableRow
                      key={conta.codigo}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelecionarConta(conta)}
                    >
                      <TableCell className="font-mono text-xs">{conta.codigo}</TableCell>
                      <TableCell className="text-xs">{conta.descricao}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogContasOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

