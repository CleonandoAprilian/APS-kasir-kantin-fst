import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ImagePlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KATEGORI_OPTIONS, type Menu } from "@/lib/types";
import { uploadMenuImage, useSaveMenu } from "@/hooks/useMenus";

const schema = z.object({
  nama_menu: z.string().trim().min(1, "Nama wajib diisi").max(120),
  kategori: z.string().min(1, "Kategori wajib dipilih"),
  harga: z.coerce.number().int().min(0, "Harga tidak valid").max(100000000),
  stok: z.coerce.number().int().min(0, "Stok tidak valid").max(1000000),
});
type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Menu | null;
}

export function MenuFormDialog({ open, onOpenChange, editing }: Props) {
  const save = useSaveMenu();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nama_menu: "", kategori: "Makanan", harga: 0, stok: 0 },
  });

  useEffect(() => {
    if (open) {
      setFile(null);
      if (editing) {
        reset({
          nama_menu: editing.nama_menu,
          kategori: editing.kategori,
          harga: editing.harga,
          stok: editing.stok,
        });
        setPreview(editing.imageUrl ?? null);
      } else {
        reset({ nama_menu: "", kategori: "Makanan", harga: 0, stok: 0 });
        setPreview(null);
      }
    }
  }, [open, editing, reset]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      let gambar = editing?.gambar ?? null;
      if (file) gambar = await uploadMenuImage(file);

      await save.mutateAsync({
        id: editing?.id,
        nama_menu: values.nama_menu,
        kategori: values.kategori,
        harga: Number(values.harga),
        stok: Number(values.stok),
        gambar,
      });
      toast.success(editing ? "Menu diperbarui" : "Menu ditambahkan");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan menu");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Image */}
          <div className="space-y-1.5">
            <Label>Gambar</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            {preview ? (
              <div className="relative h-36 w-full overflow-hidden rounded-xl border border-border">
                <img
                  src={preview}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground shadow-soft"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
              >
                <ImagePlus className="h-7 w-7" />
                <span className="text-sm">Unggah gambar menu</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nama_menu">Nama Menu</Label>
            <Input id="nama_menu" {...register("nama_menu")} />
            {errors.nama_menu && (
              <p className="text-xs text-destructive">
                {errors.nama_menu.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={watch("kategori")}
              onValueChange={(v) => setValue("kategori", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {KATEGORI_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="harga">Harga (Rp)</Label>
              <Input id="harga" type="number" {...register("harga")} />
              {errors.harga && (
                <p className="text-xs text-destructive">{errors.harga.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stok">Stok</Label>
              <Input id="stok" type="number" {...register("stok")} />
              {errors.stok && (
                <p className="text-xs text-destructive">{errors.stok.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}