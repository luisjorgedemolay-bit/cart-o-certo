import { createWorker, PSM } from "tesseract.js";

// --- Pré-processamento de imagem: escala de cinza + limiar ADAPTATIVO local (Bradley) ---
// Troquei o método de Otsu (limiar único pra imagem inteira) por um limiar adaptativo
// local, calculado por região via imagem integral. Isso importa muito pra foto de
// celular: nota fotografada tem sombra de um lado, fundo mais escuro do outro — um
// limiar global acaba "comendo" o texto justamente na parte mais escura da imagem.
// O método local (Bradley/Wellner) compara cada pixel só com a vizinhança dele, então
// sombra e iluminação desigual não destroem mais o texto. Referência: Bradley & Roth,
// "Adaptive Thresholding Using the Integral Image" (2007) — é o método padrão da
// indústria pra binarizar documento fotografado (não escaneado).

function limiarAdaptativoBradley(
  cinza: Uint8ClampedArray,
  largura: number,
  altura: number,
  sensibilidade = 0.15,
): Uint8ClampedArray {
  // imagem integral (soma acumulada), com borda de zero pra simplificar os cálculos
  const integral = new Float64Array((largura + 1) * (altura + 1));
  const passoI = largura + 1;

  for (let y = 0; y < altura; y++) {
    let somaLinha = 0;
    for (let x = 0; x < largura; x++) {
      somaLinha += cinza[y * largura + x];
      integral[(y + 1) * passoI + (x + 1)] = integral[y * passoI + (x + 1)] + somaLinha;
    }
  }

  // janela local ~ 1/8 da largura da imagem (recomendação de Wellner/Bradley)
  const janela = Math.max(15, Math.floor(largura / 8));
  const meia = Math.floor(janela / 2);
  const saida = new Uint8ClampedArray(largura * altura);

  for (let y = 0; y < altura; y++) {
    const y1 = Math.max(0, y - meia);
    const y2 = Math.min(altura - 1, y + meia);
    for (let x = 0; x < largura; x++) {
      const x1 = Math.max(0, x - meia);
      const x2 = Math.min(largura - 1, x + meia);

      const soma =
        integral[(y2 + 1) * passoI + (x2 + 1)] -
        integral[y1 * passoI + (x2 + 1)] -
        integral[(y2 + 1) * passoI + x1] +
        integral[y1 * passoI + x1];
      const quantidade = (x2 - x1 + 1) * (y2 - y1 + 1);
      const media = soma / quantidade;

      const valor = cinza[y * largura + x];
      saida[y * largura + x] = valor < media * (1 - sensibilidade) ? 0 : 255;
    }
  }

  return saida;
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

  for (let i = 0; i < total; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    cinza[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  const binarizada = limiarAdaptativoBradley(cinza, largura, altura);

  for (let i = 0; i < total; i++) {
    const v = binarizada[i];
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

// Cada item de nota fiscal começa com um código numérico (4-8 dígitos) seguido da
// descrição. Isso é muito mais estável no OCR do que tentar casar o formato exato
// da linha de quantidade/preço — o OCR real quebra/junta linhas de um jeito
// imprevisível, mas o código do produto quase sempre sai limpo.
const RE_INICIO_ITEM = /^(\d{4,8})\s+([A-Za-zÀ-ÿ].{2,})$/;
const RE_PRECO = /\d{1,4}[.,]\d{2}/g;
const RE_QTD_UN = /(\d{1,4}[.,]?\d{0,3})\s*(UN|KG|G|L|ML|LT|UND)\b/i;

function paraValorMonetario(txt: string) {
  // preço de item nunca passa de milhares, então "." e "," são sempre decimais aqui
  // (o OCR às vezes lê a vírgula da nota como ponto — tratar os dois igual evita erro).
  return Number(txt.replace(",", "."));
}

function paraQuantidade(txt: string) {
  return Number(txt.replace(",", "."));
}

export function interpretarTextoComprovante(textoOcr: string): ItemLido[] {
  const linhas = textoOcr
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !linhaEhIgnoravel(l));

  const inicios: { i: number; descricao: string }[] = [];
  linhas.forEach((l, i) => {
    const m = l.match(RE_INICIO_ITEM);
    if (m) inicios.push({ i, descricao: m[2] });
  });

  const itens: ItemLido[] = [];
  for (let k = 0; k < inicios.length; k++) {
    const inicio = inicios[k];
    const fimBloco = k + 1 < inicios.length ? inicios[k + 1].i : Math.min(linhas.length, inicio.i + 4);
    const bloco = linhas.slice(inicio.i, fimBloco).join(" ");

    const precos = bloco.match(RE_PRECO) ?? [];
    if (precos.length === 0) continue;

    // os dois últimos números de preço do bloco são (valor unitário, valor total)
    const valorUnitarioTxt = precos.length >= 2 ? precos[precos.length - 2] : precos[0];
    const valorTotalTxt = precos[precos.length - 1];

    const valor_unitario = paraValorMonetario(valorUnitarioTxt);
    if (!valor_unitario || valor_unitario <= 0) continue;

    const mQtdUn = bloco.match(RE_QTD_UN);
    let quantidade = mQtdUn ? paraQuantidade(mQtdUn[1]) : 0;
    const unidade = normalizarUnidade(mQtdUn?.[2]);

    if (!quantidade || quantidade <= 0) {
      // não achou "qtd UN" explícito — tenta inferir dividindo total pelo unitário
      const valorTotal = paraValorMonetario(valorTotalTxt);
      const inferida = Math.round((valorTotal / valor_unitario) * 100) / 100;
      quantidade = inferida > 0 && inferida < 100 ? inferida : 1;
    }

    itens.push({
      nome: formatarNome(inicio.descricao),
      quantidade,
      unidade,
      valor_unitario,
    });
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
