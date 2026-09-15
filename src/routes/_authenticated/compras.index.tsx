import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCompras } from "@/lib/dados";
import { brl, dataCurta } from "@/lib/mercado";

export const Route = createFileRoute("/_authenticated/compras/")({
  head: () => ({
    meta: [
      { title: "Histórico de compras — MercadoCerto" },
      { name: "description", content: "Veja suas compras de mercado, da mais recente para a mais antiga." },
      { property: "og:title", content: "Histórico de compras — MercadoCerto" },
      { property: "og:description", content: "Suas compras de mercado, da mais recente para a mais antiga." },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { data: compras, isLoading } = useCompras();

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Toque em uma compra para revisar ou editar.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/nova">Nova</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && (compras?.length ?? 0) === 0 && (
        <div className="card-soft p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Você ainda não registrou nenhuma compra.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {(compras ?? []).map((compra) => (
          <li key={compra.id}>
            <Link
              to="/compras/$id"
              params={{ id: compra.id }}
              className="card-soft flex items-center gap-3 p-4 transition-shadow hover:shadow-lift"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Store className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {compra.mercado || "Compra de mercado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dataCurta(compra.data)} · {compra.itens?.length ?? 0}{" "}
                  {(compra.itens?.length ?? 0) === 1 ? "item" : "itens"}
                </p>
              </div>
              <span className="font-display text-base font-semibold">
                {brl(compra.valor_total)}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
