import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdicionarItem, useCategorias } from "@/lib/dados";
import { brl, UNIDADES } from "@/lib/mercado";

export function FormularioItem({ compraId }: { compraId: string }) {
  const { data: categorias } = useCategorias();
  const adicionar = useAdicionarItem(compraId);

  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("un");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [valorUnitario, setValorUnitario] = useState("");

  const total = (Number(quantidade.replace(",", ".")) || 0) *
    (Number(valorUnitario.replace(",", ".")) || 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome ao item.");
      return;
    }
    try {
      await adicionar.mutateAsync({
        nome: nome.trim(),
        quantidade: Number(quantidade.replace(",", ".")) || 1,
        unidade,
        valor_unitario: Number(valorUnitario.replace(",", ".")) || 0,
        categoria_id: categoriaId || null,
      });
      setNome("");
      setQuantidade("1");
      setValorUnitario("");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu para salvar o item.");
    }
  }

  return (
    <form onSubmit={enviar} className="card-soft space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome-item">Item</Label>
        <Input
          id="nome-item"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Arroz 5kg"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="qtd">Qtd.</Label>
          <Input
            id="qtd"
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vu">Valor un.</Label>
          <Input
            id="vu"
            inputMode="decimal"
            value={valorUnitario}
            onChange={(e) => setValorUnitario(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Seção</Label>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger>
            <SelectValue placeholder="Escolher seção" />
          </SelectTrigger>
          <SelectContent>
            {(categorias ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
        <span className="text-sm text-secondary-foreground">Total do item</span>
        <span className="font-display text-lg font-semibold">{brl(total)}</span>
      </div>

      <Button type="submit" className="w-full" disabled={adicionar.isPending}>
        {adicionar.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Adicionar item
      </Button>
    </form>
  );
}
