import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Search, X, SearchX, Inbox } from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { apiError } from "@/context/AuthContext";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import PageContainer from "@/components/layout/PageContainer";

// Pencarian: setiap kata kunci (dipisah spasi) harus ada di teks item.
// Angka dibandingkan dengan titik maupun koma (65.5 = 65,5), dan "x" pada ukuran boleh pakai spasi.
const norm = (v) => String(v ?? "").toLowerCase().replace(/,/g, ".").replace(/\s*[x×]\s*/g, "x");
const matchAll = (hay, tokens) => tokens.every((t) => hay.includes(t));

const TABS = [
  { id: "paper", label: "Kertas", head: "Jenis kertas" },
  { id: "ink", label: "Tinta", head: "Jenis tinta" },
  { id: "other", label: "Lain", head: "Nama barang" },
];

const nameOf = (tab, it) => (tab === "paper" ? it.jenis_kertas : tab === "ink" ? it.jenis_tinta : it.nama_barang);
const specOf = (tab, it) => (tab === "paper"
  ? `${formatNumber(it.gramatur, 2)} gr · ${formatNumber(it.panjang, 2)} × ${formatNumber(it.lebar, 2)}`
  : "");
const isRim = (p) => String(p.satuan || "Rim").trim().toLowerCase() === "rim";

function Kpi({ label, value, unit, sub, danger }) {
  return (
    <div className="rounded-xl border border-border bg-card px-[18px] py-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-[26px] font-bold leading-tight tracking-[-0.02em] tabular-nums ${danger ? "text-rose-700 dark:text-rose-400" : ""}`}>
        {value}{unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function StockReport() {
  const [tab, setTab] = useState("paper");
  const [query, setQuery] = useState("");
  const tokens = useMemo(() => norm(query).split(/\s+/).filter(Boolean), [query]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["reports", "stock"],
    queryFn: async () => (await api.get("/reports/stock")).data,
    refetchOnMount: "always",
  });
  useEffect(() => { if (error) toast.error(apiError(error)); }, [error]);

  const paper = data?.paper || [], ink = data?.ink || [], other = data?.other || [];
  const all = { paper, ink, other };
  const empty = [...paper, ...ink, ...other].filter((x) => Number(x.stock) <= 0);
  const rimTotal = paper.filter(isRim).reduce((a, p) => a + Math.max(Number(p.stock) || 0, 0), 0);
  const kgTotal = ink.reduce((a, p) => a + Math.max(Number(p.stock) || 0, 0), 0);

  const rows = useMemo(() => {
    const list = all[tab] || [];
    if (!tokens.length) return list;
    return list.filter((it) => matchAll(norm([
      nameOf(tab, it), specOf(tab, it), `${it.gramatur || ""}gr`, `${it.panjang || ""}x${it.lebar || ""}`,
      it.satuan, (it.suppliers || []).join(" "), it.keterangan,
    ].join(" | ")), tokens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tab, tokens]);

  const dl = async () => {
    try { await downloadPdf("/pdf/stock-ringkas", {}, "laporan-stok-akhir.pdf"); toast.success("PDF diunduh."); }
    catch (e) { toast.error(apiError(e, "Gagal unduh PDF")); }
  };

  const cur = TABS.find((t) => t.id === tab);

  return (
    <PageContainer
      testid="stock-report-page"
      isLoading={isLoading && !data}
      pageEyebrow="Stok"
      pageTitle="Laporan Stok Akhir"
      pageHeaderAction={(
        <Button variant="outline" className="gap-2" data-testid="pdf-stock-ringkas" onClick={dl}>
          <FileDown className="h-4 w-4" /> Unduh PDF
        </Button>
      )}
    >
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi label="Kertas" value={formatNumber(rimTotal, 2)} unit="Rim" sub={`${paper.length} item`} />
        <Kpi label="Tinta" value={formatNumber(kgTotal, 2)} unit="Kg" sub={`${ink.length} item`} />
        <Kpi label="Barang lain" value={`${other.length} item`} sub={other.slice(0, 3).map((o) => o.nama_barang).join(", ") || "-"} />
        <Kpi label="Stok habis" value={`${empty.length} item`} danger={empty.length > 0}
          sub={empty.slice(0, 2).map((x) => x.jenis_kertas || x.jenis_tinta || x.nama_barang).join(", ") || "Semua tersedia"} />
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border/60 p-3.5">
          <div role="tablist" aria-label="Kategori stok" className="flex gap-1 rounded-[10px] bg-secondary p-1">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} data-testid={`stock-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`h-8 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/75 hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <label className="flex h-[38px] min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground focus-within:border-primary/60">
            <Search className="h-4 w-4 shrink-0" />
            <input data-testid="stock-search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari item atau supplier…" aria-label="Cari stok"
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
            {query && (
              <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery("")} className="rounded p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-secondary/50 text-left text-[11.5px] font-semibold text-muted-foreground">
                <th className="whitespace-nowrap border-b border-border px-3.5 py-2.5">{cur.head}</th>
                <th className="whitespace-nowrap border-b border-border px-3.5 py-2.5">Satuan</th>
                <th className="whitespace-nowrap border-b border-border px-3.5 py-2.5">Supplier</th>
                <th className="whitespace-nowrap border-b border-border px-3.5 py-2.5 text-right">Stok akhir</th>
                <th className="whitespace-nowrap border-b border-border px-3.5 py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody data-testid={`${tab}-stock-table`}>
              {rows.map((it) => {
                const low = Number(it.stock) <= 0;
                return (
                  <tr key={it.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                    <td className="px-3.5 py-3">
                      <div className="font-semibold">{nameOf(tab, it)}</div>
                      {specOf(tab, it) && <div className="text-xs text-muted-foreground">{specOf(tab, it)}</div>}
                    </td>
                    <td className="px-3.5 py-3">{it.satuan || "-"}</td>
                    <td className="px-3.5 py-3 text-foreground/75">{(it.suppliers || []).join(", ") || "–"}</td>
                    <td className={`px-3.5 py-3 text-right font-bold ${low ? "text-rose-700 dark:text-rose-400" : ""}`}>{formatNumber(it.stock, 2)}</td>
                    <td className="px-3.5 py-3 text-foreground/75">{it.keterangan || "–"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-secondary">
                      {tokens.length ? <SearchX className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
                    </div>
                    {tokens.length ? `Tidak ada ${cur.label.toLowerCase()} yang cocok dengan “${query.trim()}”.` : `Belum ada item ${cur.label.toLowerCase()}. Tambah item di menu Mutasi.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
