import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ImageOff,
  Loader2,
  Wallet,
} from "lucide-react";
import { useMenus } from "@/hooks/useMenus";
import { useCheckout, type CheckoutResult } from "@/hooks/useTransactions";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import type { CartItem, Menu } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transaksi")({
  head: () => ({ meta: [{ title: "Transaksi — KantinPOS" }] }),
  component: TransaksiPage,
});

const QUICK_CASH = [10000, 20000, 50000, 100000];

function TransaksiPage() {
  const { data: menus, isLoading } = useMenus();
  const checkout = useCheckout();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bayar, setBayar] = useState("");
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);

  const filtered = useMemo(
    () =>
      (menus ?? []).filter((m) =>
        m.nama_menu.toLowerCase().includes(search.toLowerCase()),
      ),
    [menus, search],
  );

  const total = cart.reduce((s, c) => s + c.menu.harga * c.qty, 0);
  const bayarNum = Number(bayar) || 0;
  const kembalian = bayarNum - total;

  const addToCart = (menu: Menu) => {
    if (menu.stok <= 0) return;
    setCart((prev) => {
      const found = prev.find((c) => c.menu.id === menu.id);
      if (found) {
        if (found.qty >= menu.stok) {
          toast.error(`Stok ${menu.nama_menu} hanya ${menu.stok}`);
          return prev;
        }
        return prev.map((c) =>
          c.menu.id === menu.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { menu, qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menu.id !== id) return c;
          const next = c.qty + delta;
          if (next > c.menu.stok) {
            toast.error(`Stok ${c.menu.nama_menu} hanya ${c.menu.stok}`);
            return c;
          }
          return { ...c, qty: next };
        })
        .filter((c) => c.qty > 0),
    );
  };

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((c) => c.menu.id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (bayarNum < total) {
      toast.error("Uang dibayar kurang dari total");
      return;
    }
    try {
      const result = await checkout.mutateAsync({ cart, bayar: bayarNum });
      setReceipt(result);
      setCart([]);
      setBayar("");
      toast.success("Transaksi tersimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal checkout");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* Left: menus */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
            Transaksi
          </h1>
          <p className="text-sm text-muted-foreground">
            Pilih menu untuk menambahkan ke keranjang.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari menu…"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => {
              const habis = m.stok <= 0;
              return (
                <button
                  key={m.id}
                  disabled={habis}
                  onClick={() => addToCart(m)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-soft transition-all",
                    habis
                      ? "cursor-not-allowed opacity-60"
                      : "hover:-translate-y-0.5 hover:shadow-elegant",
                  )}
                >
                  <div className="relative aspect-square w-full bg-muted">
                    {m.imageUrl ? (
                      <img
                        src={m.imageUrl}
                        alt={m.nama_menu}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-7 w-7" />
                      </div>
                    )}
                    {habis && (
                      <Badge
                        variant="destructive"
                        className="absolute left-2 top-2"
                      >
                        Stok Habis
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                      {m.nama_menu}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stok: {m.stok}
                    </p>
                    <p className="mt-1 font-display text-sm font-bold text-primary">
                      {formatRupiah(m.harga)}
                    </p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-12 text-center text-muted-foreground">
                Tidak ada menu ditemukan.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: cart */}
      <Card className="flex h-fit flex-col gap-4 p-5 shadow-soft lg:sticky lg:top-20">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Keranjang</h2>
          {cart.length > 0 && (
            <Badge className="ml-auto bg-gradient-primary text-primary-foreground">
              {cart.reduce((s, c) => s + c.qty, 0)} item
            </Badge>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Keranjang masih kosong.
          </div>
        ) : (
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {cart.map((c) => (
              <div key={c.menu.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.menu.nama_menu}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRupiah(c.menu.harga)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => changeQty(c.menu.id, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {c.qty}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => changeQty(c.menu.id, 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeItem(c.menu.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between font-display text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatRupiah(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Uang dibayar"
              value={bayar}
              onChange={(e) => setBayar(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CASH.map((c) => (
              <Button
                key={c}
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setBayar(String(c))}
              >
                {c / 1000}rb
              </Button>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setBayar(String(total))}
            >
              Pas
            </Button>
          </div>
          {bayarNum > 0 && (
            <div
              className={cn(
                "flex justify-between rounded-lg px-3 py-2 text-sm font-medium",
                kembalian < 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/10 text-success",
              )}
            >
              <span>{kembalian < 0 ? "Kurang" : "Kembalian"}</span>
              <span>{formatRupiah(Math.abs(kembalian))}</span>
            </div>
          )}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={cart.length === 0 || kembalian < 0 || checkout.isPending}
          onClick={handleCheckout}
        >
          {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Bayar & Simpan
        </Button>
      </Card>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}