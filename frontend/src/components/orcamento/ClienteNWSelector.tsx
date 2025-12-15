"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, AlertCircle } from "lucide-react";
import { nwApi, type ClienteNW } from "@/lib/api/orcamento";
import { useAuthStore } from "@/stores/auth-store";

interface ClienteNWSelectorProps {
  value?: string; // código do cliente
  onValueChange: (codigo: string | null) => void;
  disabled?: boolean;
}

export function ClienteNWSelector({
  value,
  onValueChange,
  disabled = false,
}: ClienteNWSelectorProps) {
  const { accessToken: token } = useAuthStore();
  const [clientes, setClientes] = useState<ClienteNW[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteNW | null>(null);

  useEffect(() => {
    if (token) {
      carregarClientes();
    }
  }, [token]);

  useEffect(() => {
    if (value && clientes.length > 0) {
      const cliente = clientes.find((c) => c.codigo === value);
      setClienteSelecionado(cliente || null);
    } else {
      setClienteSelecionado(null);
    }
  }, [value, clientes]);

  const carregarClientes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await nwApi.getClientes(token, busca || undefined, true);
      setClientes(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscaChange = (newBusca: string) => {
    setBusca(newBusca);
    // Debounce: carregar após 500ms sem digitação
    setTimeout(() => {
      if (newBusca === busca) {
        carregarClientes();
      }
    }, 500);
  };

  const handleSelectChange = (codigo: string) => {
    const cliente = clientes.find((c) => c.codigo === codigo);
    setClienteSelecionado(cliente || null);
    onValueChange(codigo);
  };

  return (
    <div className="space-y-2">
      <Label className="filter-label">Cliente (NW) *</Label>
      
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              carregarClientes();
            }
          }}
          className="h-8 pl-8 text-sm"
          disabled={disabled}
        />
      </div>

      {/* Seletor */}
      {loading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <Select
          value={value || ""}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione um cliente...">
              {clienteSelecionado ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>{clienteSelecionado.nome_fantasia || clienteSelecionado.razao_social}</span>
                  <span className="text-muted-foreground text-xs">
                    ({clienteSelecionado.codigo})
                  </span>
                </div>
              ) : (
                "Selecione um cliente..."
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {clientes.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                <p>Nenhum cliente encontrado</p>
                <p className="text-xs mt-1">Tente ajustar a busca</p>
              </div>
            ) : (
              clientes.map((cliente) => (
                <SelectItem key={cliente.codigo} value={cliente.codigo}>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {cliente.nome_fantasia || cliente.razao_social}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cliente.codigo} • {cliente.razao_social}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {/* Info do cliente selecionado */}
      {clienteSelecionado && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border">
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3" />
            <span className="font-medium">{clienteSelecionado.razao_social}</span>
          </div>
          <div className="mt-1 text-[10px]">Código: {clienteSelecionado.codigo}</div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Clientes são buscados diretamente do banco NW (tabela clifor)
      </p>
    </div>
  );
}


