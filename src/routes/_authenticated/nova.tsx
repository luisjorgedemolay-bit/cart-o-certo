import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCriarCompra } from "@/lib/dados";
import { hojeISO } from "@/lib/mercado";

export const Route = createFileRoute("/_authenticated/nova")({
  head: () => ({
    meta: [
      { title: "Nova compra — MercadoCerto" },
      { name: "description", content: "Registre uma nova ida ao mercado e seus itens." },
      { property: "og:title", content: "Nova compra — MercadoCerto" },
      { property: "og:description", content: "Registre uma nova ida ao mercado e seus itens." },
    ],
  }),
  component: NovaCompra,
});

function NovaCompra() {
  const navigate = useNavigate();
  const criar = useCriarCompra();
  const [data, setData] = useState(hojeISO());
  const [mercado, setMercado] = useState("");
  const [forma, setForma] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const compra = await criar.mutateAsync({
        data,
        mercado: mercado.trim() || null,
        forma_pagamento: forma.trim() || null,
      });
      navigate({ to: "/compras/$id", params: { id: compra.id } });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu para criar a compra.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nova compra</h1>
        <p className="text-sm text-muted-foreground">
          Comece pelos dados da ida ao mercado; os itens vêm na próxima tela.
        </p>
      </div>

      <form onSubmit={enviar} className="card-soft space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mercado">Mercado (opcional)</Label>
          <Input
            id="mercado"
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            placeholder="Ex.: Mercado do bairro"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="forma">Forma de pagamento (opcional)</Label>
          <Input
            id="forma"
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            placeholder="Ex.: Pix, crédito, dinheiro"
          />
        </div>
        <Button type="submit" className="w-full" disabled={criar.isPending}>
          {criar.isPending && <Loader2 className="size-4 animate-spin" />}
          Começar a adicionar itens
        </Button>
      </form>
    </div>
  );
}
