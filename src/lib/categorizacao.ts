// Categorização automática por palavra-chave no nome do item.
// Compara o nome (minúsculo, sem acento) contra listas de palavras por categoria.
// Não usa IA nenhuma — é só busca de texto, então não tem custo por uso.

const PALAVRAS_POR_CATEGORIA: Record<string, string[]> = {
  Padaria: [
    "pao",
    "paozinho",
    "broa",
    "baguete",
    "croissant",
    "rosca",
    "bisnaguinha",
    "bisnaga",
  ],
  "Laticínios e Frios": [
    "leite",
    "iogurte",
    "queijo",
    "queijinho",
    "qjo",
    "requeijao",
    "manteiga",
    "margarina",
    "creme de leite",
    "mussarela",
    "mucarela",
    "muzzarela",
    "mortadela",
    "salame",
    "nata",
    "presunto",
    "peito de peru",
    "ricota",
    "parmesao",
    "iogurte",
  ],
  Carnes: [
    "carne",
    "frango",
    "file",
    "fgo",
    "bovina",
    "suina",
    "peixe",
    "linguica",
    "bacon",
    "costela",
    "picanha",
    "alcatra",
    "acem",
    "patinho",
    "maminha",
    "coxao",
    "coxa",
    "sobrecoxa",
    "peito de frango",
    "peito frango",
  ],
  Mercearia: [
    "arroz",
    "feijao",
    "macarrao",
    "massa",
    "oleo",
    "azeite",
    "acucar",
    "sal",
    "farinha",
    "cafe",
    "molho",
    "tempero",
    "cereal",
    "granola",
    "achocolatado",
    "biscoito",
    "bolacha",
    "milho",
    "ervilha",
    "extrato",
    "vinagre",
    "maionese",
    "ketchup",
    "mostarda",
    "sucrilhos",
    "farofa",
    "fuba",
    "aveia",
    "mel",
    "gelatina",
    "bolo",
    "fermento",
  ],
  Hortifruti: [
    "banana",
    "maca",
    "tomate",
    "alface",
    "cebola",
    "batata",
    "laranja",
    "limao",
    "cenoura",
    "verdura",
    "fruta",
    "legume",
    "mamao",
    "abacate",
    "uva",
    "morango",
    "alho",
    "pepino",
    "abobrinha",
    "couve",
    "brocolis",
  ],
  Limpeza: [
    "detergente",
    "sabao",
    "desinfetante",
    "agua sanitaria",
    "agua sanit",
    "amaciante",
    "esponja",
    "limpador",
    "limp",
    "alvejante",
    "multiuso",
    "veja",
    "saco de lixo",
    "bloco sanit",
    "harpic",
  ],
  Higiene: [
    "papel higienico",
    "sabonete",
    "shampoo",
    "xampu",
    "condicionador",
    "creme dental",
    "escova de dente",
    "absorvente",
    "fralda",
    "desodorante",
    "aparelho de barbear",
  ],
  Bebidas: [
    "refrigerante",
    "suco",
    "cerveja",
    "vinho",
    "energetico",
    "agua mineral",
    "refresco",
    "guarana",
    "coca",
  ],
  Congelados: ["sorvete", "congelado", "nuggets", "lasanha", "polpa de fruta"],
};

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function contemPalavra(alvo: string, palavra: string) {
  // \b não separa bem em frases com espaço interno, então tratamos cada palavra
  // do termo como token isolado dentro do texto (evita "renata" casar com "nata").
  const escapado = palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${escapado}($|[^a-z0-9])`, "i");
  return re.test(` ${alvo} `);
}

/** Retorna o NOME da categoria sugerida a partir do nome do item, ou null se não achar nada. */
export function sugerirCategoriaPorNome(nomeItem: string): string | null {
  const alvo = semAcento(nomeItem);
  for (const [categoria, palavras] of Object.entries(PALAVRAS_POR_CATEGORIA)) {
    for (const palavra of palavras) {
      if (contemPalavra(alvo, palavra)) return categoria;
    }
  }
  return null;
}
