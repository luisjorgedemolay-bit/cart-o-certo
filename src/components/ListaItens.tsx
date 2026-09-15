import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtualizarItem, useCategorias, useExcluirItem, useItens } from "@/lib/dados";
import {
  brl,
  iconeDaCategoria,
  quantidadeLegivel,
  UNIDADES,
  type Categoria,
  type Item,
} from "@/lib/mercado";

export function ListaItens({ compraId }: { compraId: string }) {
  const { data: itens, isLoading } = useItens(compraId);
  const { data: categorias } = useCategorias();
  const excluir = useExcluirItem(compraId);
  const [editando, setEditando] = useState<string | null>(null);

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando itens…</p>;
  }

  if (!itens || itens.length === 0) {
    return (
      <div className="card-soft p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum item ainda. Use o formulário acima para começar.
        </p>
      </div>
    );
  }

  const porCategoria = new Map<string, Item[]>();
  for (const item of itens) {
    const chave = item.categoria_id ?? "sem";
    porCategoria.set(chave, [...(porCategoria.get(chave) ?? []), item]);
  }

  const total = itens.reduce((s, i) => s + Number(i.valor_total), 0);

  return (
    <div className="space-y-4">
      {[...porCategoria.entries()].map(([chave, lista]) => {
        const categoria = (categorias ?? []).find((c) => c.id === chave);
        const Icone = iconeDaCategoria(categoria?.icone);
        const cor = categoria?.cor ?? "#9aa3a8";
        const subtotal = lista.reduce((s, i) => s + Number(i.valor_total), 0);

        return (
          <section key={chave} className="card-soft overflow-hidden">
            <header
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ backgroundColor: `${cor}1f` }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex size-8 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: cor }}
                >
                  <Icone className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{categoria?.nome ?? "Sem seção"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {lista.length} {lista.length === 1 ? "item" : "itens"}
                  </p>
                </div>
              </div>
              <span className="font-display text-sm font-semibold">{brl(subtotal)}</span>
            </header>

            <ul className="divide-y divide-border">
              {lista.map((item) =>
                editando === item.id ? (
                  <LinhaEdicao
                    key={item.id}
                    item={item}
                    compraId={compraId}
                    categorias={categorias ?? []}
                    aoFechar={() => setEditando(null)}
                  />
                ) : (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {quantidadeLegivel(item.quantidade, item.unidade)} ×{" "}
                        {brl(item.valor_unitario)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{brl(item.valor_total)}</span>
                    <div className="flex shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar item"
                        onClick={() => setEditando(item.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Excluir item"
                        onClick={() => excluir.mutate(item.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}

      <div className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground">
        <span className="text-sm font-medium">Total da compra</span>
        <span className="font-display text-2xl font-bold">{brl(total)}</span>
      </div>
    </div>
  );
}

function LinhaEdicao({
  item,
  compraId,
  categorias,
  aoFechar,
}: {
  item: Item;
  compraId: string;
  categorias: Categoria[];
  aoFechar: () => void;
}) {
  const atualizar = useAtualizarItem(compraId);
  const [quantidade, setQuantidade] = useState(String(item.quantidade));
  const [unidade, setUnidade] = useState(item.unidade);
  const [valorUnitario, setValorUnitario] = useState(String(item.valor_unitario));
  const [categoriaId, setCategoriaId] = useState(item.categoria_id ?? "");

  async function salvar() {
    try {
      await atualizar.mutateAsync({
        id: item.id,
        quantidade: Number(quantidade.replace(",", ".")) || 0,
        unidade,
        valor_unitario: Number(valorUnitario.replace(",", ".")) || 0,
        categoria_id: categoriaId || null,
      });
      aoFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu para salvar.");
    }
  }

  return (
    <li className="space-y-3 bg-muted/60 px-4 py-4">
      <p className="text-sm font-medium">{item.nome}</p>
      <div className="grid grid-cols-3 gap-2">
        <Input
          inputMode="decimal"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          aria-label="Quantidade"
        />
        <Select value={unidade} onValueChange={(v) => setUnidade(v as Item["unidade"])}>
          <SelectTrigger aria-label="Unidade">
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
        <Input
          inputMode="decimal"
          value={valorUnitario}
          onChange={(e) => setValorUnitario(e.target.value)}
          aria-label="Valor unitário"
        />
      </div>
      <Select value={categoriaId} onValueChange={setCategoriaId}>
        <SelectTrigger aria-label="Seção">
          <SelectValue placeholder="Sem seção" />
        </SelectTrigger>
        <SelectContent>
          {categorias.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button size="sm" onClick={salvar} disabled={atualizar.isPending}>
          <Check className="size-4" /> Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={aoFechar}>
          <X className="size-4" /> Cancelar
        </Button>
      </div>
    </li>
  );
}
