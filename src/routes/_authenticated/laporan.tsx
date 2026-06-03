import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Wallet, ShoppingCart, Package, FileDown, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/layout/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah, todayISO, currentMonthISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({ meta: [{ title: "Laporan — KantinPOS" }] }),
  component: LaporanPage,
});

interface ReportTx {
  id: string;
  kode_transaksi: string;
  total: number;
  created_at: string;
  transaction_details: { nama_menu: string; qty: number; subtotal: number }[];
}

function useReport(mode: "harian" | "bulanan", value: string) {
  return useQuery({
    queryKey: ["report", mode, value],
    queryFn: async () => {
      let start: Date;
      let end: Date;
      if (mode === "harian") {
        start = new Date(value + "T00:00:00");
        end = new Date(value + "T23:59:59.999");
      } else {
        const [y, m] = value.split("-").map(Number);
        start = new Date(y, m - 1, 1, 0, 0, 0);
        end = new Date(y, m, 0, 23, 59, 59, 999);
      }
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, kode_transaksi, total, created_at, transaction_details(nama_menu, qty, subtotal)",
        )
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReportTx[];
    },
  });
}

function LaporanPage() {
  const [mode, setMode] = useState<"harian" | "bulanan">("harian");
  const [day, setDay] = useState(todayISO());
  const [month, setMonth] = useState(currentMonthISO());
  const value = mode === "harian" ? day : month;
  const { data: txs, isLoading } = useReport(mode, value);

  const summary = useMemo(() => {
    const rows = txs ?? [];
    const pendapatan = rows.reduce((s, t) => s + t.total, 0);
    const item = rows.reduce(
      (s, t) => s + t.transaction_details.reduce((q, d) => q + d.qty, 0),
      0,
    );
    return { pendapatan, transaksi: rows.length, item };
  }, [txs]);

  const chart = useMemo(() => {
    const rows = txs ?? [];
    if (mode === "harian") {
      const hours = Array.from({ length: 24 }).map((_, h) => ({
        label: `${String(h).padStart(2, "0")}`,
        revenue: 0,
      }));
      rows.forEach((t) => {
        const h = new Date(t.created_at).getHours();
        hours[h].revenue += t.total;
      });
      return hours.filter((_, h) => h >= 6 && h <= 22);
    }
    const [y, m] = value.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    const arr = Array.from({ length: days }).map((_, i) => ({
      label: String(i + 1),
      revenue: 0,
    }));
    rows.forEach((t) => {
      const d = new Date(t.created_at).getDate();
      arr[d - 1].revenue += t.total;
    });
    return arr;
  }, [txs, mode, value]);

  const exportExcel = () => {
    const rows = txs ?? [];
    if (rows.length === 0) return toast.error("Tidak ada data untuk diekspor");
    const header = ["Kode", "Tanggal", "Item", "Total"];
    const lines = rows.map((t) => [
      t.kode_transaksi,
      new Date(t.created_at).toLocaleString("id-ID"),
      t.transaction_details.reduce((q, d) => q + d.qty, 0),
      t.total,
    ]);
    lines.push(["", "", "TOTAL", summary.pendapatan]);
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Laporan Excel diunduh");
  };

  const exportPDF = () => {
    const rows = txs ?? [];
    if (rows.length === 0) return toast.error("Tidak ada data untuk diekspor");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Penjualan — KantinPOS", 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Periode: ${mode === "harian" ? day : month}`,
      14,
      25,
    );
    doc.text(
      `Total Pendapatan: ${formatRupiah(summary.pendapatan)}  |  Transaksi: ${summary.transaksi}  |  Item: ${summary.item}`,
      14,
      31,
    );
    autoTable(doc, {
      startY: 37,
      head: [["Kode", "Tanggal", "Item", "Total"]],
      body: rows.map((t) => [
        t.kode_transaksi,
        new Date(t.created_at).toLocaleString("id-ID"),
        String(t.transaction_details.reduce((q, d) => q + d.qty, 0)),
        formatRupiah(t.total),
      ]),
      headStyles: { fillColor: [34, 139, 87] },
      styles: { fontSize: 9 },
    });
    doc.save(`laporan-${value}.pdf`);
    toast.success("Laporan PDF diunduh");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
            Laporan
          </h1>
          <p className="text-sm text-muted-foreground">
            Rekap penjualan harian dan bulanan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <Sheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="harian">Harian</TabsTrigger>
            <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "harian" ? (
          <Input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-48"
          />
        ) : (
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Pendapatan"
          value={formatRupiah(summary.pendapatan)}
          icon={Wallet}
          loading={isLoading}
        />
        <StatCard
          label="Total Transaksi"
          value={String(summary.transaksi)}
          icon={ShoppingCart}
          accent="muted"
          loading={isLoading}
        />
        <StatCard
          label="Total Item Terjual"
          value={String(summary.item)}
          icon={Package}
          accent="warning"
          loading={isLoading}
        />
      </div>

      <Card className="p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">
          Grafik Penjualan {mode === "harian" ? "per Jam" : "per Tanggal"}
        </h2>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v) => formatRupiah(v as number)}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  formatter={(v) => formatRupiah(v as number)}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Pendapatan"
                  fill="var(--color-primary)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}