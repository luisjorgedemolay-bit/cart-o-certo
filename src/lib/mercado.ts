import {
  Croissant,
  Milk,
  Beef,
  Wheat,
  Carrot,
  SprayCan,
  Bath,
  CupSoda,
  Snowflake,
  ShoppingBasket,
  type LucideIcon,
} from "lucide-react";

export type Unidade = "un" | "kg" | "g" | "l" | "ml";

export const UNIDADES: Unidade[] = ["un", "kg", "g", "l", "ml"];

export type Categoria = {
  id: string;
  user_id: string;
  nome: string;
  cor: string;
  icone: string;
  created_at: string;
};

export type Compra = {
  id: string;
  user_id: string;
  data: string;
  mercado: string | null;
  forma_pagamento: string | null;
  valor_total: number;
  created_at: string;
};

export type Item = {
  id: string;
  compra_id: string;
  categoria_id: string | null;
  nome: string;
  quantidade: number;
  unidade: Unidade;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
};

export const CATEGORIAS_PADRAO = [
  { nome: "Padaria", cor: "#d9a441", icone: "Croissant" },
  { nome: "Laticínios e Frios", cor: "#7fb3d5", icone: "Milk" },
  { nome: "Carnes", cor: "#d16a6a", icone: "Beef" },
  { nome: "Mercearia", cor: "#b08968", icone: "Wheat" },
  { nome: "Hortifruti", cor: "#6cb47a", icone: "Carrot" },
  { nome: "Limpeza", cor: "#68b6b0", icone: "SprayCan" },
  { nome: "Higiene", cor: "#a58ed1", icone: "Bath" },
  { nome: "Bebidas", cor: "#e08b5a", icone: "CupSoda" },
  { nome: "Congelados", cor: "#8fa9d8", icone: "Snowflake" },
  { nome: "Outros", cor: "#9aa3a8", icone: "ShoppingBasket" },
];

const ICONES: Record<string, LucideIcon> = {
  Croissant,
  Milk,
  Beef,
  Wheat,
  Carrot,
  SprayCan,
  Bath,
  CupSoda,
  Snowflake,
  ShoppingBasket,
};

export function iconeDaCategoria(nome?: string | null): LucideIcon {
  return (nome && ICONES[nome]) || ShoppingBasket;
}

export function brl(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor ?? 0));
}

export function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function hojeISO() {
  const agora = new Date();
  const off = agora.getTimezoneOffset() * 60000;
  return new Date(agora.getTime() - off).toISOString().slice(0, 10);
}

export function quantidadeLegivel(q: number, u: string) {
  const n = Number(q);
  const txt = Number.isInteger(n) ? String(n) : n.toString().replace(".", ",");
  return `${txt} ${u}`;
}
