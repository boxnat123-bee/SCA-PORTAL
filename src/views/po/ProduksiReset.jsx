import { useState } from "react";
import { FileDown, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth, apiError } from "@/context/AuthContext";
import { exportPoRekapPdf } from "@/lib/poApi";
import { exportKlienStokPdf, exportKlienRiwayatPdf } from "@/lib/klienApi";
import PageContainer from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/**
 * Hapus semua data bagian Produksi (khusus Superadmin).
 * Wajib unduh semua PDF Produksi dulu: Rekap Daftar PO, Stok Klien, Riwayat Mutasi Klien.
 */
export default function ProduksiReset() {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const [done, setDone] = useState({ po: false, stok: false, riwayat: false });
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const run = async (key, fn, label) => {
    setBusy(key);
    try { await fn(); setDone((d) => ({ ...d, [key]: true })); toast.success(`${label} terunduh.`); }
    catch (e) { toast.error(apiError(e, `Gagal unduh ${label}`)); }
    finally { setBusy(""); }
  };
  const allDone = done.po && done.stok && done.riwayat;

  const doReset = async () => {
    setBusy("reset");
    try {
      const { data } = await api.post("/po/reset", { confirm: text });
      toast.success(`Data Produksi dihapus: ${data.po} PO, ${data.klien} klien, ${data.mutasi_klien} mutasi klien.`);
      setOpen(false); setText(""); setDone({ po: false, stok: false, riwayat: false });
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(""); }
  };

  const Step = ({ ok, children, onClick, k }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="flex items-center gap-2.5 text-sm">
        <CheckCircle2 className={`h-5 w-5 ${ok ? "text-emerald-600" : "text-muted-foreground/40"}`} />
        <span className={ok ? "font-medium" : ""}>{children}</span>
      </div>
      <Button variant={ok ? "outline" : "default"} size="sm" className="gap-2" disabled={!!busy} onClick={onClick} data-testid={`reset-dl-${k}`}>
        <FileDown className="h-4 w-4" />{busy === k ? "Mengunduh…" : ok ? "Unduh lagi" : "Unduh PDF"}
      </Button>
    </div>
  );

  return (
    <PageContainer testid="produksi-reset-page" className="mx-auto max-w-2xl" pageEyebrow="Produksi" pageTitle="Hapus Data Produksi"
      access={isSuper} accessFallback={<div className="text-center text-muted-foreground">Halaman ini khusus Superadmin.</div>}>
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-700"><ShieldAlert className="h-5 w-5" /></div>
          <div className="text-sm text-muted-foreground">
            Menghapus <b className="text-foreground">semua</b> data Daftar PO, jadwal Kalender Produksi, file lampiran PO,
            dan seluruh Stok Klien (klien, PO, item, riwayat mutasi). Unduh semua PDF di bawah dulu sebagai arsip.
          </div>
        </div>
        <div className="mt-4">
          <Step k="po" ok={done.po} onClick={() => run("po", () => exportPoRekapPdf({}), "PDF Rekap Daftar PO")}>1. PDF Rekap Daftar PO (semua PO)</Step>
          <Step k="stok" ok={done.stok} onClick={() => run("stok", () => exportKlienStokPdf("semua"), "PDF Stok Klien")}>2. PDF Stok Klien</Step>
          <Step k="riwayat" ok={done.riwayat} onClick={() => run("riwayat", () => exportKlienRiwayatPdf({}), "PDF Riwayat Mutasi Klien")}>3. PDF Riwayat Mutasi Klien</Step>
        </div>
        <Button variant="destructive" className="mt-5 w-full gap-2" disabled={!allDone || !!busy} onClick={() => setOpen(true)} data-testid="reset-open">
          <Trash2 className="h-4 w-4" /> Hapus Semua Data Produksi
        </Button>
        {!allDone && <p className="mt-2 text-center text-xs text-muted-foreground">Tombol aktif setelah ketiga PDF diunduh.</p>}
      </Card>

      <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua data Produksi?</AlertDialogTitle>
            <AlertDialogDescription>Data yang dihapus tidak bisa dikembalikan. Ketik <b>HAPUS</b> untuk melanjutkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm">Konfirmasi</Label>
            <Input id="reset-confirm" value={text} onChange={(e) => setText(e.target.value)} placeholder="HAPUS" autoComplete="off" data-testid="reset-confirm-input" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" disabled={text.trim().toUpperCase() !== "HAPUS" || busy === "reset"} onClick={doReset} data-testid="reset-confirm">
              {busy === "reset" ? "Menghapus…" : "Ya, hapus semua"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
