import { useState } from "react";
import { CalendarX, FileDown, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { useAuth, apiError } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

function Inner() {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const year = new Date().getFullYear();
  const [steps, setSteps] = useState({ mutations: false, stock: false });
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const dlMutations = async () => {
    setBusy(true);
    try {
      await downloadPdf("/pdf/paper-mutations", {}, `laporan-mutasi-kertas-${year}.pdf`);
      await downloadPdf("/pdf/ink-mutations", {}, `laporan-mutasi-tinta-${year}.pdf`);
      await downloadPdf("/pdf/other-mutations", {}, `laporan-mutasi-lain-${year}.pdf`);
      setSteps((s) => ({ ...s, mutations: true }));
      toast.success("PDF mutasi kertas, tinta & lain terunduh.");
    } catch (e) { toast.error(apiError(e, "Gagal unduh PDF mutasi")); }
    finally { setBusy(false); }
  };

  const dlStock = async () => {
    try {
      await downloadPdf("/pdf/stock-ringkas", {}, `laporan-stok-akhir-${year}.pdf`);
      setSteps((s) => ({ ...s, stock: true }));
      toast.success("PDF stok akhir terunduh.");
    } catch (e) { toast.error(apiError(e, "Gagal unduh PDF")); }
  };

  const allDone = steps.mutations && steps.stock;

  const doClose = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/year/close");
      toast.success(`Tahun ditutup. ${data.paper_deleted + data.ink_deleted + data.other_deleted} mutasi dihapus, ${data.paper_carried + data.ink_carried + data.other_carried} saldo awal dibuat.`);
      setConfirmOpen(false);
      setSteps({ mutations: false, stock: false });
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const Step = ({ done, children }) => (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={`h-4 w-4 ${done ? "text-emerald-500" : "text-muted-foreground/40"}`} />
      <span className={done ? "" : "text-muted-foreground"}>{children}</span>
    </div>
  );

  return (
    <PageContainer
      testid="year-close-page"
      className="mx-auto max-w-2xl"
      pageTitle="Tutup Tahun"
      pageDescription={`Unduh laporan akhir tahun ${year}, lalu reset data untuk tahun baru.`}
    >

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-amber-500/15 text-amber-600"><CalendarX className="h-5 w-5" /></div>
          <div>
            <h3 className="font-display text-lg font-bold">Langkah 1 — Unduh Laporan</h3>
            <p className="text-sm text-muted-foreground">Wajib unduh semua laporan sebelum menghapus data.</p>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border p-4">
          <Step done={steps.mutations}>PDF Laporan Mutasi Kertas, Tinta & Lain (setahun penuh)</Step>
          <Step done={steps.stock}>PDF Laporan Stok Akhir</Step>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" data-testid="download-mutations-pdf" disabled={busy} onClick={dlMutations}>
            <FileDown className="h-4 w-4" /> Unduh PDF Mutasi
          </Button>
          <Button variant="outline" className="gap-2" data-testid="download-stock-pdf" onClick={dlStock}>
            <FileDown className="h-4 w-4" /> Unduh PDF Stok Akhir
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold">Langkah 2 — Reset Data Tahun</h3>
          <p className="text-sm text-muted-foreground">Menghapus seluruh riwayat mutasi kertas, tinta & lain. Item tetap ada dan sisa stok dibawa sebagai mutasi masuk "Saldo awal". Data user & log tetap tersimpan.</p>
        </div>
        <Button variant="destructive" className="gap-2" data-testid="close-year-button" disabled={!allDone || busy}
          onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" /> Hapus Data & Mulai Tahun Baru
        </Button>
        {!allDone && <p className="text-xs text-muted-foreground">Unduh semua laporan terlebih dahulu untuk mengaktifkan tombol ini.</p>}
      </Card>


      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="year-close-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin ingin menutup tahun?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh riwayat mutasi akan dihapus permanen. Sisa stok tiap item dicatat ulang sebagai "Saldo awal". Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-year-close" onClick={doClose}>
              Ya, Tutup Tahun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

export default function YearClose() {
  return <Inner />;
}
