CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#94a3b8',
  icone text NOT NULL DEFAULT 'ShoppingBasket',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  mercado text,
  forma_pagamento text,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome text NOT NULL,
  quantidade numeric(10,3) NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'un' CHECK (unidade IN ('un','kg','g','l','ml')),
  valor_unitario numeric(10,2) NOT NULL DEFAULT 0,
  valor_total numeric(10,2) GENERATED ALWAYS AS (ROUND(quantidade * valor_unitario, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorias_user ON public.categorias(user_id);
CREATE INDEX idx_compras_user_data ON public.compras(user_id, data DESC);
CREATE INDEX idx_itens_compra ON public.itens(compra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras TO authenticated;
GRANT ALL ON public.compras TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own categorias" ON public.categorias FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own compras" ON public.compras FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own itens" ON public.itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = itens.compra_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = itens.compra_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.recalcular_total_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE alvo uuid;
BEGIN
  alvo := COALESCE(NEW.compra_id, OLD.compra_id);
  UPDATE public.compras c
    SET valor_total = COALESCE((SELECT SUM(i.valor_total) FROM public.itens i WHERE i.compra_id = alvo), 0)
    WHERE c.id = alvo;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_itens_total
AFTER INSERT OR UPDATE OR DELETE ON public.itens
FOR EACH ROW EXECUTE FUNCTION public.recalcular_total_compra();