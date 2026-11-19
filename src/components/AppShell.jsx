import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileStack, Droplets, Package, ClipboardList,
  Users, CalendarX, Menu, X, Calculator,
  ListTodo, CalendarDays, Globe, Search, Boxes, Receipt, PieChart, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import Logo from "@/components/Logo";
import Breadcrumbs from "@/components/Breadcrumbs";
import NavUser from "@/components/NavUser";
import CommandPalette, { CommandPaletteTrigger, useCommandPalette } from "@/components/CommandPalette";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

const TIMEOUT_MS = 60 * 60 * 1000;
const WARN_MS = 58 * 60 * 1000;

export default function AppShell() {
  const { user, logout, perms } = useAuth();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [warn, setWarn] = useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const warnRef = useRef(null);
  const outRef = useRef(null);

  const doLogout = useCallback(async (type) => { await logout(type); navigate("/login"); }, [logout, navigate]);

  const resetTimers = useCallback(() => {
    setWarn(false);
    clearTimeout(warnRef.current);
    clearTimeout(outRef.current);
    warnRef.current = setTimeout(() => setWarn(true), WARN_MS);
    outRef.current = setTimeout(() => {
      toast.warning("Anda telah logout otomatis karena tidak aktif.");
      doLogout("auto");
    }, TIMEOUT_MS);
  }, [doLogout]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    const handler = () => resetTimers();
    events.forEach((e) => window.addEventListener(e, handler));
    resetTimers();
    return () => { events.forEach((e) => window.removeEventListener(e, handler)); clearTimeout(warnRef.current); clearTimeout(outRef.current); };
  }, [resetTimers]);

  const isSuper = user?.role === "superadmin";
  const en = lang === "en";
  const L = (id, enText) => (en ? enText : id);

  const stokMenu = [
    { to: "/stok", label: L("Dashboard Stok", "Stock Dashboard"), icon: LayoutDashboard, end: true, show: perms.canStokDashboard },
    { to: "/stok/kertas", label: L("Mutasi Kertas", "Paper Movements"), icon: FileStack, show: perms.canStokMutations },
    { to: "/stok/tinta", label: L("Mutasi Tinta", "Ink Movements"), icon: Droplets, show: perms.canStokMutations },
    { to: "/stok/lainnya", label: L("Mutasi Lain", "Other Movements"), icon: Package, show: perms.canStokMutations },
    { to: "/stok/laporan-stok", label: L("Laporan Stok", "Stock Report"), icon: ClipboardList, show: perms.canStokReport },
    { to: "/stok/tutup-tahun", label: L("Tutup Tahun", "Year-End Close"), icon: CalendarX, show: perms.canStokYearClose },
  ].filter((m) => m.show);

  const logUserItem = perms.canStokLogs
    ? { to: "/stok/log-user", label: L("Log & User", "Logs & Users"), icon: Users }
    : null;

  const poMenu = [
    { to: "/po", label: L("Dashboard PO", "PO Dashboard"), icon: LayoutDashboard, end: true },
    { to: "/po/pos", label: L("Daftar PO", "PO List"), icon: ListTodo },
    { to: "/po/kalender", label: L("Kalender Produksi", "Production Calendar"), icon: CalendarDays },
  ];
  const produksiResetItem = isSuper ? [{ to: "/po/hapus-data", label: L("Hapus Data Produksi", "Clear Production Data"), icon: Trash2 }] : [];
  const klienMenu = perms.canStokKlien
    ? [{ to: "/stok-klien", label: L("Stok Klien", "Client Stock"), icon: Boxes, end: true }]
    : [];
  const tempoMenu = perms.canTempo
    ? [
        { to: "/tempo", label: L("Jatuh Tempo Klien", "Client Due Dates"), icon: Receipt, end: true },
        { to: "/tempo/laporan", label: L("Laporan Jatuh Tempo", "Due Date Report"), icon: PieChart },
      ]
    : [];
  const hppMenu = perms.canHpp ? [{ to: "/hpp", label: L("Kalkulator HPP", "COGS Calculator"), icon: Calculator, end: true }] : [];

  // Gaya "Navy Ledger": item aktif = latar biru muda + teks biru tua (bukan blok solid).
  const NavItem = ({ item }) => (
    <NavLink to={item.to} end={item.end}
      data-testid={`nav-${item.to.replace(/[^a-z]+/g, "-")}`}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors duration-150 ${isActive
          ? "bg-accent font-semibold text-accent-foreground"
          : "font-medium text-foreground/75 hover:bg-secondary hover:text-foreground"}`}>
      <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
      <span className="flex-1 truncate">{item.label}</span>
    </NavLink>
  );

  const SectionHeader = ({ label }) => (
    <div className="px-2.5 pb-1.5 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{label}</div>
  );

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <Logo size={30} />
        <div className="min-w-0">
          <div className="text-[14px] font-bold leading-tight">SCA Portal</div>
          <div className="text-[11px] text-muted-foreground">Percetakan SCA</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin" aria-label={L("Menu utama", "Main menu")}>
        <SectionHeader label={L("Stok", "Stock")} />
        <div className="space-y-0.5">{stokMenu.map((item) => <NavItem key={item.to} item={item} />)}</div>
        <SectionHeader label={L("Produksi", "Production")} />
        <div className="space-y-0.5">
          {poMenu.map((item) => <NavItem key={item.to} item={item} />)}
          {klienMenu.map((item) => <NavItem key={item.to} item={item} />)}
          {produksiResetItem.map((item) => <NavItem key={item.to} item={item} />)}
        </div>
        {(tempoMenu.length > 0 || hppMenu.length > 0) && (
          <>
            <SectionHeader label={L("Keuangan", "Finance")} />
            <div className="space-y-0.5">
              {tempoMenu.map((item) => <NavItem key={item.to} item={item} />)}
              {hppMenu.map((item) => <NavItem key={item.to} item={item} />)}
            </div>
          </>
        )}
      </nav>
      <div className="space-y-2 border-t border-border p-3">
        {logUserItem && (
          <div data-testid="sidebar-footer-nav">
            <NavItem item={logUserItem} />
          </div>
        )}
        <NavUser
          user={user}
          isSuper={isSuper}
          lang={lang}
          setLang={setLang}
          onLogout={() => doLogout("manual")}
        />
      </div>
    </div>
  );

  // Navigasi bawah khusus HP
  const bottomNav = [
    { to: "/stok", label: L("Beranda", "Home"), icon: LayoutDashboard, end: true },
    { to: "/stok/kertas", label: L("Stok", "Stock"), icon: FileStack },
    { to: "/po/pos", label: "PO", icon: ListTodo },
    { to: "/po/kalender", label: L("Kalender", "Calendar"), icon: CalendarDays },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-full w-[248px] shrink-0 flex-col border-r border-border bg-card md:flex">
        {SidebarInner}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[264px] bg-card shadow-xl">{SidebarInner}</div>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-7">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="outline" size="icon" className="md:hidden" data-testid="mobile-menu-button" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div className="hidden w-full max-w-[380px] md:block">
              <CommandPaletteTrigger onOpen={() => setCmdOpen(true)} label={L("Cari menu, item, PO…", "Search menu, items, POs…")} />
            </div>
            <div className="min-w-0 truncate text-sm md:hidden">
              <Breadcrumbs />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="md:hidden" data-testid="command-palette-trigger-mobile"
              aria-label={L("Cari menu", "Search menu")} onClick={() => setCmdOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-9 w-[124px]" data-testid="lang-toggle" aria-label={L("Bahasa", "Language")}>
                <div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{en ? "English" : "Indonesia"}</div>
              </SelectTrigger>
              <SelectContent><SelectItem value="id">Indonesia</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
            </Select>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <div className="hidden border-b border-border bg-card/60 px-7 py-2 text-sm md:block">
          <Breadcrumbs />
        </div>
        <main className="flex flex-1 flex-col overflow-y-auto p-4 pb-24 md:p-7 md:pb-7">
          <Suspense
            fallback={
              <div role="status" aria-label="Memuat halaman" className="flex flex-1 flex-col gap-4">
                <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-64 w-full animate-pulse rounded-xl bg-muted" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-card md:hidden" aria-label={L("Navigasi bawah", "Bottom navigation")}>
          {bottomNav.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}
              className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] ${isActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>
              <it.icon className="h-5 w-5" />{it.label}
            </NavLink>
          ))}
          <button type="button" onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-muted-foreground">
            <Menu className="h-5 w-5" />{L("Lainnya", "More")}
          </button>
        </nav>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      <AlertDialog open={warn} onOpenChange={setWarn}>
        <AlertDialogContent data-testid="idle-warning-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Sesi akan berakhir</AlertDialogTitle>
            <AlertDialogDescription>Anda tidak aktif selama beberapa waktu. Sistem akan logout otomatis dalam ±2 menit. Klik "Tetap Login" untuk melanjutkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="idle-logout-now" onClick={() => doLogout("manual")}>Keluar Sekarang</AlertDialogCancel>
            <AlertDialogAction data-testid="idle-stay-login" onClick={() => resetTimers()}>Tetap Login</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
