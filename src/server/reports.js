/** Laporan Stok SCA (tanpa nominal rupiah) — berbasis item + mutasi masuk/keluar. */
import { getDb, stripId, currentYear } from "@/server/mongo";
import { collectionFor, listItemsWithStock, itemLabel } from "@/server/mutations";
import { ID_MONTHS } from "@/server/format";

const pad = (n) => String(n).padStart(2, "0");
const round = (v, d = 2) => Math.round((Number(v) + Number.EPSILON) * 10 ** d) / 10 ** d;
const sum = (arr) => arr.reduce((a, b) => a + Number(b || 0), 0);

export async function mutationsOf(type, { start, end } = {}) {
  const db = await getDb();
  const q = {};
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

  const now = new Date();
  const months = [];
  for (let k = 5; k >= 0; k--) {
    let mm = now.getMonth() + 1 - k;
    let yy = now.getFullYear();
    while (mm <= 0) { mm += 12; yy -= 1; }
    months.push([yy, mm]);
  }
  const trend = months.map(([yy, mm]) => {
    const prefix = `${yy}-${pad(mm)}`;
    const f = (arr, t) => sum(arr.filter((m) => String(m.date).startsWith(prefix) && m.jenis_transaksi === t).map((m) => m.jumlah));
    return {
      label: ID_MONTHS[mm - 1].slice(0, 3),
      paper_masuk: round(f(paper.filter(isRim), "masuk")),
      paper_keluar: round(f(paper.filter(isRim), "keluar")),
      ink_masuk: round(f(ink, "masuk")),
      ink_keluar: round(f(ink, "keluar")),
    };
  });

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
    trend,
    recent: all.slice(0, 10),
    year,
  };
}

// ---------------- LAPORAN STOK ----------------
export async function computeStock() {
  const [paper, ink, other] = await Promise.all([
    listItemsWithStock("paper"), listItemsWithStock("ink"), listItemsWithStock("other"),
  ]);
  return { paper, ink, other, year: currentYear() };
}
