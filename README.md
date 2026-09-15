# Cartão Certo

# MercadoCerto — Controle de Compras de Mercado

App web pessoal para registrar e acompanhar as compras de supermercado item a item — quantidade, valor unitário e total, organizado por seção (padaria, laticínios, carnes, mercearia, hortifruti, limpeza, higiene, bebidas, congelados, outros). Nome provisório "MercadoCerto", sinta-se livre pra sugerir um melhor.

**Stack:** React + Tailwind + shadcn/ui + lucide-react no frontend; Supabase (Postgres + Auth + RLS) no backend.

## Modelo de dados (Supabase)

### categorias
id uuid PK, user_id uuid FK, nome text, cor text (hex), icone text (nome do ícone lucide-react).
Seed automático ao criar o usuário: Padaria, Laticínios e Frios, Carnes, Mercearia, Hortifruti, Limpeza, Higiene, Bebidas, Congelados, Outros — cada uma com cor e ícone coerentes.

### compras
id uuid PK, user_id uuid FK, data date (padrão hoje), mercado text nullable, forma_pagamento text nullable, valor_total numeric(10,2) (soma automática dos itens), created_at timestamptz.

### itens
id uuid PK, compra_id uuid FK, categoria_id uuid FK nullable, nome text, quantidade numeric(10,3), unidade text ('un'|'kg'|'g'|'l'|'ml', padrão 'un'), valor_unitario numeric(10,2), valor_total numeric(10,2) (quantidade × valor_unitario, calculado), created_at timestamptz.

Implementar Supabase Auth e Row Level Security em todas as tabelas, mesmo sendo uso pessoal.

## Telas e fluxos

1. **Nova compra**: usuário informa data e nome do mercado (opcional), depois adiciona itens um a um num formulário rápido (nome, quantidade, unidade, categoria, valor unitário) — o valor total do item e da compra é calculado automaticamente enquanto ele digita.

2. **Lista de itens da compra (editável)**: itens agrupados por seção/categoria, cada grupo com ícone e cor da categoria, subtotal por seção, total geral no rodapé. Cada item pode ser editado inline (quantidade, valor, categoria) ou excluído. Botão pra adicionar novo item direto nessa tela.

3. **Histórico de compras**: lista de compras passadas (data, mercado, valor total, nº de itens), ordenada da mais recente pra mais antiga. Clicar abre a compra pra revisar/editar.

4. **Dashboard**: gasto total do mês atual vs. mês anterior, gráfico de gasto por categoria (pizza ou barras), categoria que mais pesou, item mais caro do mês.

## Design
Visual limpo, organizado e "bonitinho" — cards arredondados, boa hierarquia tipográfica, cores suaves por categoria, ícones lucide-react. Mobile-first (o uso principal vai ser pelo celular, no mercado ou logo depois).

## Observação
Não implementar por enquanto leitura automática de foto de comprovante via IA — isso fica pra uma fase 2. Por ora todo o cadastro é manual, mas a estrutura de dados (compras → itens → categorias) já deve deixar isso fácil de plugar depois.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1130690d-548b-45d7-8bb8-6ec684391143).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
