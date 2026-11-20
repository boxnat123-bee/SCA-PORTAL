import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNotifAction, notifTag, handledTitle, fmtDay, KIND_LABEL } from "@/lib/notifications";
import { formatRupiah } from "@/lib/format";

/**
 * Daftar pengingat dengan:
 *  - tombol centang "sudah ditangani" (semua user) → pindah ke bawah & teks memudar, info siapa/kapan di tooltip
 *  - mode "Pilih" untuk menghapus beberapa item sekaligus (hilang dari tampilan user ini)
 * Dipakai di Beranda (Perlu Perhatian, ringkas & "Lihat semua") dan lonceng notifikasi.
 */
export default function AttentionList({ items, detailed = false, deletable = true, onOpen, empty = "Tidak ada pengingat saat ini.", toolbarClass = "" }) {
  const act = useNotifAction();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [confirm, setConfirm] = useState(false);

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const stop = () => { setSelecting(false); setPicked(new Set()); };
  const allPicked = items.length > 0 && picked.size === items.length;
  const remove = () => act.mutate({ ids: [...picked], action: "dismiss" }, { onSuccess: () => { setConfirm(false); stop(); } });

  return (
    <div>
      {deletable && items.length > 0 && (
        <div className={`flex items-center justify-end gap-1.5 ${toolbarClass}`}>
          {selecting ? (
            <>
              <label className="mr-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(items.map((n) => n.id)))} data-testid="attn-pick-all" />
                Pilih semua
              </label>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={stop}><X className="h-3.5 w-3.5" /> Batal</Button>
              <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" disabled={!picked.size}
                onClick={() => setConfirm(true)} data-testid="attn-delete">
                <Trash2 className="h-3.5 w-3.5" /> Hapus{picked.size ? ` (${picked.size})` : ""}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setSelecting(true)}
              title="Pilih pengingat yang ingin dihapus" data-testid="attn-select">
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </Button>
          )}
        </div>
      )}

      {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}
      {items.map((n) => {
        const tag = notifTag(n);
        const done = !!n.handled;
        return (
          <div key={n.id} title={handledTitle(n.handled)} data-testid={`attn-row-${n.id}`}
            className="flex items-center gap-3 border-b border-border/60 py-[11px] last:border-0">
            {selecting ? (
              <input type="checkbox" className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" checked={picked.has(n.id)}
                onChange={() => toggle(n.id)} aria-label={`Pilih ${n.title}`} />
            ) : (
              <button type="button" aria-pressed={done} disabled={act.isPending}
                aria-label={done ? "Tandai belum ditangani" : "Tandai sudah ditangani"}
                title={done ? handledTitle(n.handled) : "Tandai sudah ditangani"}
                onClick={() => act.mutate({ ids: [n.id], action: done ? "unhandle" : "handle" })}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${done
                  ? "border-emerald-600 bg-emerald-600 text-white" : "border-border text-transparent hover:border-emerald-600 hover:text-emerald-600"}`}>
                <Check className="h-3 w-3" strokeWidth={3} />
              </button>
            )}
            <div className={`flex min-w-0 flex-1 items-center gap-3 transition-opacity ${done ? "opacity-45" : ""}`}>
              <span className={`inline-flex min-w-[96px] justify-center whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold ${tag.cls}`}>{tag.text}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">{n.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {n.body}
                  {detailed && <> · {KIND_LABEL[n.kind] || ""} {fmtDay(n.date)}{n.amount ? ` · sisa ${formatRupiah(n.amount)}` : ""}</>}
                </div>
              </div>
            </div>
            {!selecting && (
              <Link to={n.link} onClick={onOpen} className="shrink-0 text-[12.5px] font-semibold text-primary hover:underline">Buka</Link>
            )}
          </div>
        );
      })}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {picked.size} pengingat?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengingat yang dipilih hilang dari tampilan Anda. Data PO / invoice tidak ikut terhapus, dan pengingat
              akan muncul lagi bila ada pengingat baru (mis. saat masuk H-7).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={act.isPending}>Hapus</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
