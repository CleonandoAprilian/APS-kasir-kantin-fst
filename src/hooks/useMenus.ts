import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Menu } from "@/lib/types";

const BUCKET = "menu-images";

async function withSignedUrls(menus: Menu[]): Promise<Menu[]> {
  const paths = menus.map((m) => m.gambar).filter((p): p is string => !!p);
  if (paths.length === 0) return menus.map((m) => ({ ...m, imageUrl: null }));

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60);

  const map = new Map<string, string>();
  (data ?? []).forEach((s) => {
    if (s.signedUrl && s.path) map.set(s.path, s.signedUrl);
  });

  return menus.map((m) => ({
    ...m,
    imageUrl: m.gambar ? (map.get(m.gambar) ?? null) : null,
  }));
}

export function useMenus() {
  return useQuery({
    queryKey: ["menus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return withSignedUrls((data ?? []) as Menu[]);
    },
  });
}

export async function uploadMenuImage(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tidak terautentikasi");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export interface MenuInput {
  id?: string;
  nama_menu: string;
  kategori: string;
  harga: number;
  stok: number;
  gambar?: string | null;
}

export function useSaveMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MenuInput) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("menus")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menus").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menus"] }),
  });
}

export function useDeleteMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (menu: Menu) => {
      const { error } = await supabase.from("menus").delete().eq("id", menu.id);
      if (error) throw error;
      if (menu.gambar) {
        await supabase.storage.from(BUCKET).remove([menu.gambar]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menus"] }),
  });
}