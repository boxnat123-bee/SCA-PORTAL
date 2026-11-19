/** Laporan Stok SCA (tanpa nominal rupiah) — berbasis item + mutasi masuk/keluar. */
import { getDb, COL, stripId, currentYear } from "@/server/mongo";
import { collectionFor, listItemsWithStock, itemLabel } from "@/server/mutations";
import { ID_MONTHS } from "@/server/format";
import { HttpError } from "@/server/http";
import { trendRangeError } from "@/lib/trendRange";

const pad = (n) => String(n).padStart(2, "0");
const round = (v, d = 2) => Math.round((Number(v) + Number.EPSILON) * 10 ** d) / 10 ** d;
const sum = (arr) => arr.reduce((a, b) => a + Number(b || 0), 0);

/**
 * Mutasi yang masih terhubung ke item yang ada. Data sisa sistem lama (tanpa item_id)
 * atau milik item yang sudah dihapus TIDAK ikut ke PDF / dashboard — sama seperti di layar.
 */
export async function mutationsOf(type, { start, end } = {}) {
  const db = await getDb();
  const itemIds = await db.collection(COL.stockItems).distinct("id", { type });
  const q = { item_id: { $in: itemIds } };
  if (start || end) q.date = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };
  return (await db.collection(collectionFor(type)).find(q).toArray()).map(stripId);
}

// ---------------- DASHBOARD ----------------
export async function computeDashboard() {
  const year = currentYear();
  const [pItems, iItems, oItems, paper, ink, other] = await Promise.all([
    listItemsWithStock("paper"), listItemsWithStock("ink"), listItemsWithStock("other"),
    mutationsOf("paper"), mutationsOf("ink"), mutationsOf("other"),
  ]);
  const isRim = (x) => String(x.satuan || "Rim").toLowerCase() === "rim";

  const today = new Date().toISOString().slice(0, 10);
  const all = [
    ...paper.map((m) => ({ ...m, kategori: "Kertas", nama: itemLabel("paper", m) })),
    ...ink.map((m) => ({ ...m, kategori: "Tinta", nama: m.jenis_tinta })),
    ...other.map((m) => ({ ...m, kategori: "Lain", nama: m.nama_barang })),
  ];

  all.sort((a, b) => `${b.date} ${b.time || ""} ${b.created_at || ""}`.localeCompare(`${a.date} ${a.time || ""} ${a.created_at || ""}`));

  return {
    total_paper_stock: round(sum(pItems.filter(isRim).map((v) => Math.max(v.stock, 0)))),
    total_ink_stock: round(sum(iItems.map((v) => Math.max(v.stock, 0)))),
    item_counts: { paper: pItems.length, ink: iItems.length, other: oItems.length },
    low_stock: [
      ...pItems.map((v) => ({ ...v, kategori: "Kertas" })),
      ...iItems.map((v) => ({ ...v, kategori: "Tinta" })),
      ...oItems.map((v) => ({ ...v, kategori: "Lain" })),
    ].filter((v) => v.stock <= 0 && v.mutation_count > 0).slice(0, 10),
    mutations_today: all.filter((m) => m.date === today).length,
    recent: all.slice(0, 10),
    year,
  };
}

// ---------------- GRAFIK MUTASI PER BULAN (Beranda) ----------------
/** Total masuk/keluar per bulan kalender dalam rentang start..end (1–12 bulan). Kertas: hanya satuan Rim. */
export async function computeTrend(type, start, end) {
  const err = trendRangeError(start, end);
  if (err) throw new HttpError(400, err);
  let rows = await mutationsOf(type, { start, end });
  if (type === "paper") {
    const db = await getDb();
    const items = await db.collection(COL.stockItems).find({ type }, { projection: { _id: 0, id: 1, satuan: 1 } }).toArray();
    const rimIds = new Set(items.filter((it) => String(it.satuan || "Rim").toLowerCase() === "rim").map((it) => it.id));
    rows = rows.filter((m) => rimIds.has(m.item_id));
  }
  const [y0, m0] = start.split("-").map(Number);
  const [y1, m1] = end.split("-").map(Number);
  const multiYear = y0 !== y1;
  const out = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
    const prefix = `${y}-${pad(m)}`;
    const f = (t) => round(sum(rows.filter((r) => String(r.date).startsWith(prefix) && r.jenis_transaksi === t).map((r) => r.jumlah)));
    out.push({ label: `${ID_MONTHS[m - 1].slice(0, 3)}${multiYear ? ` ${String(y).slice(2)}` : ""}`, masuk: f("masuk"), keluar: f("keluar") });
  }
  return out;
}

// ---------------- LAPORAN STOK ----------------
export async function computeStock() {
  const [paper, ink, other] = await Promise.all([
    listItemsWithStock("paper"), listItemsWithStock("ink"), listItemsWithStock("other"),
  ]);
  return { paper, ink, other, year: currentYear() };
}
