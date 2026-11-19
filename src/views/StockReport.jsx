import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Inbox, Search, X, SearchX } from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { apiError } from "@/context/AuthContext";
import { formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import PageContainer from "@/components/layout/PageContainer";

// Pencarian: setiap kata kunci (dipisah spasi) harus ada di teks item.
// Angka dibandingkan dengan titik maupun koma (65.5 = 65,5), dan "x" pada ukuran boleh pakai spasi.
const norm = (v) => String(v ?? "").toLowerCase().replace(/,/g, ".").replace(/\s*[x×]\s*/g, "x");
const matchAll = (hay, tokens) => tokens.every((t) => hay.includes(t));
const supplierText = () => "";

const CATEGORIES = [
  { value: "all", label: "Semua Stok" },
  { value: "paper", label: "Stok Kertas" },
  { value: "ink", label: "Stok Tinta" },
  { value: "other", label: "Stok Lain" },
];

function NoMatch({ colSpan, q }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-6">
        <Empty className="py-3">
          <EmptyHeader>
            <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
            <EmptyTitle>Tidak ditemukan</EmptyTitle>
            <EmptyDescription>Tidak ada stok yang cocok dengan “{q}”.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

export default function StockReport() {
  const fSupplier = "all"; // filter supplier dihapus (stok per item)
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const tokens = useMemo(() => norm(query).split(/\s+/).filter(Boolean), [query]);
  const searching = tokens.length > 0;
  const show = (cat) => category === "all" || category === cat;

  // Cache react-query: tampil instan dari cache, refresh otomatis di background.
  const { data, error } = useQuery({
    queryKey: ["reports", "stock"],
    queryFn: async () => (await api.get("/reports/stock")).data,
    refetchOnMount: "always",
  });
  useEffect(() => { if (error) toast.error(apiError(error)); }, [error]);

  const dl = async (path, name) => {
    try { await downloadPdf(path, {}, name); toast.success("PDF diunduh."); }
    catch (e) { toast.error(apiError(e, "Gagal unduh PDF")); }
  };

  const supStock = (item) => item.stock || 0;
  const filtered = fSupplier !== "all";

  const paperRows = useMemo(() => {
    if (!data) return [];
    const base = filtered ? data.paper.filter((p) => supStock(p, fSupplier) !== 0) : data.paper;
    if (!searching) return base;
    return base.filter((p) => matchAll(norm([
      p.jenis_kertas, `${p.gramatur} gsm`, `${p.gramatur}gr`, `${p.panjang}x${p.lebar}`,
      `${formatNumber(p.panjang, 2)}x${formatNumber(p.lebar, 2)}`, p.satuan || "Rim", supplierText(p), "kertas",
    ].join(" | ")), tokens));
  }, [data, fSupplier, filtered, searching, tokens]);

  const inkRows = useMemo(() => {
    if (!data) return [];
    const base = filtered ? data.ink.filter((p) => supStock(p, fSupplier) !== 0) : data.ink;
    if (!searching) return base;
    return base.filter((p) => matchAll(norm([p.jenis_tinta, "kg", supplierText(p), "tinta"].join(" | ")), tokens));
  }, [data, fSupplier, filtered, searching, tokens]);

  const otherRows = useMemo(() => {
    if (!data) return [];
    const base = filtered ? (data.other || []).filter((p) => supStock(p, fSupplier) !== 0) : (data.other || []);
    if (!searching) return base;
    return base.filter((p) => matchAll(norm([p.nama_barang, p.satuan, supplierText(p), "lain"].join(" | ")), tokens));
  }, [data, fSupplier, filtered, searching, tokens]);

  // Saat mencari, sembunyikan kategori tanpa hasil (kecuali semuanya kosong → tampilkan pesan).
  const totalHits = (show("paper") ? paperRows.length : 0) + (show("ink") ? inkRows.length : 0) + (show("other") ? otherRows.length : 0);
  const visible = (cat, rows) => show(cat) && (!searching || rows.length > 0 || totalHits === 0);
  const vPaper = visible("paper", paperRows), vInk = visible("ink", inkRows), vOther = visible("other", otherRows);

  // Total hanya dari item ber-satuan Rim (satuan custom tidak dijumlahkan ke total Rim).
  const isRim = (p) => String(p.satuan || "Rim").trim().toLowerCase() === "rim";
  const paperTotal = useMemo(() => filtered ? paperRows.filter(isRim).reduce((a, p) => a + supStock(p, fSupplier), 0) : (data?.paper || []).filter(isRim).reduce((a, p) => a + Math.max(p.stock, 0), 0), [paperRows, fSupplier, filtered, data]);
  const inkTotal = useMemo(() => filtered ? inkRows.reduce((a, p) => a + supStock(p, fSupplier), 0) : (data?.ink || []).reduce((a, p) => a + Math.max(p.stock, 0), 0), [inkRows, fSupplier, filtered, data]);

  const badges = (item) => (
    <>
      <span className="whitespace-nowrap rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">Masuk: <b>{formatNumber(item.total_masuk, 2)}</b></span>
      <span className="whitespace-nowrap rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-700 dark:text-rose-400">Keluar: <b>{formatNumber(item.total_keluar, 2)}</b></span>
    </>
  );

  return (
    <PageContainer
      testid="stock-report-page"
      pageTitle="Laporan Stok Ringkas"
      pageDescription={`Rekap stok saat ini (tanpa nominal) — tahun ${data?.year || ""}.`}
      pageHeaderAction={(
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" data-testid="pdf-paper-mutations" onClick={() => dl("/pdf/paper-mutations", "laporan-mutasi-kertas.pdf")}>
            <FileDown className="h-4 w-4" /> Mutasi Kertas
          </Button>
          <Button variant="outline" className="gap-2" data-testid="pdf-ink-mutations" onClick={() => dl("/pdf/ink-mutations", "laporan-mutasi-tinta.pdf")}>
            <FileDown className="h-4 w-4" /> Mutasi Tinta
          </Button>
          <Button variant="outline" className="gap-2" data-testid="pdf-other-mutations" onClick={() => dl("/pdf/other-mutations", "laporan-mutasi-lain.pdf")}>
            <FileDown className="h-4 w-4" /> Mutasi Lain
          </Button>
          <Button variant="outline" className="gap-2" data-testid="pdf-stock-ringkas" onClick={() => dl("/pdf/stock-ringkas", "laporan-stok-ringkas.pdf")}>
            <FileDown className="h-4 w-4" /> Stok Ringkas
          </Button>
        </div>
      )}
    >

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full min-w-0 space-y-1.5 sm:w-auto sm:flex-1 sm:min-w-[240px]">
            <Label htmlFor="stock-search" className="flex items-center gap-1.5 text-xs"><Search className="h-3.5 w-3.5" /> Cari Stok</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="stock-search" data-testid="stock-search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="cth: art paper 150, 65x100, cyan, karton…" className="pl-9 pr-9" />
              {query && (
                <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full space-y-1.5 sm:w-auto">
            <Label className="text-xs">Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[170px]" data-testid="stock-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {searching && (
            <p className="w-full text-xs text-muted-foreground" data-testid="stock-search-summary">
              Hasil “{query.trim()}”:{" "}
              {[show("paper") && `${paperRows.length} kertas`, show("ink") && `${inkRows.length} tinta`, show("other") && `${otherRows.length} barang lain`].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      </Card>

      <div className={`grid gap-5 ${vPaper && vInk ? "xl:grid-cols-2" : ""}`}>
        {vPaper && <Card className="min-w-0 overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-display text-lg font-bold">Stok Kertas</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead><TableHead>Gramatur</TableHead>
                  <TableHead>Ukuran</TableHead><TableHead>Masuk / Keluar</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="paper-stock-table">
                {paperRows.length ? paperRows.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.jenis_kertas}</TableCell>
                    <TableCell>{formatNumber(p.gramatur, 2)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatNumber(p.panjang, 2)}x{formatNumber(p.lebar, 2)} cm</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{badges(p)}</div></TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(filtered ? supStock(p, fSupplier) : p.stock, 2)} {p.satuan || "Rim"}</TableCell>
                  </TableRow>
                )) : searching ? <NoMatch colSpan={5} q={query.trim()} /> : <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-6"><Empty className="py-3"><EmptyHeader><EmptyMedia variant="icon"><Inbox /></EmptyMedia><EmptyTitle>Belum ada data stok</EmptyTitle><EmptyDescription>Tambah item di menu Mutasi.</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </Card>}

        {vInk && <Card className="min-w-0 overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-display text-lg font-bold">Stok Tinta (Kg)</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Jenis Tinta</TableHead><TableHead>Masuk / Keluar</TableHead><TableHead className="text-right">Stok</TableHead></TableRow>
              </TableHeader>
              <TableBody data-testid="ink-stock-table">
                {inkRows.length ? inkRows.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.jenis_tinta}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{badges(p)}</div></TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(filtered ? supStock(p, fSupplier) : p.stock, 2)} Kg</TableCell>
                  </TableRow>
                )) : searching ? <NoMatch colSpan={3} q={query.trim()} /> : <TableRow className="hover:bg-transparent"><TableCell colSpan={3} className="py-6"><Empty className="py-3"><EmptyHeader><EmptyMedia variant="icon"><Inbox /></EmptyMedia><EmptyTitle>Belum ada data stok</EmptyTitle><EmptyDescription>Tambah item di menu Mutasi.</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </Card>}
      </div>

      {vOther && <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-display text-lg font-bold">Stok Lain</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nama Barang</TableHead><TableHead>Satuan</TableHead><TableHead>Masuk / Keluar</TableHead><TableHead className="text-right">Stok</TableHead></TableRow>
            </TableHeader>
            <TableBody data-testid="other-stock-table">
              {otherRows.length ? otherRows.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.nama_barang}</TableCell>
                  <TableCell>{p.satuan || "-"}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{badges(p)}</div></TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(filtered ? supStock(p, fSupplier) : p.stock, 2)} {p.satuan || ""}</TableCell>
                </TableRow>
              )) : searching ? <NoMatch colSpan={4} q={query.trim()} /> : <TableRow className="hover:bg-transparent"><TableCell colSpan={4} className="py-6"><Empty className="py-3"><EmptyHeader><EmptyMedia variant="icon"><Inbox /></EmptyMedia><EmptyTitle>Belum ada data stok</EmptyTitle><EmptyDescription>Tambah item di menu Mutasi.</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>}
    </PageContainer>
  );
}
