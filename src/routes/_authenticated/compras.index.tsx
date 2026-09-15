import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompras } from "@/lib/dados";
import { brl, dataCurta } from "@/lib/mercado";

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  const nome = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export const Route = createFileRoute("/_authenticated/compras/")({
  head: () => ({
    meta: [
      { title: "Histórico de compras — MercadoIQ" },
      { name: "description", content: "Veja suas compras de mercado, da mais recente para a mais antiga." },
      { property: "og:title", content: "Histórico de compras — MercadoIQ" },
      { property: "og:description", content: "Suas compras de mercado, da mais recente para a mais antiga." },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { data: compras, isLoading } = useCompras();
  const [mes, setMes] = useState("todos");
  const [busca, setBusca] = useState("");

  const mesesDisponiveis = useMemo(() => {
    const chaves = new Set((compras ?? []).map((c) => c.data.slice(0, 7)));
    return [...chaves].sort((a, b) => b.localeCompare(a));
  }, [compras]);

  const filtradas = useMemo(() => {
    return (compras ?? []).filter((c) => {
      const bateMes = mes === "todos" || c.data.slice(0, 7) === mes;
      const bateBusca =
        busca.trim() === "" ||
        (c.mercado ?? "").toLowerCase().includes(busca.trim().toLowerCase());
      return bateMes && bateBusca;
    });
  }, [compras, mes, busca]);

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

      {!isLoading && (compras?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {mesesDisponiveis.map((chave) => (
                <SelectItem key={chave} value={chave}>
                  {rotuloMes(chave)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por mercado…"
            className="sm:flex-1"
          />
        </div>
      )}

      {!isLoading && (compras?.length ?? 0) > 0 && filtradas.length === 0 && (
        <div className="card-soft p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma compra bate com esse filtro.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {filtradas.map((compra) => (
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
