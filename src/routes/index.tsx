import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ListChecks, PieChart, Smartphone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Marca } from "@/components/Marca";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MercadoIQ — controle das compras de mercado" },
      {
        name: "description",
        content:
          "Anote cada item do supermercado por seção, com quantidade e valor, e veja quanto gastou no mês.",
      },
      { property: "og:title", content: "MercadoIQ — controle das compras de mercado" },
      {
        property: "og:description",
        content: "Anote cada item por seção e acompanhe os gastos do mês no celular.",
      },
    ],
  }),
  component: Landing,
});

const DESTAQUES = [
  {
    icon: ListChecks,
    titulo: "Item a item, por seção",
    texto: "Padaria, hortifruti, limpeza… cada grupo com subtotal e total automático.",
  },
  {
    icon: PieChart,
    titulo: "Gastos do mês na hora",
    texto: "Compare com o mês anterior e descubra qual seção pesou mais.",
  },
  {
    icon: Smartphone,
    titulo: "Feito pro celular",
    texto: "Cadastro rápido no corredor do mercado ou logo depois, em casa.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-14">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Marca className="size-6" />
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
          MercadoIQ
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          Seu controle de compras de supermercado, item a item: quantidade, valor
          unitário, total e tudo organizado por seção.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Começar agora</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {DESTAQUES.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="card-soft p-5">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
