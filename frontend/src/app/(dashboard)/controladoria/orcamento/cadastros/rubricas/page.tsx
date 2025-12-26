"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Receipt, Search, Edit2, BookOpen, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const CATEGORIAS: Record<string, { label: string }> = {
  PROVENTO: { label: "Provento" },
  REMUNERACAO: { label: "Remuneração" },
  BENEFICIO: { label: "Benefício" },
  ENCARGO: { label: "Encargo" },
  PROVISAO: { label: "Provisão" },
  PREMIO: { label: "Prêmio" },
  DESCONTO: { label: "Desconto" },
};

export default function RubricasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filtroCategoria, setFiltroCategoria] = useState<string>("ALL");
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
      if (filtroCategoria && filtroCategoria !== "ALL") params.append("categoria", filtroCategoria);
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
      toast({
        title: "Rubrica atualizada",
        description: "Rubrica atualizada com sucesso.",
      });
      setDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a rubrica.",
        variant: "destructive",
      });
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
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Eventos de Folha</h1>
          <p className="text-sm text-muted-foreground">
            Configure os eventos de folha e vincule às contas contábeis
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title flex items-center gap-2">
                <Receipt className="size-4" />
                Rubricas ({rubricasFiltradas.length})
              </CardTitle>
              <CardDescription>
                Lista de eventos de folha cadastrados
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select 
                value={filtroCategoria} 
                onValueChange={setFiltroCategoria}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as categorias</SelectItem>
                  {Object.entries(CATEGORIAS).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou nome..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : rubricasFiltradas.length === 0 ? (
            <div className="empty-state">
              <Receipt className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma rubrica encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta Contábil</TableHead>
                  <TableHead className="text-center">FGTS</TableHead>
                  <TableHead className="text-center">INSS</TableHead>
                  <TableHead className="text-center">Férias</TableHead>
                  <TableHead className="text-center">13º</TableHead>
                  <TableHead className="text-right">Alíquota</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rubricasFiltradas.map((rubrica) => (
                  <TableRow key={rubrica.id}>
                    <TableCell className="font-mono text-xs">{rubrica.codigo}</TableCell>
                    <TableCell className="font-semibold text-sm">{rubrica.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIAS[rubrica.categoria]?.label || rubrica.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rubrica.conta_contabil_codigo || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.incide_fgts ? (
                        <CheckCircle2 className="size-4 mx-auto text-green-600" />
                      ) : (
                        <XCircle className="size-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.incide_inss ? (
                        <CheckCircle2 className="size-4 mx-auto text-green-600" />
                      ) : (
                        <XCircle className="size-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.reflexo_ferias ? (
                        <CheckCircle2 className="size-4 mx-auto text-green-600" />
                      ) : (
                        <XCircle className="size-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.reflexo_13 ? (
                        <CheckCircle2 className="size-4 mx-auto text-green-600" />
                      ) : (
                        <XCircle className="size-4 mx-auto text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {rubrica.aliquota_padrao ? `${rubrica.aliquota_padrao}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {rubrica.ativo ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="size-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="size-3" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleEditar(rubrica)}
                      >
                        <Edit2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
                    <BookOpen className="size-4" />
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="incide_fgts"
                      checked={rubricaSelecionada.incide_fgts}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          incide_fgts: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="incide_fgts" className="text-sm cursor-pointer">Incide FGTS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="incide_inss"
                      checked={rubricaSelecionada.incide_inss}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          incide_inss: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="incide_inss" className="text-sm cursor-pointer">Incide INSS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reflexo_ferias"
                      checked={rubricaSelecionada.reflexo_ferias}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          reflexo_ferias: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="reflexo_ferias" className="text-sm cursor-pointer">Reflexo Férias</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reflexo_13"
                      checked={rubricaSelecionada.reflexo_13}
                      onCheckedChange={(checked) =>
                        setRubricaSelecionada({
                          ...rubricaSelecionada,
                          reflexo_13: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="reflexo_13" className="text-sm cursor-pointer">Reflexo 13º</Label>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ativo"
                  checked={rubricaSelecionada.ativo}
                  onCheckedChange={(checked) =>
                    setRubricaSelecionada({
                      ...rubricaSelecionada,
                      ativo: !!checked,
                    })
                  }
                />
                <Label htmlFor="ativo" className="cursor-pointer">Rubrica ativa</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Salvar
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingContas ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2 text-muted-foreground" />
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
                      <TableCell className="text-sm">{conta.descricao}</TableCell>
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
