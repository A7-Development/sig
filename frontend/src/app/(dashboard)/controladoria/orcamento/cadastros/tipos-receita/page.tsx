'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DollarSign, Search, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface TipoReceita {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  conta_contabil_codigo: string | null;
  conta_contabil_descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ContaContabil {
  codigo: string;
  descricao: string;
}

const CATEGORIAS = ['OPERACIONAL', 'FINANCEIRA', 'OUTRAS'];

export default function TiposReceitaPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<TipoReceita | null>(null);
  
  // Busca de conta contábil
  const [buscaContaContabil, setBuscaContaContabil] = useState('');
  const [contasContabeis, setContasContabeis] = useState<ContaContabil[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [showContasList, setShowContasList] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    categoria: 'OPERACIONAL',
    conta_contabil_codigo: '',
    conta_contabil_descricao: '',
    ordem: 0,
    ativo: true,
  });

  // Buscar tipos de receita
  const { data: tiposReceita = [], isLoading } = useQuery<TipoReceita[]>({
    queryKey: ['tipos-receita'],
    queryFn: async () => {
      return await api.get<TipoReceita[]>('/api/v1/orcamento/tipos-receita');
    },
  });

  // Buscar contas contábeis
  useEffect(() => {
    const buscarContas = async () => {
      if (buscaContaContabil.length < 2) {
        setContasContabeis([]);
        return;
      }
      
      setLoadingContas(true);
      try {
        const contas = await api.get<ContaContabil[]>(`/api/v1/orcamento/nw/contas-contabeis?busca=${encodeURIComponent(buscaContaContabil)}`);
        setContasContabeis(contas);
        setShowContasList(true);
      } catch (error) {
        console.error('Erro ao buscar contas contábeis:', error);
      } finally {
        setLoadingContas(false);
      }
    };

    const timeoutId = setTimeout(buscarContas, 500);
    return () => clearTimeout(timeoutId);
  }, [buscaContaContabil]);

  // Criar tipo de receita
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post<TipoReceita>('/api/v1/orcamento/tipos-receita', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-receita'] });
      toast.success('Tipo de receita criado com sucesso!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao criar tipo de receita');
    },
  });

  // Atualizar tipo de receita
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await api.put<TipoReceita>(`/api/v1/orcamento/tipos-receita/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-receita'] });
      toast.success('Tipo de receita atualizado com sucesso!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar tipo de receita');
    },
  });

  // Excluir tipo de receita
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/orcamento/tipos-receita/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-receita'] });
      toast.success('Tipo de receita excluído com sucesso!');
      setDeleteConfirmOpen(false);
      setSelectedForDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao excluir tipo de receita');
    },
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      categoria: 'OPERACIONAL',
      conta_contabil_codigo: '',
      conta_contabil_descricao: '',
      ordem: 0,
      ativo: true,
    });
    setEditingId(null);
    setBuscaContaContabil('');
    setContasContabeis([]);
    setShowContasList(false);
  };

  const handleEditar = (tipo: TipoReceita) => {
    setFormData({
      codigo: tipo.codigo,
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      categoria: tipo.categoria,
      conta_contabil_codigo: tipo.conta_contabil_codigo || '',
      conta_contabil_descricao: tipo.conta_contabil_descricao || '',
      ordem: tipo.ordem || 0,
      ativo: tipo.ativo,
    });
    setEditingId(tipo.id);
    setBuscaContaContabil(tipo.conta_contabil_codigo ? `${tipo.conta_contabil_codigo} - ${tipo.conta_contabil_descricao}` : '');
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSelectConta = (conta: ContaContabil) => {
    setFormData(prev => ({
      ...prev,
      conta_contabil_codigo: conta.codigo,
      conta_contabil_descricao: conta.descricao,
    }));
    setBuscaContaContabil(`${conta.codigo} - ${conta.descricao}`);
    setShowContasList(false);
    setContasContabeis([]);
  };

  const handleLimparConta = () => {
    setFormData(prev => ({
      ...prev,
      conta_contabil_codigo: '',
      conta_contabil_descricao: '',
    }));
    setBuscaContaContabil('');
    setContasContabeis([]);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Tipos de Receita</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de tipos de receita com conta contábil para DRE
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="size-4 mr-2" />
          Novo Tipo de Receita
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="section-title">Lista de Tipos de Receita</CardTitle>
              <CardDescription>
                {tiposReceita.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : tiposReceita.length === 0 ? (
            <div className="empty-state">
              <DollarSign className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum tipo de receita cadastrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta Contábil</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposReceita.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-mono text-xs">{tipo.codigo}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold">{tipo.nome}</span>
                        {tipo.descricao && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {tipo.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tipo.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tipo.conta_contabil_codigo ? (
                        <div className="text-sm">
                          <span className="font-mono text-xs">{tipo.conta_contabil_codigo}</span>
                          {tipo.conta_contabil_descricao && (
                            <span className="text-muted-foreground ml-1">- {tipo.conta_contabil_descricao}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {tipo.ativo ? (
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEditar(tipo)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => { setSelectedForDelete(tipo); setDeleteConfirmOpen(true); }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Tipo de Receita' : 'Novo Tipo de Receita'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Altere os dados do tipo de receita.' : 'Preencha os dados para criar um novo tipo de receita.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do tipo de receita"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conta_contabil">Conta Contábil (DRE)</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="conta_contabil"
                      value={buscaContaContabil}
                      onChange={(e) => setBuscaContaContabil(e.target.value)}
                      placeholder="Buscar por código ou descrição..."
                      className="pl-8"
                    />
                  </div>
                  {formData.conta_contabil_codigo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleLimparConta}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {showContasList && contasContabeis.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {contasContabeis.map((conta) => (
                      <button
                        key={conta.codigo}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex gap-2"
                        onClick={() => handleSelectConta(conta)}
                      >
                        <span className="font-mono">{conta.codigo}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="truncate">{conta.descricao}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {loadingContas && (
                  <div className="absolute right-12 top-2.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  </div>
                )}
              </div>
              {formData.conta_contabil_codigo && (
                <p className="text-xs text-muted-foreground">
                  Selecionado: {formData.conta_contabil_codigo} - {formData.conta_contabil_descricao}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked === true })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o tipo de receita "{selectedForDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedForDelete && deleteMutation.mutate(selectedForDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

