import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiError } from "@/context/AuthContext";
import * as kapi from "@/lib/klienApi";
import { fmtQty } from "@/lib/klienApi";

const today = () => new Date().toISOString().slice(0, 10);

const localNow = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toLocalInput = (iso) => {
  if (!iso) return localNow();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return localNow();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/* ------------------------------- Klien ------------------------------- */
export function KlienDialog({ open, onOpenChange, klien, onSaved }) {
  const [nama, setNama] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = !!klien;

  useEffect(() => { if (open) setNama(klien?.nama || ""); }, [open, klien]);

  const submit = async (e) => {
    e.preventDefault();
    if (!nama.trim()) return toast.error("Nama klien wajib diisi");
    setSaving(true);
    try {
      if (isEdit) {
        await kapi.updateKlien(klien.id, { nama });
        toast.success("Klien berhasil diperbarui");
      } else {
        await kapi.createKlien({ nama });
        toast.success("Klien berhasil ditambahkan");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, "Gagal menyimpan klien"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="klien-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Edit Klien" : "Tambah Klien Baru"}</DialogTitle>
          <DialogDescription>{isEdit ? "Perbarui nama klien." : "Masukkan nama klien baru."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="klien-nama">Nama Klien</Label>
            <Input id="klien-nama" data-testid="klien-nama-input" value={nama} autoFocus
              onChange={(e) => setNama(e.target.value)} placeholder="Contoh: PT Maju Bersama" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full"
              onClick={() => onOpenChange(false)} data-testid="klien-cancel-btn">Batal</Button>
            <Button type="submit" className="rounded-full" disabled={saving} data-testid="klien-submit-btn">
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Klien"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- PO -------------------------------- */
export function PODialog({ open, onOpenChange, kliens, fixedKlien, po, onSaved }) {
  const [klienId, setKlienId] = useState("");
  const [newKlien, setNewKlien] = useState("");
  const [noPo, setNoPo] = useState("");
  const [tanggal, setTanggal] = useState(today());
  const [saving, setSaving] = useState(false);
  const isEdit = !!po;

  useEffect(() => {
    if (!open) return;
    setKlienId(fixedKlien?.id || po?.klien_id || "");
    setNewKlien("");  // nama klien diketik manual (selalu kartu klien baru)
    setNoPo(po?.no_po || "");
    setTanggal(po?.tanggal_po?.slice(0, 10) || today());
  }, [open, po, fixedKlien]);

  const showKlienSelect = !isEdit && !fixedKlien;

  const submit = async (e) => {
    e.preventDefault();
    if (!noPo.trim()) return toast.error("No PO wajib diisi");
    if (!tanggal) return toast.error("Tanggal PO wajib diisi");
    setSaving(true);
    try {
      if (isEdit) {
        await kapi.updateKlienPo(po.id, { no_po: noPo, tanggal_po: tanggal });
        toast.success("PO berhasil diperbarui");
      } else {
        let kid = fixedKlien?.id;
        if (!kid) {
          if (!newKlien.trim()) { setSaving(false); return toast.error("Nama klien wajib diisi"); }
          const created = await kapi.createKlien({ nama: newKlien.trim() });
          kid = created.id;
        }
        if (!kid) { setSaving(false); return toast.error("Pilih klien terlebih dahulu"); }
        await kapi.createKlienPo({ klien_id: kid, no_po: noPo, tanggal_po: tanggal });
        toast.success("PO berhasil ditambahkan");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, "Gagal menyimpan PO"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="klien-po-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? `Edit PO No. ${po?.no_po}` : fixedKlien ? `Tambah PO — ${fixedKlien.nama}` : "Tambah Stok Klien"}
          </DialogTitle>
          <DialogDescription>Lengkapi data Purchase Order (No PO dan tanggal).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {showKlienSelect && (
            <div className="space-y-1.5">
              <Label htmlFor="po-new-klien">Klien</Label>
              <Input id="po-new-klien" data-testid="po-new-klien-input" value={newKlien} autoFocus
                onChange={(e) => setNewKlien(e.target.value)} placeholder="Ketik nama klien, cth: CV Sumber Rezeki" />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="po-no">No PO</Label>
              <Input id="po-no" data-testid="po-no-input" value={noPo}
                onChange={(e) => setNoPo(e.target.value)} placeholder="Contoh: 001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-tanggal">Tanggal PO</Label>
              <Input id="po-tanggal" type="date" data-testid="po-tanggal-input" value={tanggal}
                onChange={(e) => setTanggal(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full"
              onClick={() => onOpenChange(false)} data-testid="po-cancel-btn">Batal</Button>
            <Button type="submit" className="rounded-full" disabled={saving} data-testid="po-submit-btn">
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : fixedKlien ? "Tambah PO" : "Tambah Stok Klien"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- Item ------------------------------- */
export function ItemDialog({ open, onOpenChange, po, item, onSaved }) {
  const [form, setForm] = useState({ jenis_item: "", satuan: "", kuantiti: "0", keterangan: "", status: "aktif" });
  const [saving, setSaving] = useState(false);
  const isEdit = !!item;

  useEffect(() => {
    if (!open) return;
    setForm({
      jenis_item: item?.jenis_item || "",
      satuan: item?.satuan || "",
      kuantiti: String(item?.kuantiti ?? 0),
      keterangan: item?.keterangan || "",
      status: item?.status || "aktif",
    });
  }, [open, item]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.jenis_item.trim()) return toast.error("Jenis item wajib diisi");
    const qty = parseFloat(form.kuantiti);
    if (Number.isNaN(qty) || qty < 0) return toast.error("Kuantiti tidak valid");
    setSaving(true);
    try {
      if (isEdit) {
        await kapi.updateKlienItem(item.id, {
          jenis_item: form.jenis_item, satuan: form.satuan, kuantiti: qty,
          keterangan: form.keterangan, status: form.status,
        });
        toast.success("Item berhasil diperbarui");
      } else {
        await kapi.createKlienItem({
          po_id: po.id, jenis_item: form.jenis_item, satuan: form.satuan,
          kuantiti: qty, keterangan: form.keterangan, status: "aktif",
        });
        toast.success("Item berhasil ditambahkan");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, "Gagal menyimpan item"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="item-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? `Edit Item — ${item?.jenis_item}` : `Tambah Item — PO No. ${po?.no_po}`}
          </DialogTitle>
          <DialogDescription>Lengkapi jenis item, satuan, kuantiti stok, dan keterangan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-jenis">Jenis Item</Label>
            <Input id="item-jenis" data-testid="item-jenis-input" value={form.jenis_item}
              onChange={set("jenis_item")} placeholder="Contoh: Kain Katun" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-satuan">Satuan</Label>
              <Input id="item-satuan" data-testid="item-satuan-input" value={form.satuan}
                onChange={set("satuan")} placeholder="pcs, box, kg, roll..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-kuantiti">{isEdit ? "Kuantiti Stok" : "Stok Awal"}</Label>
              <Input id="item-kuantiti" type="number" min="0" step="any" data-testid="item-kuantiti-input"
                value={form.kuantiti} onChange={set("kuantiti")} />
            </div>
          </div>
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger data-testid="item-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif" data-testid="item-status-aktif">Aktif</SelectItem>
                  <SelectItem value="selesai" data-testid="item-status-selesai">Selesai/Ditutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="item-ket">Keterangan (opsional)</Label>
            <Textarea id="item-ket" data-testid="item-keterangan-input" rows={2}
              value={form.keterangan} onChange={set("keterangan")} placeholder="Catatan tambahan..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full"
              onClick={() => onOpenChange(false)} data-testid="item-cancel-btn">Batal</Button>
            <Button type="submit" className="rounded-full" disabled={saving} data-testid="item-submit-btn">
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Mutasi ------------------------------ */
export function MutationDialog({ open, onOpenChange, item, po, klien, jenis, mutation, onSaved }) {
  const [form, setForm] = useState({ jenis: "masuk", jumlah: "", tanggal: localNow(), keterangan: "" });
  const [saving, setSaving] = useState(false);
  const isEdit = !!mutation;

  useEffect(() => {
    if (!open) return;
    setForm({
      jenis: mutation?.jenis || jenis || "masuk",
      jumlah: mutation ? String(mutation.jumlah) : "",
      tanggal: toLocalInput(mutation?.tanggal),
      keterangan: mutation?.keterangan || "",
    });
  }, [open, mutation, jenis]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const title = isEdit
    ? `Edit Mutasi — ${mutation?.jenis_item || ""}`
    : `Mutasi ${jenis === "masuk" ? "Masuk" : "Keluar"} — ${item?.jenis_item ?? ""}`;

  const submit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(form.jumlah);
    if (Number.isNaN(qty) || qty <= 0) return toast.error("Jumlah harus lebih dari 0");
    const tanggalIso = form.tanggal ? new Date(form.tanggal).toISOString() : undefined;
    setSaving(true);
    try {
      if (isEdit) {
        await kapi.updateKlienMutation(mutation.id, {
          jenis: form.jenis, jumlah: qty, tanggal: tanggalIso, keterangan: form.keterangan,
        });
        toast.success("Mutasi berhasil diperbarui");
      } else {
        await kapi.createKlienMutation({
          item_id: item.id, jenis: form.jenis, jumlah: qty, tanggal: tanggalIso, keterangan: form.keterangan,
        });
        toast.success(`Mutasi ${form.jenis === "masuk" ? "masuk" : "keluar"} berhasil dicatat`);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, "Gagal menyimpan mutasi"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mutation-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>Catat mutasi stok beserta jumlah, tanggal, dan keterangan.</DialogDescription>
        </DialogHeader>
        {!isEdit && item && (
          <p className="-mt-1 text-sm text-muted-foreground">
            {klien?.nama} · PO No. {po?.no_po} · Stok saat ini:{" "}
            <span className="font-semibold text-foreground">{fmtQty(item.kuantiti)} {item.satuan}</span>
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Jenis Mutasi</Label>
              <Select value={form.jenis} onValueChange={set("jenis")}>
                <SelectTrigger data-testid="mutation-jenis-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk" data-testid="mutation-jenis-masuk">Masuk</SelectItem>
                  <SelectItem value="keluar" data-testid="mutation-jenis-keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mut-jumlah">Jumlah</Label>
              <Input id="mut-jumlah" type="number" min="0" step="any" autoFocus
                data-testid="mutation-jumlah-input" value={form.jumlah} onChange={set("jumlah")} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mut-tanggal">Tanggal &amp; Waktu</Label>
              <Input id="mut-tanggal" type="datetime-local" data-testid="mutation-tanggal-input"
                value={form.tanggal} onChange={set("tanggal")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mut-ket">Keterangan (opsional)</Label>
            <Textarea id="mut-ket" rows={2} data-testid="mutation-keterangan-input"
              value={form.keterangan} onChange={set("keterangan")}
              placeholder="Contoh: Kiriman supplier / diambil klien" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full"
              onClick={() => onOpenChange(false)} data-testid="mutation-cancel-btn">Batal</Button>
            <Button type="submit" disabled={saving} data-testid="mutation-submit-btn"
              className={`rounded-full ${
                !isEdit && form.jenis === "keluar"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : !isEdit
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : ""
              }`}>
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : `Catat Mutasi ${form.jenis === "masuk" ? "Masuk" : "Keluar"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Konfirmasi hapus ---------------------------- */
export function ConfirmDeleteDialog({ open, onOpenChange, title, description, onConfirm, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      toast.success("Data berhasil dihapus");
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, "Gagal menghapus data"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full" data-testid="delete-cancel-btn">Batal</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} data-testid="delete-confirm-btn"
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => { e.preventDefault(); confirm(); }}>
            {deleting ? "Menghapus..." : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* --------------------------- Detail mutasi item --------------------------- */
const KFIELD = { jenis: "Jenis", jumlah: "Jumlah", tanggal: "Tanggal", keterangan: "Keterangan" };
const fmtDT = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const kShow = (f, v) => {
  if (v === "" || v === null || v === undefined) return "(kosong)";
  if (f === "tanggal") return fmtDT(v);
  if (f === "jenis") return v === "masuk" ? "Masuk" : "Keluar";
  if (f === "jumlah") return fmtQty(v);
  return String(v);
};

export function KlienDetailDialog({ open, onOpenChange, item, po, klien, onChanged, inline = false, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    if (!item?.id) return;
    setLoading(true);
    try { setRows((await kapi.listKlienMutations({ item_id: item.id })) || []); }
    catch (err) { toast.error(apiError(err, "Gagal memuat riwayat")); }
    finally { setLoading(false); }
  }, [item?.id]);
  useEffect(() => { if (open || inline) load(); }, [open, inline, load, refreshKey]);

  const changed = () => { load(); onChanged?.(); };

  const listBody = (
    <>
          {loading && rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada mutasi untuk item ini.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((m) => {
                const masuk = m.jenis === "masuk";
                const hist = m.history?.length ? m.history : [{ action: "buat", by_name: m.created_by_name || m.pic_name, at: m.created_at, changes: {} }];
                return (
                  <li key={m.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${masuk ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                            {masuk ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                            {masuk ? "Masuk" : "Keluar"}
                          </span>
                          <span className="font-semibold [font-variant-numeric:tabular-nums]">{masuk ? "+" : "−"}{fmtQty(m.jumlah)} {item?.satuan}</span>
                          <span className="text-sm text-muted-foreground">{fmtDT(m.tanggal)}</span>
                        </div>
                        {m.keterangan ? <div className="mt-1 text-sm text-muted-foreground">{m.keterangan}</div> : null}
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Ubah" onClick={() => setEditing(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" title="Hapus" onClick={() => setDeleting(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <ol className="mt-2 space-y-1 border-l-2 border-muted pl-3 text-xs text-muted-foreground">
                      {hist.map((h, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{h.action === "buat" ? "Dibuat" : "Diubah"}</span>
                          {" oleh "}<span className="font-medium text-foreground">{h.by_name || "-"}</span>
                          {" · "}{fmtDT(h.at)}
                          {h.changes && Object.keys(h.changes).length > 0 && (
                            <span>{" — "}{Object.entries(h.changes).map(([k, [a, b]]) => `${KFIELD[k] || k}: ${kShow(k, a)} → ${kShow(k, b)}`).join("; ")}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          )}
    </>
  );

  // Mode panel samping (terbuka otomatis saat baris item diklik)
  if (inline) {
    return (
      <>
        <div className="text-xs text-muted-foreground">Detail item</div>
        <div className="mt-0.5 text-base font-bold leading-snug">{item?.jenis_item}</div>
        <div className="mt-1 text-xs text-muted-foreground">{klien?.nama} · PO No. {po?.no_po}</div>
        <div className="mt-3 rounded-lg bg-secondary/70 px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">Stok saat ini</div>
          <div className="text-lg font-bold tabular-nums">{fmtQty(item?.kuantiti)} <span className="text-xs font-medium text-muted-foreground">{item?.satuan}</span></div>
        </div>
        <div className="my-4 h-px bg-border" />
        <div className="mb-2 text-xs font-semibold tracking-[0.05em] text-muted-foreground">RIWAYAT · {rows.length} MUTASI</div>
        {listBody}
        <MutationDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}
          item={item} po={po} klien={klien} mutation={editing ? { ...editing, jenis_item: item?.jenis_item } : null} onSaved={changed} />
        <ConfirmDeleteDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
          title="Hapus mutasi ini?" description="Stok item akan dihitung ulang otomatis."
          onConfirm={() => kapi.deleteKlienMutation(deleting.id)} onDeleted={changed} />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="klien-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Mutasi — {item?.jenis_item}</DialogTitle>
            <DialogDescription>
              {klien?.nama} · PO No. {po?.no_po} · Stok saat ini{" "}
              <b>{fmtQty(item?.kuantiti)} {item?.satuan}</b>
            </DialogDescription>
          </DialogHeader>
          {listBody}
        </DialogContent>
      </Dialog>
      <MutationDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}
        item={item} po={po} klien={klien} mutation={editing ? { ...editing, jenis_item: item?.jenis_item } : null} onSaved={changed} />
      <ConfirmDeleteDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus mutasi ini?" description="Stok item akan dihitung ulang otomatis."
        onConfirm={() => kapi.deleteKlienMutation(deleting.id)} onDeleted={changed} />
    </>
  );
}
