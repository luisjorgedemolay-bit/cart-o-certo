import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Crown, Tag } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Button } from "@/components/ui/button";
import { useDadosDashboard } from "@/lib/dados";
import { brl, iconeDaCategoria } from "@/lib/mercado";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de gastos — MercadoIQ" },
      { name: "description", content: "Gasto do mês, comparação com o mês anterior e seções que mais pesaram." },
      { property: "og:title", content: "Painel de gastos — MercadoIQ" },
      { property: "og:description", content: "Gasto do mês, comparação com o mês anterior e seções que mais pesaram." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: linhas, isLoading } = useDadosDashboard();

  const agora = new Date();
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const anterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const mesAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;

  let totalAtual = 0;
  let totalAnterior = 0;
  const porCategoria = new Map<string, { nome: string; cor: string; icone: string; valor: number }>();
  let itemMaisCaro: { nome: string; valor: number } | null = null;

  for (const { compra, itens } of linhas ?? []) {
    const mes = compra.data.slice(0, 7);
    if (mes === mesAtual) {
      totalAtual += Number(compra.valor_total);
      for (const item of itens) {
        const chave = item.categorias?.id ?? "sem";
        const atual = porCategoria.get(chave) ?? {
          nome: item.categorias?.nome ?? "Sem seção",
          cor: item.categorias?.cor ?? "#9aa3a8",
          icone: item.categorias?.icone ?? "ShoppingBasket",
          valor: 0,
        };
        atual.valor += Number(item.valor_total);
        porCategoria.set(chave, atual);
        if (!itemMaisCaro || Number(item.valor_total) > itemMaisCaro.valor) {
          itemMaisCaro = { nome: item.nome, valor: Number(item.valor_total) };
        }
      }
    } else if (mes === mesAnterior) {
      totalAnterior += Number(compra.valor_total);
    }
  }

  const categorias = [...porCategoria.values()].sort((a, b) => b.valor - a.valor);
  const topo = categorias[0];
  const diferenca = totalAtual - totalAnterior;
  const subiu = diferenca > 0;
  const IconeTopo = iconeDaCategoria(topo?.icone);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <p className="text-sm text-muted-foreground">Seus gastos do mês atual.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/nova">Nova compra</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-lift">
        <p className="text-sm opacity-90">Gasto neste mês</p>
        <p className="font-display text-4xl font-bold">{brl(totalAtual)}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm opacity-90">
          {subiu ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          {brl(Math.abs(diferenca))} {subiu ? "a mais" : "a menos"} que o mês passado (
          {brl(totalAnterior)})
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card-soft p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Crown className="size-4" /> Seção que mais pesou
          </p>
          {topo ? (
            <div className="mt-2 flex items-center gap-2.5">
              <span
                className="flex size-9 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: topo.cor }}
              >
                <IconeTopo className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{topo.nome}</p>
                <p className="text-xs text-muted-foreground">{brl(topo.valor)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sem dados ainda.</p>
          )}
        </div>

        <div className="card-soft p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="size-4" /> Item mais caro do mês
          </p>
          {itemMaisCaro ? (
            <div className="mt-2">
              <p className="text-sm font-semibold">{itemMaisCaro.nome}</p>
              <p className="text-xs text-muted-foreground">{brl(itemMaisCaro.valor)}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sem dados ainda.</p>
          )}
        </div>
      </div>

      <div className="card-soft p-4">
        <h2 className="text-base font-semibold">Gasto por seção</h2>
        {categorias.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Registre itens para ver a divisão por seção.
          </p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorias}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {categorias.map((c) => (
                      <Cell key={c.nome} fill={c.cor} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-2">
              {categorias.map((c) => (
                <li key={c.nome} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  <span className="flex-1 truncate">{c.nome}</span>
                  <span className="font-medium">{brl(c.valor)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
