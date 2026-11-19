import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, FileDown, Pencil, Trash2, Inbox, History,
  ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { apiError } from "@/context/AuthContext";
import { formatNumber, todayStr, fmtDate, fmtDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
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

/* ---------------- Dialog item (tambah / ubah) ---------------- */
function ItemDialog({ type, open, onOpenChange, item, onSaved }) {
  const blank = { jenis_kertas: "", gramatur: "", panjang: "", lebar: "", satuan: type === "paper" ? "Rim" : "", jenis_tinta: "", nama_barang: "" };
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(item ? { ...blank, ...item } : blank); /* eslint-disable-next-line */ }, [open, item]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (item) await api.put(`/${type}/items/${item.id}`, f);
      else await api.post(`/${type}/items`, f);
      toast.success(item ? "Item diperbarui." : "Item ditambahkan.");
      onOpenChange(false);
      onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="item-dialog">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah Item" : `Tambah Item ${TITLES[type]}`}</DialogTitle>
          <DialogDescription>Item dibuat sekali, lalu stok dicatat lewat panah masuk / keluar.</DialogDescription>
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
            <>
              <div className="space-y-1.5"><Label>Nama Barang</Label><Input value={f.nama_barang} onChange={set("nama_barang")} /></div>
              <div className="space-y-1.5"><Label>Satuan</Label><Input value={f.satuan} onChange={set("satuan")} placeholder="cth: pcs, roll, liter" /></div>
            </>
          )}
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
          {masuk ? (
            <div className="space-y-1.5"><Label>Supplier <span className="text-muted-foreground">(opsional)</span></Label><Input value={f.supplier || ""} onChange={set("supplier")} /></div>
          ) : (
            <div className="space-y-1.5"><Label>Nama Cetakan</Label><Input value={f.nama_cetakan || ""} onChange={set("nama_cetakan")} placeholder="cth: Box Kue Lapis 20x20" data-testid="move-cetakan" /></div>
          )}
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
function DetailDialog({ type, item, onClose, onEdit, onDelete, version }) {
  const open = !!item;
  const { data, isLoading } = useQuery({
    queryKey: ["stock-item", type, item?.id, version],
    queryFn: async () => (await api.get(`/${type}/items/${item.id}`)).data,
    enabled: open,
  });
  const muts = data?.mutations || [];
  const it = data?.item || item;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="detail-dialog">
        <DialogHeader>
          <DialogTitle>Detail Mutasi · {it?.label}</DialogTitle>
          <DialogDescription>
            Stok sekarang <b>{formatNumber(it?.stock, 2)} {it?.satuan}</b> · {muts.length} mutasi.
            Item dibuat oleh {it?.created_by_name || "-"} ({fmtDateTime(it?.created_at)}).
          </DialogDescription>
        </DialogHeader>
        {isLoading ? <TableSkeleton columns={4} rows={4} /> : muts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada mutasi untuk item ini.</p>
        ) : (
          <ul className="space-y-2">
            {muts.map((m) => {
              const masuk = m.jenis_transaksi === "masuk";
              const hist = m.history?.length ? m.history : [{ action: "buat", by_name: m.created_by_name || m.pic_name, at: m.created_at, changes: {} }];
              return (
                <li key={m.id} className="rounded-lg border p-3" data-testid={`detail-mut-${m.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${masuk ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                          {masuk ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                          {masuk ? "Masuk" : "Keluar"}
                        </span>
                        <span className="font-semibold [font-variant-numeric:tabular-nums]">{masuk ? "+" : "−"}{formatNumber(m.jumlah, 2)} {it?.satuan}</span>
                        <span className="text-sm text-muted-foreground">{fmtDate(m.date)} {m.time || ""}</span>
                      </div>
                      <div className="mt-1 text-sm">
                        {masuk ? <>Supplier: <b>{m.supplier || "-"}</b></> : <>Nama Cetakan: <b>{m.nama_cetakan || "-"}</b></>}
                        {m.keterangan ? <span className="text-muted-foreground"> · {m.keterangan}</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Ubah" onClick={() => onEdit(m)} data-testid={`edit-mut-${m.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" title="Hapus" onClick={() => onDelete(m)} data-testid={`delete-mut-${m.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <ol className="mt-2 space-y-1 border-l-2 border-muted pl-3 text-xs text-muted-foreground">
                    {hist.map((h, i) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">{h.action === "buat" ? "Dibuat" : "Diubah"}</span>
                        {" oleh "}<span className="font-medium text-foreground">{h.by_name || "-"}</span>
                        {" · "}{fmtDateTime(h.at)}
                        {h.changes && Object.keys(h.changes).length > 0 && (
                          <span>{" — "}{Object.entries(h.changes).map(([k, [a, b]]) => `${FIELD_LABEL[k] || k}: ${showVal(k, a)} → ${showVal(k, b)}`).join("; ")}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Halaman ---------------- */
export default function MutationsPage({ type }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [itemDlg, setItemDlg] = useState({ open: false, item: null });
  const [move, setMove] = useState(null);
  const [detail, setDetail] = useState(null);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => `${it.label} ${it.satuan}`.toLowerCase().includes(q));
  }, [items, search]);

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

  return (
    <PageContainer
      fillHeight
      testid={`mutations-page-${type}`}
      pageTitle={`Mutasi ${TITLES[type]}`}
      pageDescription="Klik panah hijau untuk stok masuk, panah merah untuk stok keluar. Ikon riwayat menampilkan detail mutasi."
      pageHeaderAction={(
        <>
          <Button variant="outline" className="gap-2" data-testid="download-pdf-button" onClick={() => setPdfOpen(true)}><FileDown className="h-4 w-4" /> PDF</Button>
          <Button className="gap-2" data-testid="add-item-button" onClick={() => setItemDlg({ open: true, item: null })}><Plus className="h-4 w-4" /> Item</Button>
        </>
      )}
    >
      <Card className="p-3 md:shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={search} data-testid="search-input" placeholder={`Cari item ${TITLES[type].toLowerCase()}…`} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden md:min-h-0 md:flex-1">
        {isLoading ? <TableSkeleton columns={5} rows={5} /> : (
          <div className="max-h-[65vh] overflow-auto md:max-h-none md:min-h-0 md:flex-1">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="hidden md:table-cell">Mutasi terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="items-table-body">
                {filtered.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="py-6">
                      <Empty className="py-4">
                        <EmptyHeader>
                          <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
                          <EmptyTitle>{items.length ? "Tidak ada item yang cocok" : "Belum ada item"}</EmptyTitle>
                          <EmptyDescription>{items.length ? "Ubah kata pencarian." : "Klik tombol \"+ Item\" untuk menambah item pertama."}</EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((it) => (
                  <TableRow key={it.id} data-testid={`item-row-${it.id}`}>
                    <TableCell className="font-medium">{it.label}</TableCell>
                    <TableCell className="text-muted-foreground">{it.satuan}</TableCell>
                    <TableCell className={`whitespace-nowrap text-right font-semibold [font-variant-numeric:tabular-nums] ${Number(it.stock) <= 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
                      {formatNumber(it.stock, 2)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                      {it.last_mutation ? fmtDate(it.last_mutation) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" title="Mutasi Masuk"
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                          onClick={() => setMove({ item: it, jenis: "masuk" })} data-testid={`masuk-btn-${it.id}`}>
                          <ArrowDownToLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Mutasi Keluar"
                          className="h-8 w-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                          onClick={() => setMove({ item: it, jenis: "keluar" })} data-testid={`keluar-btn-${it.id}`}>
                          <ArrowUpFromLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Detail / Riwayat" className="h-8 w-8"
                          onClick={() => setDetail(it)} data-testid={`detail-btn-${it.id}`}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Ubah item" className="h-8 w-8 text-muted-foreground"
                          onClick={() => setItemDlg({ open: true, item: it })} data-testid={`edit-item-${it.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Hapus item" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDelItem(it)} data-testid={`delete-item-${it.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

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
