import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ShoppingCart,
  Wallet,
  Package,
  UtensilsCrossed,
  Boxes,
  ReceiptText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/layout/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KantinPOS" }] }),
  component: Dashboard,
  errorComponent: ({ error }) => (
    <p className="text-sm text-destructive">Gagal memuat: {error.message}</p>
  ),
});

interface TxRow {
  id: string;
  total: number;
  created_at: string;
  transaction_details: { qty: number }[];
}

function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: menus, error: me }, { data: txs, error: te }] =
        await Promise.all([
          supabase.from("menus").select("stok"),
          supabase
            .from("transactions")
            .select("id, total, created_at, transaction_details(qty)")
            .order("created_at", { ascending: false }),
        ]);
      if (me) throw me;
      if (te) throw te;

      const today = new Date();
      const rows = (txs ?? []) as TxRow[];
      const todayTx = rows.filter((t) => isSameDay(t.created_at, today));

      const totalMenu = menus?.length ?? 0;
      const totalStok = (menus ?? []).reduce((s, m) => s + (m.stok ?? 0), 0);

      const todayRevenue = todayTx.reduce((s, t) => s + t.total, 0);
      const todaySold = todayTx.reduce(
        (s, t) =>
          s + t.transaction_details.reduce((q, d) => q + (d.qty ?? 0), 0),
        0,
      );

      // last 7 days chart
      const chart = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString("id-ID", {
          weekday: "short",
        });
        const revenue = rows
          .filter((t) => isSameDay(t.created_at, d))
          .reduce((s, t) => s + t.total, 0);
        return { label, revenue };
      });

      return {
        totalMenu,
        totalStok,
        totalRiwayat: rows.length,
        todayCount: todayTx.length,
        todayRevenue,
        todaySold,
        chart,
      };
    },
  });
}

function Dashboard() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan penjualan dan stok kantin Anda.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Hari Ini
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Transaksi"
            value={String(data?.todayCount ?? 0)}
            icon={ShoppingCart}
            loading={isLoading}
          />
          <StatCard
            label="Total Pendapatan"
            value={formatRupiah(data?.todayRevenue)}
            icon={Wallet}
            loading={isLoading}
          />
          <StatCard
            label="Menu Terjual"
            value={String(data?.todaySold ?? 0)}
            icon={Package}
            accent="warning"
            loading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Keseluruhan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Menu"
            value={String(data?.totalMenu ?? 0)}
            icon={UtensilsCrossed}
            accent="muted"
            loading={isLoading}
          />
          <StatCard
            label="Total Stok"
            value={String(data?.totalStok ?? 0)}
            icon={Boxes}
            accent="muted"
            loading={isLoading}
          />
          <StatCard
            label="Total Riwayat"
            value={String(data?.totalRiwayat ?? 0)}
            icon={ReceiptText}
            accent="muted"
            loading={isLoading}
          />
        </div>
      </section>

      <Card className="p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">
          Penjualan 7 Hari Terakhir
        </h2>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.chart}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
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
                  formatter={(v) => formatRupiah(v as number)}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Pendapatan"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}