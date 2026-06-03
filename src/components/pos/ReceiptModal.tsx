import { Printer, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatDateTime } from "@/lib/format";
import type { CheckoutResult } from "@/hooks/useTransactions";

interface Props {
  receipt: CheckoutResult | null;
  onClose: () => void;
}

export function ReceiptModal({ receipt, onClose }: Props) {
  if (!receipt) return null;

  return (
    <Dialog open={!!receipt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" /> Transaksi Berhasil
          </DialogTitle>
        </DialogHeader>

        <div className="print-area rounded-xl border border-dashed border-border bg-card p-5 font-mono text-sm text-foreground">
          <div className="mb-3 text-center">
            <p className="font-display text-base font-bold">KANTIN KITA</p>
            <p className="text-xs text-muted-foreground">
              Struk Pembayaran
            </p>
          </div>
          <div className="mb-3 space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">No.</span>
              <span>{receipt.kode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal</span>
              <span>{formatDateTime(receipt.createdAt)}</span>
            </div>
          </div>

          <div className="border-y border-dashed border-border py-2">
            {receipt.items.map((it, i) => (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between">
                  <span className="font-medium">{it.nama_menu}</span>
                  <span>{formatRupiah(it.subtotal)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {it.qty} x {formatRupiah(it.harga)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>{formatRupiah(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Bayar</span>
              <span>{formatRupiah(receipt.bayar)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Kembalian</span>
              <span>{formatRupiah(receipt.kembalian)}</span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Terima kasih atas kunjungan Anda 🙏
          </p>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Cetak Struk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}