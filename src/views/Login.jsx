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

/** Ilustrasi produksi cetak (lembar proof, color bar CMYK, pisau box, swatch). */
function PrintArt() {
  return (
    <svg viewBox="0 0 540 460" role="img" aria-label="Ilustrasi produksi cetak: lembar proof dengan color bar CMYK, pola pisau box, tanda register, dan kipas swatch warna" className="h-auto w-full max-w-[520px] self-center">
    <defs>
      <pattern id="lg-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.7" fill="#93c5fd"></circle></pattern>
      <radialGradient id="lg-fade" cx="62%" cy="45%" r="55%"><stop offset="0" stopColor="#fff" stopOpacity=".55"></stop><stop offset="1" stopColor="#fff" stopOpacity="0"></stop></radialGradient>
      <mask id="lg-m"><rect width="540" height="460" fill="url(#lg-fade)"></rect></mask>
      <filter id="lg-sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#0b1a4a" floodOpacity=".45"></feDropShadow></filter>
    </defs>
    <rect width="540" height="460" fill="url(#lg-dots)" mask="url(#lg-m)"></rect>
    <g stroke="#3b5cc4" strokeWidth="1.4" fill="none"><circle cx="470" cy="58" r="22"></circle><circle cx="470" cy="58" r="9.9"></circle><path d="M437.0 58H503.0M470 25.0V91.0"></path></g>
    <g transform="translate(250 92) rotate(-11)"><rect width="220" height="290" fill="#c7d2fe" opacity=".25"></rect></g>
    <g transform="translate(250 92) rotate(-4)"><rect width="220" height="290" fill="#e0e7ff" opacity=".55"></rect></g>
    <g transform="translate(250 92) rotate(5)">
<rect x="0" y="0" width="220" height="290" fill="#ffffff" filter="url(#lg-sh)"></rect>
<rect x="18" y="16" width="18" height="12" fill="#06b6d4"></rect><rect x="38" y="16" width="18" height="12" fill="#ec4899"></rect><rect x="58" y="16" width="18" height="12" fill="#facc15"></rect><rect x="78" y="16" width="18" height="12" fill="#111827"></rect><rect x="98" y="16" width="18" height="12" fill="#67e8f9"></rect><rect x="118" y="16" width="18" height="12" fill="#f9a8d4"></rect><rect x="138" y="16" width="18" height="12" fill="#fde68a"></rect><rect x="158" y="16" width="18" height="12" fill="#6b7280"></rect>
<g fill="#cbd5e1"><rect x="18" y="38" width="90" height="5" rx="2"></rect><rect x="18" y="48" width="60" height="5" rx="2"></rect></g>
<g fill="none" stroke="#1e3a8a" strokeWidth="1.3">
<path d="M70 70H150V120H200V180H150V250H70V180H20V120H70Z"></path>
<path d="M70 120H150M70 180H150M70 70V250M150 70V250" strokeDasharray="4 4" strokeWidth="1"></path>
<path d="M78 70L84 52H136L142 70M78 250L84 268H136L142 250" ></path></g>
<g stroke="#0f172a" strokeWidth="1" fill="none"><circle cx="196" cy="40" r="7"></circle><circle cx="196" cy="40" r="3.15"></circle><path d="M185.5 40H206.5M196 29.5V50.5"></path></g>
<circle cx="110" cy="150" r="16" fill="#1e3a8a" opacity=".08"></circle>
<text x="110" y="155" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="700" fill="#1e3a8a" letterSpacing="2">SCA</text>
<g fill="#cbd5e1"><rect x="18" y="272" width="70" height="4" rx="2"></rect><rect x="150" y="272" width="52" height="4" rx="2"></rect></g>
</g>
    <path d="M232 68V52M226 74H210" stroke="#c7d2fe" strokeWidth="1.2"></path><path d="M492 68V52M498 74H514" stroke="#c7d2fe" strokeWidth="1.2"></path><path d="M232 410V426M226 404H210" stroke="#c7d2fe" strokeWidth="1.2"></path><path d="M492 410V426M498 404H514" stroke="#c7d2fe" strokeWidth="1.2"></path>
    <g transform="translate(118 330) rotate(-22)"><rect x="-26" y="-150" width="52" height="150" rx="6" fill="#ffffff" filter="url(#lg-sh)"></rect><rect x="-20" y="-144" width="40" height="30" rx="2" fill="#06b6d4"></rect><rect x="-20" y="-108" width="40" height="22" rx="2" fill="#06b6d4" opacity=".7"></rect><rect x="-20" y="-80" width="40" height="18" rx="2" fill="#06b6d4" opacity=".45"></rect><rect x="-20" y="-56" width="40" height="14" rx="2" fill="#06b6d4" opacity=".22"></rect><rect x="-14" y="-30" width="28" height="4" rx="2" fill="#cbd5e1"></rect><circle cx="0" cy="-12" r="3" fill="#cbd5e1"></circle></g><g transform="translate(118 330) rotate(-8)"><rect x="-26" y="-150" width="52" height="150" rx="6" fill="#ffffff" filter="url(#lg-sh)"></rect><rect x="-20" y="-144" width="40" height="30" rx="2" fill="#ec4899"></rect><rect x="-20" y="-108" width="40" height="22" rx="2" fill="#ec4899" opacity=".7"></rect><rect x="-20" y="-80" width="40" height="18" rx="2" fill="#ec4899" opacity=".45"></rect><rect x="-20" y="-56" width="40" height="14" rx="2" fill="#ec4899" opacity=".22"></rect><rect x="-14" y="-30" width="28" height="4" rx="2" fill="#cbd5e1"></rect><circle cx="0" cy="-12" r="3" fill="#cbd5e1"></circle></g><g transform="translate(118 330) rotate(6)"><rect x="-26" y="-150" width="52" height="150" rx="6" fill="#ffffff" filter="url(#lg-sh)"></rect><rect x="-20" y="-144" width="40" height="30" rx="2" fill="#facc15"></rect><rect x="-20" y="-108" width="40" height="22" rx="2" fill="#facc15" opacity=".7"></rect><rect x="-20" y="-80" width="40" height="18" rx="2" fill="#facc15" opacity=".45"></rect><rect x="-20" y="-56" width="40" height="14" rx="2" fill="#facc15" opacity=".22"></rect><rect x="-14" y="-30" width="28" height="4" rx="2" fill="#cbd5e1"></rect><circle cx="0" cy="-12" r="3" fill="#cbd5e1"></circle></g>
    </svg>
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
      <section className="hidden flex-col justify-between bg-[#172554] px-14 py-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Logo size={36} plate />
          <div>
            <div className="text-base font-bold">SCA Portal</div>
            <div className="text-[12.5px] text-indigo-200">Percetakan SCA</div>
          </div>
        </div>
        <PrintArt />
        <div className="text-xs text-indigo-300">© {new Date().getFullYear()} Percetakan SCA</div>
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
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={34} />
            <span className="text-lg font-bold">SCA Portal</span>
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
