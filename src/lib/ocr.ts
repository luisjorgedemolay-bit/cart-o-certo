import { createWorker, PSM } from "tesseract.js";

// --- Pré-processamento de imagem: escala de cinza + binarização (método de Otsu) ---
// Isso é o que mais pesa na precisão do OCR grátis — sem isso, fundo com estampa,
// sombra ou pouco contraste faz o Tesseract praticamente não reconhecer nada.

function calcularLimiarOtsu(histograma: number[], total: number) {
  let somaTotal = 0;
  for (let i = 0; i < 256; i++) somaTotal += i * histograma[i];

  let somaFundo = 0;
  let pesoFundo = 0;
  let maxVariancia = 0;
  let limiar = 128;

  for (let t = 0; t < 256; t++) {
    pesoFundo += histograma[t];
    if (pesoFundo === 0) continue;
    const pesoFrente = total - pesoFundo;
    if (pesoFrente === 0) break;

    somaFundo += t * histograma[t];
    const mediaFundo = somaFundo / pesoFundo;
    const mediaFrente = (somaTotal - somaFundo) / pesoFrente;
    const variancia = pesoFundo * pesoFrente * (mediaFundo - mediaFrente) ** 2;
    if (variancia > maxVariancia) {
      maxVariancia = variancia;
      limiar = t;
    }
  }
  return limiar;
}

async function prepararImagemParaOcr(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const LADO_MAXIMO = 2200;
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não consegui preparar a imagem.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);

  const imagem = ctx.getImageData(0, 0, largura, altura);
  const pixels = imagem.data;
  const total = largura * altura;
  const cinza = new Uint8ClampedArray(total);
  const histograma = new Array(256).fill(0);

  for (let i = 0; i < total; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    cinza[i] = v;
    histograma[v]++;
  }

  const limiar = calcularLimiarOtsu(histograma, total);

  for (let i = 0; i < total; i++) {
    const v = cinza[i] > limiar ? 255 : 0;
    pixels[i * 4] = v;
    pixels[i * 4 + 1] = v;
    pixels[i * 4 + 2] = v;
  }
  ctx.putImageData(imagem, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem."))), "image/png");
  });
}

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
  const imagemPreparada = await prepararImagemParaOcr(arquivo);

  const worker = await createWorker("por", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && aoProgredir) aoProgredir(m.progress);
    },
  });
  try {
    // PSM 4 = "single column of text of variable sizes" — o modo recomendado
    // pra recibo/nota fiscal, bem melhor que o automático (PSM 3) pra esse formato.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
    const {
      data: { text },
    } = await worker.recognize(imagemPreparada);
    const itens = interpretarTextoComprovante(text);
    if (itens.length === 0) {
      // Ajuda a depurar se continuar falhando: o texto bruto fica no console do navegador.
      console.warn("[MercadoIQ] OCR não achou itens. Texto bruto reconhecido:\n", text);
    }
    return itens;
  } finally {
    await worker.terminate();
  }
}
