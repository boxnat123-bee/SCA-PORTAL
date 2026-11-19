import { useState } from "react";
import { FileDown, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth, apiError } from "@/context/AuthContext";
import PageContainer from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const Step = ({ ok, busy, loading, onClick, k, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
    <div className="flex items-center gap-2.5 text-sm">
      <CheckCircle2 className={`h-5 w-5 ${ok ? "text-emerald-600" : "text-muted-foreground/40"}`} />
      <span className={ok ? "font-medium" : ""}>{children}</span>
    </div>
    <Button variant={ok ? "outline" : "default"} size="sm" className="gap-2" disabled={busy} onClick={onClick} data-testid={`reset-dl-${k}`}>
      <FileDown className="h-4 w-4" />{loading ? "Mengunduh…" : ok ? "Unduh lagi" : "Unduh PDF"}
    </Button>
  </div>
);

/**
 * Halaman "Hapus Data …" (khusus Superadmin) — dipakai Produksi, Mutasi Stok & Keuangan.
 * Alur: unduh semua PDF arsip (steps) → tombol hapus aktif → ketik HAPUS → POST endpoint.
 *
 * steps: [{ key, label, fn }]  — fn() mengunduh PDF.
 * successMessage(data) → teks toast setelah berhasil.
 */
export default function DataResetPage({ testid, eyebrow, title, description, steps, endpoint, buttonLabel, dialogTitle, successMessage }) {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const [done, setDone] = useState({});
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const run = async ({ key, label, fn }) => {
    setBusy(key);
    try { await fn(); setDone((d) => ({ ...d, [key]: true })); toast.success(`${label} terunduh.`); }
    catch (e) { toast.error(apiError(e, `Gagal unduh ${label}`)); }
    finally { setBusy(""); }
  };
  const allDone = steps.every((s) => done[s.key]);

  const doReset = async () => {
    setBusy("reset");
    try {
      const { data } = await api.post(endpoint, { confirm: text });
      toast.success(successMessage(data));
      setOpen(false); setText(""); setDone({});
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(""); }
  };

  return (
    <PageContainer testid={testid} className="mx-auto max-w-2xl" pageEyebrow={eyebrow} pageTitle={title}
      access={isSuper} accessFallback={<div className="text-center text-muted-foreground">Halaman ini khusus Superadmin.</div>}>
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-700"><ShieldAlert className="h-5 w-5" /></div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        <div className="mt-4">
          {steps.map((s, i) => (
            <Step key={s.key} k={s.key} ok={!!done[s.key]} busy={!!busy} loading={busy === s.key} onClick={() => run(s)}>
              {i + 1}. {s.label}
            </Step>
          ))}
        </div>
        <Button variant="destructive" className="mt-5 w-full gap-2" disabled={!allDone || !!busy} onClick={() => setOpen(true)} data-testid="reset-open">
          <Trash2 className="h-4 w-4" /> {buttonLabel}
        </Button>
        {!allDone && <p className="mt-2 text-center text-xs text-muted-foreground">Tombol aktif setelah semua PDF diunduh.</p>}
      </Card>

      <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
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
