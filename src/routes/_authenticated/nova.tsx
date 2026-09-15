import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCategorias, useCriarCompra } from "@/lib/dados";
import { hojeISO } from "@/lib/mercado";
import { lerComprovante } from "@/lib/ocr";
import { sugerirCategoriaPorNome } from "@/lib/categorizacao";

export const Route = createFileRoute("/_authenticated/nova")({
  head: () => ({
    meta: [
      { title: "Nova compra — MercadoIQ" },
      { name: "description", content: "Registre uma nova ida ao mercado e seus itens." },
      { property: "og:title", content: "Nova compra — MercadoIQ" },
      { property: "og:description", content: "Registre uma nova ida ao mercado e seus itens." },
    ],
  }),
  component: NovaCompra,
});

function NovaCompra() {
  const navigate = useNavigate();
  const criar = useCriarCompra();
  const { data: categorias } = useCategorias();

  const [data, setData] = useState(hojeISO());
  const [mercado, setMercado] = useState("");
  const [forma, setForma] = useState("");

  const [lendoFoto, setLendoFoto] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const inputFotoRef = useRef<HTMLInputElement>(null);

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

  async function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    setLendoFoto(true);
    setProgresso(0);
    try {
      const itensLidos = await lerComprovante(arquivo, setProgresso);

      if (itensLidos.length === 0) {
        toast.error(
          "Não consegui reconhecer nenhum item nessa foto. Tente com mais luz e a nota bem esticada, ou lance manualmente.",
        );
        return;
      }

      const compra = await criar.mutateAsync({ data: hojeISO() });

      const itensParaSalvar = itensLidos.map((item) => {
        const nomeCategoria = sugerirCategoriaPorNome(item.nome);
        const categoria = (categorias ?? []).find((c) => c.nome === nomeCategoria);
        return { ...item, categoria_id: categoria?.id ?? null };
      });

      const { error } = await supabase
        .from("itens")
        .insert(itensParaSalvar.map((i) => ({ ...i, compra_id: compra.id })));
      if (error) throw error;

      const naoCategorizados = itensParaSalvar.filter((i) => !i.categoria_id).length;
      toast.success(
        `${itensLidos.length} ${itensLidos.length === 1 ? "item lido" : "itens lidos"} da nota — confira antes de salvar.` +
          (naoCategorizados > 0 ? ` ${naoCategorizados} sem seção identificada.` : ""),
      );

      navigate({ to: "/compras/$id", params: { id: compra.id } });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu pra ler essa foto.");
    } finally {
      setLendoFoto(false);
      setProgresso(0);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nova compra</h1>
        <p className="text-sm text-muted-foreground">
          Fotografe a nota ou comece pelos dados da ida ao mercado.
        </p>
      </div>

      <div className="card-soft space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Camera className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Fotografar a nota</p>
            <p className="text-xs text-muted-foreground">
              Estique a nota numa superfície lisa e escura (sem estampa), com boa luz e
              sem sombra em cima do texto. Leio os itens e já sugiro a seção — sem
              custo, mas pode errar. Revise antes de confirmar.
            </p>
          </div>
        </div>

        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={aoEscolherFoto}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={lendoFoto}
          onClick={() => inputFotoRef.current?.click()}
        >
          {lendoFoto ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Lendo a nota… {Math.round(progresso * 100)}%
            </>
          ) : (
            <>
              <Camera className="size-4" />
              Tirar ou escolher foto
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou digite manualmente
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={enviar} className="card-soft space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4" /> Lançar item a item
        </div>
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
