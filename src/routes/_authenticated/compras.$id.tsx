import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormularioItem } from "@/components/FormularioItem";
import { ListaItens } from "@/components/ListaItens";
import {
  useAtualizarCompra,
  useCompra,
  useDuplicarCompra,
  useExcluirCompra,
} from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/compras/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da compra — MercadoCerto" },
      { name: "description", content: "Revise e edite os itens desta compra de mercado." },
      { property: "og:title", content: "Detalhes da compra — MercadoCerto" },
      { property: "og:description", content: "Revise e edite os itens desta compra de mercado." },
    ],
  }),
  component: DetalheCompra,
});

function DetalheCompra() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: compra, isLoading } = useCompra(id);
  const atualizar = useAtualizarCompra(id);
  const excluir = useExcluirCompra();
  const duplicar = useDuplicarCompra();

  const [data, setData] = useState("");
  const [mercado, setMercado] = useState("");

  useEffect(() => {
    if (compra) {
      setData(compra.data);
      setMercado(compra.mercado ?? "");
    }
  }, [compra]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!compra) {
    return (
      <div className="card-soft p-6 text-center">
        <p className="text-sm text-muted-foreground">Compra não encontrada.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/compras">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/compras"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Compras
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={duplicar.isPending}
            onClick={async () => {
              try {
                const nova = await duplicar.mutateAsync(id);
                toast.success("Compra duplicada — revise os itens antes de salvar.");
                navigate({ to: "/compras/$id", params: { id: nova.id } });
              } catch (erro) {
                toast.error(erro instanceof Error ? erro.message : "Não deu para duplicar.");
              }
            }}
          >
            <Copy className="size-4" /> Duplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await excluir.mutateAsync(id);
              toast.success("Compra excluída.");
              navigate({ to: "/compras" });
            }}
          >
            <Trash2 className="size-4 text-destructive" /> Excluir compra
          </Button>
        </div>
      </div>

      <div className="card-soft grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="data">Data</Label>
          <Input
            id="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            onBlur={() => atualizar.mutate({ data })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mercado">Mercado</Label>
          <Input
            id="mercado"
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            onBlur={() => atualizar.mutate({ mercado: mercado.trim() || null })}
            placeholder="Nome do mercado"
          />
        </div>
      </div>

      <FormularioItem compraId={id} />
      <ListaItens compraId={id} />
    </div>
  );
}
