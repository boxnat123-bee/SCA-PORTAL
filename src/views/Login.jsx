import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, apiError } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";

const QUOTE_FONT = { fontFamily: "var(--font-quote), 'Archivo Black', Inter, sans-serif" };

/** Wejangan (navy + aksen oranye). */
function Quote({ className = "" }) {
  return (
    <p className={`font-black leading-[1.12] tracking-[-0.01em] ${className}`} style={QUOTE_FONT}>
      Satu kali <span className="text-[#FCBF49]">teliti,</span> seribu lembar terselamatkan.
    </p>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const { lang, setLang } = useLang();
  const en = lang === "en";
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success(en ? "Signed in." : "Berhasil masuk.");
      navigate("/");
    } catch (err) { toast.error(apiError(err, en ? "Sign-in failed" : "Login gagal")); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#13254b] px-14 py-12 text-white lg:flex">
        {/* Hiasan: cincin oranye + bulatan kuning */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full border-[44px] border-[#F77F00]/90" />
        <div aria-hidden="true" className="pointer-events-none absolute right-16 top-40 h-24 w-24 rounded-full bg-[#FCBF49]" />
        <div className="relative flex items-center gap-3">
          <Logo size={36} plate />
          <div>
            <div className="text-base font-bold">SCA Portal</div>
            <div className="text-[12.5px] text-indigo-200">Percetakan SCA</div>
          </div>
        </div>
        <div className="relative max-w-[460px]">
          <div className="mb-5 h-1.5 w-12 rounded-full bg-[#F77F00]" />
          <Quote className="text-[44px] xl:text-[52px]" />
          <p className="mt-5 text-[15px] text-[#b9c3dd]">Cek ukuran, warna &amp; jumlah sebelum naik cetak.</p>
        </div>
        <div className="relative text-xs text-indigo-300">© {new Date().getFullYear()} Percetakan SCA</div>
      </section>

      <section className="relative flex items-center justify-center bg-card p-6">
        <div className="absolute right-5 top-5">
          <div className="inline-flex rounded-lg border border-border bg-secondary/60 p-1 text-xs font-semibold" role="group" aria-label="Bahasa / Language">
            <Globe className="mx-1.5 h-4 w-4 self-center text-muted-foreground" />
            {[["id", "Indonesia"], ["en", "English"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setLang(v)} aria-pressed={lang === v}
                className={`rounded-md px-2.5 py-1 ${lang === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="stagger-in w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <Logo size={34} />
              <span className="text-lg font-bold">SCA Portal</span>
            </div>
            <div className="mt-5 rounded-xl bg-[#13254b] px-5 py-4 text-white">
              <div className="mb-2.5 h-1 w-8 rounded-full bg-[#F77F00]" />
              <Quote className="text-[22px]" />
            </div>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight">{en ? "Sign in" : "Masuk"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {en ? "Use the account created by the Superadmin." : "Gunakan akun yang dibuat oleh Superadmin."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-[18px]">
            <div className="space-y-1.5">
              <Label htmlFor="username">{en ? "Username" : "Nama user"}</Label>
              <Input id="username" data-testid="login-username" value={username} className="h-11 rounded-[10px]"
                onChange={(e) => setUsername(e.target.value)} placeholder={en ? "e.g. Budi123" : "cth: Budi123"} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} data-testid="login-password" value={password}
                  className="h-11 rounded-[10px] pr-11" onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShow((v) => !v)}
                  aria-label={show ? (en ? "Hide password" : "Sembunyikan password") : (en ? "Show password" : "Tampilkan password")}
                  className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="h-[46px] w-full gap-2 rounded-[10px] text-[15px]" data-testid="login-submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? (en ? "Processing…" : "Memproses…") : (en ? "Sign in" : "Masuk")}
            </Button>
            <p className="text-center text-[12.5px] text-muted-foreground">
              {en ? "Forgot your password? Contact the Superadmin." : "Lupa password? Hubungi Superadmin."}
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
