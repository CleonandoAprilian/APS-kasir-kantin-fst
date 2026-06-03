import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem, Transaction, TransactionDetail } from "@/lib/types";
import { generateKode } from "@/lib/format";

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function useTransactionDetails(transactionId: string | null) {
  return useQuery({
    queryKey: ["transaction_details", transactionId],
    enabled: !!transactionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_details")
        .select("*")
        .eq("transaction_id", transactionId as string);
      if (error) throw error;
      return (data ?? []) as TransactionDetail[];
    },
  });
}

export interface CheckoutResult {
  transactionId: string;
  kode: string;
  total: number;
  bayar: number;
  kembalian: number;
  items: { nama_menu: string; harga: number; qty: number; subtotal: number }[];
  createdAt: string;
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cart,
      bayar,
    }: {
      cart: CartItem[];
      bayar: number;
    }): Promise<CheckoutResult> => {
      const total = cart.reduce((s, c) => s + c.menu.harga * c.qty, 0);
      const kembalian = bayar - total;
      const kode = generateKode();
      const items = cart.map((c) => ({
        menu_id: c.menu.id,
        nama_menu: c.menu.nama_menu,
        harga: c.menu.harga,
        qty: c.qty,
        subtotal: c.menu.harga * c.qty,
      }));

      const { data, error } = await supabase.rpc("create_pos_transaction", {
        p_kode: kode,
        p_total: total,
        p_bayar: bayar,
        p_kembalian: kembalian,
        p_items: items,
      });
      if (error) throw error;

      return {
        transactionId: data as string,
        kode,
        total,
        bayar,
        kembalian,
        items,
        createdAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["menus"] });
    },
  });
}