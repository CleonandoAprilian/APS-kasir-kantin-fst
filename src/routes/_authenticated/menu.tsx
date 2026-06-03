import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UtensilsCrossed,
  ImageOff,
} from "lucide-react";
import { useMenus, useDeleteMenu } from "@/hooks/useMenus";
import { MenuFormDialog } from "@/components/pos/MenuFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KATEGORI_OPTIONS, type Menu } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({ meta: [{ title: "Menu & Stok — KantinPOS" }] }),
  component: MenuPage,
});

function StokBadge({ stok }: { stok: number }) {
  if (stok <= 0) return <Badge variant="destructive">Stok Habis</Badge>;
  if (stok <= 5)
    return (
      <Badge className="bg-warning text-warning-foreground hover:bg-warning">
        Menipis · {stok}
      </Badge>
    );
  return <Badge variant="secondary">{stok}</Badge>;
}

function MenuThumb({ menu }: { menu: Menu }) {
  if (menu.imageUrl)
    return (
      <img
        src={menu.imageUrl}
        alt={menu.nama_menu}
        className="h-12 w-12 rounded-lg object-cover"
      />
    );
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <ImageOff className="h-5 w-5" />
    </div>
  );
}

function MenuPage() {
  const { data: menus, isLoading } = useMenus();
  const del = useDeleteMenu();
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Menu | null>(null);
  const [toDelete, setToDelete] = useState<Menu | null>(null);

  const filtered = useMemo(() => {
    return (menus ?? []).filter((m) => {
      const matchSearch = m.nama_menu
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchKat = kategori === "all" || m.kategori === kategori;
      return matchSearch && matchKat;
    });
  }, [menus, search, kategori]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (m: Menu) => {
    setEditing(m);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete);
      toast.success("Menu dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
            Menu & Stok
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar menu. Jumlah stok = ketersediaan menu.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Tambah Menu
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama menu…"
            className="pl-9"
          />
        </div>
        <Select value={kategori} onValueChange={setKategori}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {KATEGORI_OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Gambar</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Harga</th>
                <th className="px-4 py-3 font-semibold">Stok</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </td>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Belum ada menu yang cocok.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <MenuThumb menu={m} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {m.nama_menu}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{m.kategori}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatRupiah(m.harga)}
                    </td>
                    <td className="px-4 py-3">
                      <StokBadge stok={m.stok} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete(m)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <MenuFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus menu ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Menu <strong>{toDelete?.nama_menu}</strong> akan dihapus permanen.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}