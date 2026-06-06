import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Store, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Masuk — KantinPOS" }],
  }),
  component: AuthPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Masukkan nama").max(50).optional(),
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});
type FormValues = z.infer<typeof schema>;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        toast.success("Selamat datang kembali!");
        navigate({ to: "/dashboard" });
      } else {
        if (!values.name || values.name.trim().length === 0) {
          throw new Error("Masukkan nama");
        }
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: values.name },
          },
        });
        if (error) throw error;
        // Jika verifikasi email aktif, session belum tersedia setelah daftar.
        if (!data.session) {
          toast.success("Akun dibuat. Cek email Anda untuk verifikasi sebelum login.", {
            duration: 6000,
          });
          setMode("login");
          reset();
          return;
        }
        toast.success("Akun berhasil dibuat!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(
        msg.includes("Invalid login")
          ? "Email atau password salah"
          : msg.toLowerCase().includes("email not confirmed")
            ? "Email belum diverifikasi. Cek email Anda atau nonaktifkan 'Confirm email' di pengaturan database."
            : msg.includes("already registered")
              ? "Email sudah terdaftar"
              : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Hero panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Store className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-bold">KantinPOS</span>
        </div>
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Kelola kantin Anda
            <br />
            lebih cepat & rapi.
          </h1>
          <p className="max-w-md text-primary-foreground/85">
            Menu dan stok terintegrasi, transaksi kilat, struk siap cetak, dan laporan penjualan
            harian maupun bulanan dalam satu aplikasi.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} KantinPOS</p>
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-white/10" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">KantinPOS</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">
            {mode === "login" ? "Masuk ke akun" : "Buat akun baru"}
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Masukkan kredensial pemilik kantin Anda."
              : "Daftarkan akun pemilik untuk mulai berjualan."}
          </p>

          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "login" | "register");
              reset();
            }}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" />
            <TabsContent value="register" />
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nama atau username"
                    className="pl-9"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="pemilik@kantin.com"
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  className="pl-9"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
