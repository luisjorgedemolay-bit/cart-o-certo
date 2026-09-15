import { createWorker } from "tesseract.js";

export type ItemLido = {
  nome: string;
  quantidade: number;
  unidade: "un" | "kg" | "g" | "l" | "ml";
  valor_unitario: number;
};

const LINHAS_IGNORAR = [
  "cnpj",
  "documento auxiliar",
  "nota fiscal",
  "consumidor eletronica",
  "codigo desc",
  "qtd un",
  "valor total",
  "forma pagamento",
  "cupom",
  "caixa",
  "operador",
  "consulte pela chave",
  "protocolo de autorizacao",
  "data de autorizacao",
  "consumidor nao identificado",
  "nfc-e",
  "outros",
];

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function linhaEhIgnoravel(linha: string) {
  const l = semAcento(linha);
  if (l.trim().length < 4) return true;
  return LINHAS_IGNORAR.some((chave) => l.includes(chave));
}

function normalizarUnidade(bruta: string | undefined): ItemLido["unidade"] {
  const u = (bruta ?? "un").trim().toLowerCase().replace(".", "");
  if (u === "kg") return "kg";
  if (u === "g") return "g";
  if (u === "l" || u === "lt") return "l";
  if (u === "ml") return "ml";
  return "un";
}

function formatarNome(bruto: string) {
  const limpo = bruto.replace(/^\d{4,}\s*/, "").trim(); // tira código do produto no início
  return limpo
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (p.length > 2 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" ");
}

// Uma linha de item termina com: <qtd> [UN] <valor unitário> <valor total>
// Ex.: "1 UN 7,99 7,99"  ou  "0.2 KG 49,99 10,70"  ou até sem a unidade.
const RE_LINHA_ITEM =
  /^(?<pre>.*?)(?<qtd>\d{1,4}[.,]?\d{0,3})\s*(?<un>UN|KG|G|L|ML|LT|UND)?\.?\s+(?<vu>\d{1,4}[.,]\d{2})\s+(?<vt>\d{1,5}[.,]\d{2})\s*$/i;

function paraValorMonetario(txt: string) {
  return Number(txt.replace(".", "").replace(",", "."));
}

function paraQuantidade(txt: string) {
  // Quantidade em peso vem com ponto decimal literal (ex.: "0.2" ou "1.1"),
  // mas às vezes a nota usa vírgula (ex.: "1,5") — nunca tem separador de milhar aqui.
  return Number(txt.replace(",", "."));
}

export function interpretarTextoComprovante(textoOcr: string): ItemLido[] {
  const linhas = textoOcr
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const itens: ItemLido[] = [];
  let descricaoPendente = "";

  for (const linha of linhas) {
    if (linhaEhIgnoravel(linha)) continue;

    const m = linha.match(RE_LINHA_ITEM);
    if (m?.groups) {
      const pre = m.groups.pre.trim();
      const nomeBruto = pre.length > 2 ? pre : descricaoPendente;
      descricaoPendente = "";
      if (!nomeBruto || nomeBruto.length < 3) continue;

      const quantidade = paraQuantidade(m.groups.qtd) || 1;
      const valor_unitario = paraValorMonetario(m.groups.vu) || 0;
      if (valor_unitario <= 0) continue;

      itens.push({
        nome: formatarNome(nomeBruto),
        quantidade,
        unidade: normalizarUnidade(m.groups.un),
        valor_unitario,
      });
    } else {
      // linha só de texto (provável descrição) — guarda pra usar na próxima linha de números
      if (/[a-zA-Z]{3,}/.test(linha)) descricaoPendente = linha;
    }
  }

  return itens;
}

export async function lerComprovante(
  arquivo: File,
  aoProgredir?: (fracao: number) => void,
): Promise<ItemLido[]> {
  const worker = await createWorker("por", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && aoProgredir) aoProgredir(m.progress);
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(arquivo);
    return interpretarTextoComprovante(text);
  } finally {
    await worker.terminate();
  }
}
