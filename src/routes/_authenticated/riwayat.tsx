import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Eye, ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useTransactions,
  useTransactionDetails,
} from "@/hooks/useTransactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, formatDateTime } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/riwayat")({
  head: () => ({ meta: [{ title: "Riwayat Transaksi — KantinPOS" }] }),
  component: RiwayatPage,
});

const PAGE_SIZE = 8;

function DetailDialog({
  tx,
  onClose,
}: {
  tx: Transaction | null;
  onClose: () => void;
}) {
  const { data: details, isLoading } = useTransactionDetails(tx?.id ?? null);
  return (
    <Dialog open={!!tx} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Transaksi</DialogTitle>
        </DialogHeader>
        {tx && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{tx.kode_transaksi}</span>
              <span>{formatDateTime(tx.created_at)}</span>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                (details ?? []).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{d.nama_menu}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.qty} x {formatRupiah(d.harga)}
                      </p>
                    </div>
                    <span className="font-medium">{formatRupiah(d.subtotal)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(tx.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Bayar</span>
                <span>{formatRupiah(tx.bayar)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Kembalian</span>
                <span>{formatRupiah(tx.kembalian)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RiwayatPage() {
  const { data: txs, isLoading } = useTransactions();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return (txs ?? []).filter((t) => {
      const matchSearch = t.kode_transaksi
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchDate =
        !date || t.created_at.slice(0, 10) === date;
      return matchSearch && matchDate;
    });
  }, [txs, search, date]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
          Riwayat Transaksi
        </h1>
        <p className="text-sm text-muted-foreground">
          Daftar seluruh transaksi penjualan.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode transaksi…"
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48"
        />
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <ReceiptText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Belum ada transaksi.
                    </p>
                  </td>
                </tr>
              ) : (
                pageItems.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {t.kode_transaksi}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(t.created_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {formatRupiah(t.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(t)}
                        >
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {current} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={current <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={current >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <DetailDialog tx={detail} onClose={() => setDetail(null)} />
    </div>
  );
}