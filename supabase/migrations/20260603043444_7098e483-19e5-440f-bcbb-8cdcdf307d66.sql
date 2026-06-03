-- POS Kantin schema: menus (menu+stock combined), transactions, transaction_details

CREATE TABLE public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_menu text NOT NULL,
  kategori text NOT NULL DEFAULT 'Lainnya',
  harga integer NOT NULL DEFAULT 0,
  stok integer NOT NULL DEFAULT 0,
  gambar text,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_transaksi text NOT NULL,
  total integer NOT NULL DEFAULT 0,
  bayar integer NOT NULL DEFAULT 0,
  kembalian integer NOT NULL DEFAULT 0,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transaction_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES public.menus(id) ON DELETE SET NULL,
  nama_menu text NOT NULL,
  harga integer NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  subtotal integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_menus_owner ON public.menus(owner_id);
CREATE INDEX idx_transactions_owner ON public.transactions(owner_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at);
CREATE INDEX idx_txdetails_tx ON public.transaction_details(transaction_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menus TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_details TO authenticated;
GRANT ALL ON public.menus TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.transaction_details TO service_role;

-- RLS
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manage menus" ON public.menus
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner manage transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner manage tx details" ON public.transaction_details
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.owner_id = auth.uid()));

-- Atomic checkout: insert transaction + details, decrement stock
CREATE OR REPLACE FUNCTION public.create_pos_transaction(
  p_kode text,
  p_total integer,
  p_bayar integer,
  p_kembalian integer,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_menu public.menus%ROWTYPE;
  v_qty integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;
  IF p_bayar < p_total THEN
    RAISE EXCEPTION 'Uang dibayar kurang dari total';
  END IF;

  INSERT INTO public.transactions (kode_transaksi, total, bayar, kembalian, owner_id)
  VALUES (p_kode, p_total, p_bayar, p_kembalian, v_uid)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'qty')::integer;

    SELECT * INTO v_menu FROM public.menus
      WHERE id = (v_item->>'menu_id')::uuid AND owner_id = v_uid
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu tidak ditemukan';
    END IF;
    IF v_menu.stok < v_qty THEN
      RAISE EXCEPTION 'Stok % tidak mencukupi', v_menu.nama_menu;
    END IF;

    INSERT INTO public.transaction_details
      (transaction_id, menu_id, nama_menu, harga, qty, subtotal)
    VALUES
      (v_tx_id, v_menu.id, v_menu.nama_menu, v_menu.harga, v_qty, v_menu.harga * v_qty);

    UPDATE public.menus SET stok = stok - v_qty WHERE id = v_menu.id;
  END LOOP;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pos_transaction(text, integer, integer, integer, jsonb) TO authenticated;