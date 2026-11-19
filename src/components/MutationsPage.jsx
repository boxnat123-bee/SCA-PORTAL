import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, FileDown, Pencil, Trash2, Inbox,
  ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { apiError } from "@/context/AuthContext";
import { formatNumber, formatRupiah, todayStr, fmtDate, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MoneyInput, { INPUT_CLS } from "@/components/MoneyInput";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import TableSkeleton from "@/components/TableSkeleton";
import PageContainer from "@/components/layout/PageContainer";

const TITLES = { paper: "Kertas", ink: "Tinta", other: "Lain" };
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const FIELD_LABEL = {
  jenis_transaksi: "Jenis", jumlah: "Jumlah", date: "Tanggal", time: "Waktu",
  supplier: "Supplier", nama_cetakan: "Nama Cetakan", keterangan: "Keterangan",
};
const showVal = (f, v) => {
  if (v === "" || v === null || v === undefined) return "(kosong)";
  if (f === "date") return fmtDate(v);
  if (f === "jumlah") return formatNumber(v, 2);
  if (f === "jenis_transaksi") return v === "masuk" ? "Masuk" : "Keluar";
  return String(v);
};

/* ---------------- Harga (opsional) ---------------- */
const priceModes = (type, satuan) => [
  { v: "per_satuan", l: `Per ${satuan || (type === "ink" ? "Kg" : "satuan")}` },
  ...(type === "paper" ? [{ v: "per_kg", l: "Per Kg" }] : []),
  { v: "total", l: "Total kiriman" },
  { v: "custom", l: "Custom" },
];
export function priceText(it) {
  if (it?.harga === null || it?.harga === undefined || it?.harga === "") return "";
  const basis = it.harga_mode === "total" ? "total kiriman"
    : it.harga_mode === "per_kg" ? "per Kg"
    : it.harga_mode === "custom" ? (it.harga_label || "custom")
    : `per ${it.satuan || "satuan"}`;
  return `${formatRupiah(it.harga)} ${basis}${it.ppn_ada ? ` · PPN ${formatRupiah(it.ppn_nominal)}` : ""}`;
}

/* ---------------- Dialog item (tambah / ubah) ---------------- */
function ItemDialog({ type, open, onOpenChange, item, onSaved }) {
  const blank = {
    jenis_kertas: "", gramatur: "", panjang: "", lebar: "", satuan: type === "paper" ? "Rim" : "", jenis_tinta: "", nama_barang: "",
    jumlah: "", supplier: "", nama_cetakan: "", date: "", time: "", keterangan: "",
    harga_mode: "per_satuan", harga: "", harga_label: "", ppn_ada: false, ppn_nominal: "",
    item_keterangan: "",
  };
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (item) setF({ ...blank, ...item, harga: item.harga ?? "", ppn_nominal: item.ppn_nominal || "", ppn_ada: !!item.ppn_ada, item_keterangan: item.keterangan || "", keterangan: "" });
    else setF({ ...blank, date: todayStr(), time: nowTime() });
    // eslint-disable-next-line
  }, [open, item]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  const satuan = type === "ink" ? "Kg" : (f.satuan || (type === "paper" ? "Rim" : "satuan"));

  const save = async () => {
    if (!item) {
      if (!(Number(f.jumlah) > 0)) return toast.error("Jumlah wajib diisi (lebih dari 0)");
      if (!String(f.supplier).trim()) return toast.error("Supplier wajib diisi");
    }
    setSaving(true);
    try {
      if (item) await api.put(`/${type}/items/${item.id}`, f);
      else await api.post(`/${type}/items`, f);
      toast.success(item ? "Item diperbarui." : "Item ditambahkan & stok masuk dicatat.");
      onOpenChange(false);
      onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg" data-testid="item-dialog">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah Item" : `Tambah Item ${TITLES[type]}`}</DialogTitle>
          <DialogDescription>
            {item ? "Ubah data item & harga. Jumlah/supplier diubah lewat ikon Detail." : "Isi data item dan stok masuk pertama. Selanjutnya stok dicatat lewat panah hijau / merah."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {type === "paper" && (
            <>
              <div className="space-y-1.5"><Label>Jenis Kertas</Label><Input value={f.jenis_kertas} onChange={set("jenis_kertas")} placeholder="cth: Art Paper" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5"><Label>Gramatur</Label><Input type="number" inputMode="decimal" value={f.gramatur} onChange={set("gramatur")} /></div>
                <div className="space-y-1.5"><Label>Panjang (cm)</Label><Input type="number" inputMode="decimal" value={f.panjang} onChange={set("panjang")} /></div>
                <div className="space-y-1.5"><Label>Lebar (cm)</Label><Input type="number" inputMode="decimal" value={f.lebar} onChange={set("lebar")} /></div>
              </div>
              <div className="space-y-1.5"><Label>Satuan</Label><Input value={f.satuan} onChange={set("satuan")} placeholder="Rim" /></div>
            </>
          )}
          {type === "ink" && (
            <div className="space-y-1.5"><Label>Jenis Tinta</Label><Input value={f.jenis_tinta} onChange={set("jenis_tinta")} placeholder="cth: Cyan" />
              <p className="text-xs text-muted-foreground">Satuan tinta: Kg</p></div>
          )}
          {type === "other" && (
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div className="space-y-1.5"><Label>Nama Barang</Label><Input value={f.nama_barang} onChange={set("nama_barang")} /></div>
              <div className="space-y-1.5"><Label>Satuan</Label><Input value={f.satuan} onChange={set("satuan")} placeholder="pcs, roll…" /></div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Keterangan item <span className="text-muted-foreground">(opsional, tampil di Laporan Stok Akhir)</span></Label>
            <Input value={f.item_keterangan} onChange={set("item_keterangan")} placeholder="cth: simpan di rak B, khusus klien X" data-testid="item-keterangan" />
          </div>

          {!item && (
            <div className="grid gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><ArrowDownToLine className="h-4 w-4" /> Stok masuk pertama</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Jumlah ({satuan})</Label><Input type="number" inputMode="decimal" value={f.jumlah} onChange={set("jumlah")} data-testid="item-jumlah" /></div>
                <div className="space-y-1.5"><Label>Supplier</Label><Input value={f.supplier} onChange={set("supplier")} data-testid="item-supplier" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={f.date} onChange={set("date")} /></div>
                <div className="space-y-1.5"><Label>Waktu</Label><Input type="time" value={f.time} onChange={set("time")} /></div>
              </div>
              <div className="space-y-1.5"><Label>Nama Cetakan <span className="text-muted-foreground">(opsional)</span></Label><Input value={f.nama_cetakan} onChange={set("nama_cetakan")} placeholder="cth: Box Kue Lapis 20x20" data-testid="item-cetakan" /></div>
              <div className="space-y-1.5"><Label>Keterangan <span className="text-muted-foreground">(opsional)</span></Label><Input value={f.keterangan} onChange={set("keterangan")} /></div>
            </div>
          )}

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="text-sm font-semibold">Harga & PPN <span className="font-normal text-muted-foreground">(opsional)</span></div>
            <div className="flex flex-wrap gap-1.5">
              {priceModes(type, satuan).map((m) => (
                <button key={m.v} type="button" onClick={() => setF((p) => ({ ...p, harga_mode: m.v }))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${f.harga_mode === m.v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                  {m.l}
                </button>
              ))}
            </div>
            <div className={`grid gap-2 ${f.harga_mode === "custom" ? "grid-cols-2" : ""}`}>
              {f.harga_mode === "custom" && (
                <div className="space-y-1.5"><Label>Harga per…</Label><Input value={f.harga_label} onChange={set("harga_label")} placeholder="cth: per lembar" /></div>
              )}
              <div className="space-y-1.5"><Label>Harga (Rp)</Label><MoneyInput className={INPUT_CLS} value={f.harga} onChange={(v) => setF((p) => ({ ...p, harga: v }))} placeholder="Boleh dikosongkan" data-testid="item-harga" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={!!f.ppn_ada} onChange={set("ppn_ada")} /> Ada PPN
            </label>
            {f.ppn_ada && (
              <div className="space-y-1.5"><Label>Nominal PPN (Rp)</Label><MoneyInput className={INPUT_CLS} value={f.ppn_nominal} onChange={(v) => setF((p) => ({ ...p, ppn_nominal: v }))} data-testid="item-ppn" /></div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={save} disabled={saving} data-testid="save-item-button">{saving ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Dialog mutasi masuk / keluar ---------------- */
function MoveDialog({ type, state, onClose, onSaved }) {
  const open = !!state;
  const item = state?.item;
  const edit = state?.mutation || null;
  const jenis = edit ? edit.jenis_transaksi : state?.jenis;
  const masuk = jenis === "masuk";
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(edit
      ? { jumlah: edit.jumlah, date: edit.date, time: edit.time || "00:00", supplier: edit.supplier || "", nama_cetakan: edit.nama_cetakan || "", keterangan: edit.keterangan || "" }
      : { jumlah: "", date: todayStr(), time: nowTime(), supplier: "", nama_cetakan: "", keterangan: "" });
  }, [open, edit]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...f, jenis_transaksi: jenis, item_id: item.id };
      if (edit) await api.put(`/${type}/mutations/${edit.id}`, body);
      else await api.post(`/${type}/mutations`, body);
      toast.success(edit ? "Mutasi diperbarui." : masuk ? "Mutasi masuk dicatat." : "Mutasi keluar dicatat.");
      onClose();
      onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="move-dialog">
        <DialogHeader>
          <DialogTitle className={masuk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
            <span className="inline-flex items-center gap-2">
              {masuk ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
              {edit ? "Ubah " : ""}Mutasi {masuk ? "Masuk" : "Keluar"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {item?.label} · stok sekarang <b>{formatNumber(item?.stock, 2)} {item?.satuan}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Jumlah ({item?.satuan})</Label>
            <Input type="number" inputMode="decimal" autoFocus value={f.jumlah ?? ""} onChange={set("jumlah")} data-testid="move-jumlah" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={f.date || ""} onChange={set("date")} /></div>
            <div className="space-y-1.5"><Label>Waktu</Label><Input type="time" value={f.time || ""} onChange={set("time")} /></div>
          </div>
          {masuk && (
            <div className="space-y-1.5"><Label>Supplier <span className="text-muted-foreground">(opsional)</span></Label><Input value={f.supplier || ""} onChange={set("supplier")} /></div>
          )}
          <div className="space-y-1.5"><Label>Nama Cetakan <span className="text-muted-foreground">(opsional)</span></Label><Input value={f.nama_cetakan || ""} onChange={set("nama_cetakan")} placeholder="cth: Box Kue Lapis 20x20" data-testid="move-cetakan" /></div>
          <div className="space-y-1.5"><Label>Keterangan <span className="text-muted-foreground">(opsional)</span></Label><Textarea rows={2} value={f.keterangan || ""} onChange={set("keterangan")} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}
            className={masuk ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-rose-600 text-white hover:bg-rose-700"}
            data-testid="save-move-button">{saving ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Dialog detail (riwayat mutasi per item) ---------------- */
/** Isi detail item: ringkasan stok + riwayat mutasi bergaya timeline (dipakai panel samping & dialog). */
function DetailBody({ type, item, version, onEdit, onDelete, compact = false }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-item", type, item?.id, version],
    queryFn: async () => (await api.get(`/${type}/items/${item.id}`)).data,
    enabled: !!item,
  });
  const muts = data?.mutations || [];
  const it = { ...item, ...(data?.item || {}) };
  const masukTotal = muts.filter((m) => m.jenis_transaksi === "masuk").reduce((a, m) => a + Number(m.jumlah || 0), 0);
  const keluarTotal = muts.filter((m) => m.jenis_transaksi === "keluar").reduce((a, m) => a + Number(m.jumlah || 0), 0);
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-secondary px-2.5 py-2"><div className="text-[11px] text-muted-foreground">Stok</div><div className="text-[17px] font-bold tabular-nums">{formatNumber(it.stock, 2)}</div></div>
        <div className="rounded-lg bg-emerald-500/10 px-2.5 py-2"><div className="text-[11px] text-emerald-700 dark:text-emerald-400">Masuk</div><div className="text-[17px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatNumber(masukTotal, 2)}</div></div>
        <div className="rounded-lg bg-rose-500/10 px-2.5 py-2"><div className="text-[11px] text-rose-700 dark:text-rose-400">Keluar</div><div className="text-[17px] font-bold tabular-nums text-rose-700 dark:text-rose-400">{formatNumber(keluarTotal, 2)}</div></div>
      </div>
      <div className="mt-2.5 space-y-0.5 text-xs text-foreground/75">
        {priceText(it) && <div>Harga {priceText(it)}</div>}
        {(it.suppliers || []).length > 0 && <div>Supplier {(it.suppliers || []).join(", ")}</div>}
        {it.keterangan && <div className="italic">{it.keterangan}</div>}
        <div className="text-muted-foreground">Item dibuat oleh {it.created_by_name || "-"} · {fmtDateTime(it.created_at)}</div>
      </div>
      <div className="my-4 h-px bg-border/70" />
      <div className="text-xs font-semibold tracking-[0.05em] text-muted-foreground">RIWAYAT · {muts.length} MUTASI</div>
      {isLoading ? <div className="mt-3"><TableSkeleton columns={2} rows={3} /></div> : muts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Belum ada mutasi untuk item ini.</p>
      ) : (
        <ol className={`mt-3 flex flex-col gap-3.5 ${compact ? "" : ""}`}>
          {muts.map((m) => {
            const masuk = m.jenis_transaksi === "masuk";
            const hist = m.history?.length ? m.history : [{ action: "buat", by_name: m.created_by_name || m.pic_name, at: m.created_at, changes: {} }];
            const sub = [masuk ? m.supplier : "", m.nama_cetakan, m.keterangan].filter(Boolean).join(" · ");
            return (
              <li key={m.id} className="group flex gap-3" data-testid={`detail-mut-${m.id}`}>
                <span className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full ${masuk ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-700 dark:text-rose-400"}`}>
                  {masuk ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-[13px]">{masuk ? "Masuk" : "Keluar"} {formatNumber(m.jumlah, 2)} {it.satuan}
                      {m.awal && <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">stok awal</span>}
                    </b>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{fmtDate(m.date)} {m.time || ""}</span>
                  </div>
                  {sub && <div className="text-xs text-foreground/75">{sub}</div>}
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {hist.map((h, i) => (
                      <div key={i}>
                        {h.action === "buat" ? "Dibuat" : "Diubah"} oleh <span className="font-medium text-foreground/80">{h.by_name || "-"}</span> · {fmtDateTime(h.at)}
                        {h.changes && Object.keys(h.changes).length > 0 && (
                          <> ({Object.entries(h.changes).map(([k, [a, b]]) => `${FIELD_LABEL[k] || k} ${showVal(k, a)} → ${showVal(k, b)}`).join("; ")})</>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => onEdit(m)} data-testid={`edit-mut-${m.id}`}><Pencil className="h-3 w-3" /> Ubah</Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs hover:text-destructive" onClick={() => onDelete(m)} data-testid={`delete-mut-${m.id}`}><Trash2 className="h-3 w-3" /> Hapus</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Dialog detail (layar kecil). */
function DetailDialog({ type, item, onClose, onEdit, onDelete, version }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="detail-dialog">
        <DialogHeader>
          <DialogTitle>{item?.label}</DialogTitle>
          <DialogDescription>Detail item & riwayat mutasi</DialogDescription>
        </DialogHeader>
        {item && <DetailBody type={type} item={item} version={version} onEdit={onEdit} onDelete={onDelete} compact />}
      </DialogContent>
    </Dialog>
  );
}

/** true bila layar ≥ lebar tertentu (panel detail di samping). */
function useWide(px = 1180) {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(`(min-width: ${px}px)`).matches : true);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const fn = () => setWide(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [px]);
  return wide;
}

/* ---------------- Halaman ---------------- */
export default function MutationsPage({ type }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [itemDlg, setItemDlg] = useState({ open: false, item: null });
  const [move, setMove] = useState(null);
  const [detail, setDetail] = useState(null);       // dialog (layar kecil)
  const [selectedId, setSelectedId] = useState(null); // panel samping (layar lebar)
  const [chip, setChip] = useState("all");
  const wide = useWide();
  const [version, setVersion] = useState(0);
  const [delItem, setDelItem] = useState(null);
  const [delMut, setDelMut] = useState(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfRange, setPdfRange] = useState({ start: "", end: "" });

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["stock-items", type],
    queryFn: async () => (await api.get(`/${type}/items`)).data,
    refetchOnMount: "always",
  });
  useEffect(() => { if (error) toast.error(apiError(error)); }, [error]);

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["stock-items", type] });
    qc.invalidateQueries({ queryKey: ["stock-item", type] });
    setVersion((v) => v + 1);
  };

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const counts = useMemo(() => ({
    all: items.length,
    empty: items.filter((it) => Number(it.stock) <= 0).length,
    today: items.filter((it) => String(it.last_mutation || "").startsWith(today)).length,
  }), [items, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (chip === "empty") list = list.filter((it) => Number(it.stock) <= 0);
    if (chip === "today") list = list.filter((it) => String(it.last_mutation || "").startsWith(today));
    if (!q) return list;
    return list.filter((it) => `${it.label} ${it.satuan} ${(it.suppliers || []).join(" ")} ${it.keterangan || ""}`.toLowerCase().includes(q));
  }, [items, search, chip, today]);

  const selected = items.find((x) => x.id === selectedId) || (wide ? filtered[0] : null) || null;
  const openDetail = (it) => { if (wide) setSelectedId(it.id); else setDetail(it); };

  // Item di dialog detail ikut diperbarui setelah simpan
  const liveItem = (it) => items.find((x) => x.id === it?.id) || it;

  const doDeleteItem = async () => {
    try {
      await api.delete(`/${type}/items/${delItem.id}`);
      toast.success("Item dihapus.");
      setDelItem(null);
      reload();
    } catch (e) { toast.error(apiError(e)); setDelItem(null); }
  };
  const doDeleteMut = async () => {
    try {
      await api.delete(`/${type}/mutations/${delMut.id}`);
      toast.success("Mutasi dihapus.");
      setDelMut(null);
      reload();
    } catch (e) { toast.error(apiError(e)); setDelMut(null); }
  };
  const doPdf = async () => {
    try {
      const params = {};
      if (pdfRange.start) params.start = pdfRange.start;
      if (pdfRange.end) params.end = pdfRange.end;
      await downloadPdf(`/pdf/${type}-mutations`, params, `laporan-mutasi-${type}.pdf`);
      toast.success("PDF diunduh.");
      setPdfOpen(false);
    } catch (e) { toast.error(apiError(e, "Gagal mengunduh PDF")); }
  };

  const nameOf = (it) => (type === "paper" ? it.jenis_kertas : type === "ink" ? it.jenis_tinta : it.nama_barang);
  const specOf = (it) => (type === "paper" ? `${formatNumber(it.gramatur, 2)} gr · ${formatNumber(it.panjang, 2)} × ${formatNumber(it.lebar, 2)} cm` : "");
  const CHIPS = [["all", "Semua", counts.all], ["empty", "Stok habis", counts.empty], ["today", "Ada mutasi hari ini", counts.today]];

  return (
    <PageContainer
      testid={`mutations-page-${type}`}
      pageEyebrow={`Stok · ${TITLES[type]}`}
      pageTitle={`Mutasi ${TITLES[type]}`}
      pageHeaderAction={(
        <>
          <Button variant="outline" className="gap-2" data-testid="download-pdf-button" onClick={() => setPdfOpen(true)}><FileDown className="h-4 w-4" /> Unduh PDF</Button>
          <Button className="gap-2" data-testid="add-item-button" onClick={() => setItemDlg({ open: true, item: null })}><Plus className="h-4 w-4" /> Tambah Item</Button>
        </>
      )}
    >
      <div className={`grid items-start gap-4 ${wide ? "grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"}`}>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2.5 p-3.5">
            <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-border px-3 text-muted-foreground focus-within:border-primary/60">
              <Search className="h-4 w-4 shrink-0" />
              <input value={search} data-testid="search-input" onChange={(e) => setSearch(e.target.value)} aria-label="Cari item"
                placeholder={type === "paper" ? "Cari jenis, gramatur, ukuran, supplier…" : "Cari item atau supplier…"}
                className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
            </label>
            {CHIPS.map(([id, label, n]) => (
              <button key={id} type="button" onClick={() => setChip(id)} aria-pressed={chip === id} data-testid={`chip-${id}`}
                className={`h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${chip === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:bg-secondary"}`}>
                {label} · {n}
              </button>
            ))}
          </div>
          {isLoading ? <TableSkeleton columns={4} rows={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-secondary/50 text-left text-[11.5px] font-semibold text-muted-foreground">
                    <th className="border-y border-border px-3.5 py-2.5">Item</th>
                    <th className="hidden border-y border-border px-3.5 py-2.5 md:table-cell">Supplier</th>
                    <th className="border-y border-border px-3.5 py-2.5 text-right">Stok</th>
                    <th className="border-y border-border px-3.5 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody data-testid="items-table-body">
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-secondary"><Inbox className="h-5 w-5" /></div>
                      {items.length ? "Tidak ada item yang cocok." : "Belum ada item. Klik \"Tambah Item\" untuk menambah item pertama."}
                    </td></tr>
                  )}
                  {filtered.map((it) => {
                    const isSel = wide && selected?.id === it.id;
                    const low = Number(it.stock) <= 0;
                    return (
                      <tr key={it.id} data-testid={`item-row-${it.id}`} onClick={() => openDetail(it)} title="Klik untuk melihat detail & riwayat"
                        className={`cursor-pointer border-b border-border/60 last:border-0 ${isSel ? "bg-accent/60" : "hover:bg-secondary/40"}`}>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold">{nameOf(it)}</div>
                          {specOf(it) && <div className="text-xs text-muted-foreground">{specOf(it)}</div>}
                          {priceText(it) && <div className="text-[11px] text-muted-foreground">{priceText(it)}</div>}
                        </td>
                        <td className="hidden px-3.5 py-3 text-foreground/75 md:table-cell">{(it.suppliers || []).join(", ") || "–"}</td>
                        <td className={`whitespace-nowrap px-3.5 py-3 text-right font-bold tabular-nums ${low ? "text-rose-700 dark:text-rose-400" : ""}`}>
                          {formatNumber(it.stock, 2)} <span className="text-xs font-medium text-muted-foreground">{it.satuan}</span>
                        </td>
                        <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Mutasi Masuk" aria-label="Mutasi masuk"
                              className="h-8 w-8 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-400"
                              onClick={() => setMove({ item: it, jenis: "masuk" })} data-testid={`masuk-btn-${it.id}`}>
                              <ArrowDownToLine className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Mutasi Keluar" aria-label="Mutasi keluar"
                              className="h-8 w-8 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-400"
                              onClick={() => setMove({ item: it, jenis: "keluar" })} data-testid={`keluar-btn-${it.id}`}>
                              <ArrowUpFromLine className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Ubah item" aria-label="Ubah item" className="h-8 w-8 text-muted-foreground"
                              onClick={() => setItemDlg({ open: true, item: it })} data-testid={`edit-item-${it.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Hapus item" aria-label="Hapus item" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDelItem(it)} data-testid={`delete-item-${it.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {wide && (
          <aside className="sticky top-0 rounded-xl border border-border bg-card p-[18px]" aria-label="Detail item" data-testid="detail-panel">
            {selected ? (
              <>
                <div className="mb-3.5">
                  <div className="text-xs text-muted-foreground">Detail item</div>
                  <div className="mt-0.5 text-base font-bold leading-snug">{selected.label}</div>
                </div>
                <DetailBody type={type} item={selected} version={version}
                  onEdit={(m) => setMove({ item: liveItem(selected), mutation: m })}
                  onDelete={(m) => setDelMut(m)} />
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Pilih item untuk melihat detail & riwayat.</p>
            )}
          </aside>
        )}
      </div>

      <ItemDialog type={type} open={itemDlg.open} item={itemDlg.item}
        onOpenChange={(o) => setItemDlg((s) => ({ ...s, open: o }))} onSaved={reload} />
      <MoveDialog type={type} state={move} onClose={() => setMove(null)} onSaved={reload} />
      <DetailDialog type={type} item={detail} version={version} onClose={() => setDetail(null)}
        onEdit={(m) => setMove({ item: liveItem(detail), mutation: m })}
        onDelete={(m) => setDelMut(m)} />

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unduh PDF Mutasi {TITLES[type]}</DialogTitle>
            <DialogDescription>Kosongkan tanggal untuk semua periode.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Dari</Label><Input type="date" value={pdfRange.start} onChange={(e) => setPdfRange((p) => ({ ...p, start: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Sampai</Label><Input type="date" value={pdfRange.end} onChange={(e) => setPdfRange((p) => ({ ...p, end: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfOpen(false)}>Batal</Button>
            <Button className="gap-2" onClick={doPdf}><FileDown className="h-4 w-4" /> Unduh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delItem} onOpenChange={(o) => !o && setDelItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus item “{delItem?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>Item hanya bisa dihapus jika belum punya mutasi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDeleteItem}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!delMut} onOpenChange={(o) => !o && setDelMut(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus mutasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {delMut && `${delMut.jenis_transaksi === "masuk" ? "Masuk" : "Keluar"} ${formatNumber(delMut.jumlah, 2)} pada ${fmtDate(delMut.date)}. `}
              Stok dihitung ulang otomatis dan tercatat di log audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDeleteMut} data-testid="confirm-delete-mut">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
