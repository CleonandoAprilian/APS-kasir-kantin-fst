export interface Menu {
  id: string;
  nama_menu: string;
  kategori: string;
  harga: number;
  stok: number;
  gambar: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  imageUrl?: string | null;
}

export interface Transaction {
  id: string;
  kode_transaksi: string;
  total: number;
  bayar: number;
  kembalian: number;
  owner_id: string;
  created_at: string;
}

export interface TransactionDetail {
  id: string;
  transaction_id: string;
  menu_id: string | null;
  nama_menu: string;
  harga: number;
  qty: number;
  subtotal: number;
}

export interface CartItem {
  menu: Menu;
  qty: number;
}

export const KATEGORI_OPTIONS = [
  "Makanan",
  "Minuman",
  "Snack",
  "Paket",
  "Lainnya",
] as const;