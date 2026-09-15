import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIAS_PADRAO,
  hojeISO,
  type Categoria,
  type Compra,
  type Item,
} from "./mercado";

async function userId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada");
  return data.user.id;
}

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: async (): Promise<Categoria[]> => {
      const uid = await userId();
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) return data as Categoria[];

      const { data: criadas, error: erroSeed } = await supabase
        .from("categorias")
        .insert(CATEGORIAS_PADRAO.map((c) => ({ ...c, user_id: uid })))
        .select();
      if (erroSeed) throw erroSeed;
      return (criadas ?? []) as Categoria[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompras() {
  return useQuery({
    queryKey: ["compras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("*, itens(id)")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Compra & { itens: { id: string }[] })[];
    },
  });
}

export function useCompra(id: string) {
  return useQuery({
    queryKey: ["compra", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Compra | null;
    },
  });
}

export function useItens(compraId: string) {
  return useQuery({
    queryKey: ["itens", compraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens")
        .select("*")
        .eq("compra_id", compraId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });
}

export function useCriarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (valores: {
      data: string;
      mercado?: string | null;
      forma_pagamento?: string | null;
    }) => {
      const uid = await userId();
      const { data, error } = await supabase
        .from("compras")
        .insert({ ...valores, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data as Compra;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compras"] }),
  });
}

export function useAtualizarCompra(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (valores: Partial<Compra>) => {
      const { error } = await supabase.from("compras").update(valores).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compra", id] });
      qc.invalidateQueries({ queryKey: ["compras"] });
    },
  });
}

export function useExcluirCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compras"] }),
  });
}

export function useDuplicarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (compraId: string): Promise<Compra> => {
      const uid = await userId();
      const { data: original, error: erroCompra } = await supabase
        .from("compras")
        .select("*")
        .eq("id", compraId)
        .single();
      if (erroCompra) throw erroCompra;

      const { data: itensOriginais, error: erroItens } = await supabase
        .from("itens")
        .select("*")
        .eq("compra_id", compraId);
      if (erroItens) throw erroItens;

      const { data: nova, error: erroNova } = await supabase
        .from("compras")
        .insert({
          user_id: uid,
          data: hojeISO(),
          mercado: original.mercado,
          forma_pagamento: original.forma_pagamento,
        })
        .select()
        .single();
      if (erroNova) throw erroNova;

      if (itensOriginais && itensOriginais.length > 0) {
        const { error: erroCopiaItens } = await supabase.from("itens").insert(
          itensOriginais.map((i) => ({
            compra_id: nova.id,
            categoria_id: i.categoria_id,
            nome: i.nome,
            quantidade: i.quantidade,
            unidade: i.unidade,
            valor_unitario: i.valor_unitario,
          })),
        );
        if (erroCopiaItens) throw erroCopiaItens;
      }

      return nova as Compra;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compras"] }),
  });
}

function invalidarCompra(qc: ReturnType<typeof useQueryClient>, compraId: string) {
  qc.invalidateQueries({ queryKey: ["itens", compraId] });
  qc.invalidateQueries({ queryKey: ["compra", compraId] });
  qc.invalidateQueries({ queryKey: ["compras"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useAdicionarItensEmLote(compraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      itens: {
        nome: string;
        quantidade: number;
        unidade: string;
        valor_unitario: number;
        categoria_id: string | null;
      }[],
    ) => {
      if (itens.length === 0) return;
      const { error } = await supabase
        .from("itens")
        .insert(itens.map((i) => ({ ...i, compra_id: compraId })));
      if (error) throw error;
    },
    onSuccess: () => invalidarCompra(qc, compraId),
  });
}

export function useAdicionarItem(compraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (valores: {
      nome: string;
      quantidade: number;
      unidade: string;
      valor_unitario: number;
      categoria_id: string | null;
    }) => {
      const { error } = await supabase
        .from("itens")
        .insert({ ...valores, compra_id: compraId });
      if (error) throw error;
    },
    onSuccess: () => invalidarCompra(qc, compraId),
  });
}

export function useAtualizarItem(compraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...valores }: { id: string } & Partial<Item>) => {
      const { error } = await supabase.from("itens").update(valores).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidarCompra(qc, compraId),
  });
}

export function useExcluirItem(compraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidarCompra(qc, compraId),
  });
}

export type LinhaDashboard = {
  compra: Compra;
  itens: (Item & { categorias: Categoria | null })[];
};

export type LinhaDashboard = {
  compra: Compra;
  itens: (Item & { categorias: Categoria | null })[];
};

export function useDadosDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<LinhaDashboard[]> => {
      const inicio = new Date();
      inicio.setDate(1);
      inicio.setMonth(inicio.getMonth() - 1);
      const desde = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-01`;
      const { data, error } = await supabase
        .from("compras")
        .select("*, itens(*, categorias(*))")
        .gte("data", desde)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c) => {
        const { itens, ...compra } = c as never as Compra & {
          itens: (Item & { categorias: Categoria | null })[];
        };
        return { compra, itens: itens ?? [] };
      });
    },
  });
}

export type MembroCasa = {
  membro_user_id: string;
  papel: "dono" | "membro";
  entrou_em: string;
  nome: string;
};

function invalidarTudoAposMudarCasa(qc: ReturnType<typeof useQueryClient>) {
  // entrar/sair de uma Casa muda o que fica visível em compras/itens/categorias
  qc.invalidateQueries({ queryKey: ["minha-casa"] });
  qc.invalidateQueries({ queryKey: ["categorias"] });
  qc.invalidateQueries({ queryKey: ["compras"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useMinhaCasa() {
  return useQuery({
    queryKey: ["minha-casa"],
    queryFn: async (): Promise<MembroCasa[]> => {
      const { data, error } = await supabase.rpc("membros_da_casa");
      if (error) throw error;
      return (data ?? []) as MembroCasa[];
    },
  });
}

export function useCriarCasa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.rpc("criar_casa", { p_nome: nome || "Minha Casa" });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidarTudoAposMudarCasa(qc),
  });
}

export function useGerarConviteCasa() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("gerar_convite_casa");
      if (error) throw error;
      return data as string;
    },
  });
}

export function useAceitarConviteCasa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await supabase.rpc("aceitar_convite_casa", { p_codigo: codigo });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidarTudoAposMudarCasa(qc),
  });
}

export function useSairDaCasa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sair_da_casa");
      if (error) throw error;
    },
    onSuccess: () => invalidarTudoAposMudarCasa(qc),
  });
}
