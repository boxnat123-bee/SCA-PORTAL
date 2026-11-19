/**
 * Stok SCA (Kertas / Tinta / Lain) — model berbasis ITEM.
 *
 *  stock_items      : { id, type, <identitas item>, satuan, created_by.., created_at }
 *  <type>_mutations : { id, item_id, jenis_transaksi: "masuk"|"keluar", jumlah, date, time, year,
 *                       supplier (masuk), nama_cetakan (keluar), keterangan,
 *                       <identitas item didenormalisasi untuk laporan>,
 *                       created_by, created_by_name, created_at,
 *                       updated_by_name, updated_at, history: [{ action, by_id, by_name, at, changes }] }
 *
 * Harga & PPN (opsional) hanya dicatat di ITEM saat dibuat lewat "+ Item" (sekaligus mutasi masuk awal).
 * Tanpa kode, tanpa retur. Stok item = Σ masuk − Σ keluar (seluruh waktu).
 */
import { getDb, COL, COLLECTION_BY_TYPE, stripId, nowIso } from "@/server/mongo";
import { HttpError } from "@/server/http";

export const TYPES = ["paper", "ink", "other"];

export function collectionFor(type) {
  const c = COLLECTION_BY_TYPE[type];
  if (!c) throw new HttpError(404, "Jenis stok tidak dikenal");
  return c;
}

export const NAME_FIELD = { paper: "jenis_kertas", ink: "jenis_tinta", other: "nama_barang" };
export const TYPE_LABEL = { paper: "Kertas", ink: "Tinta", other: "Barang Lain" };

const num = (v) => Number(v || 0);
const str = (v) => String(v ?? "").trim();
const round = (v, d = 3) => Math.round((Number(v) + Number.EPSILON) * 10 ** d) / 10 ** d;

/* ----------------------------- ITEM ----------------------------- */

/** Validasi & normalisasi identitas item. */
export function buildItem(type, data) {
  if (type === "paper") {
    const jenis = str(data.jenis_kertas);
    if (!jenis) throw new HttpError(400, "Jenis kertas wajib diisi");
    const gramatur = num(data.gramatur), panjang = num(data.panjang), lebar = num(data.lebar);
    if (!(gramatur > 0) || !(panjang > 0) || !(lebar > 0)) {
      throw new HttpError(400, "Gramatur, panjang, dan lebar wajib diisi");
    }
    return { jenis_kertas: jenis, gramatur, panjang, lebar, satuan: str(data.satuan) || "Rim", keterangan: str(data.item_keterangan ?? data.keterangan_item) };
  }
  if (type === "ink") {
    const jenis = str(data.jenis_tinta);
    if (!jenis) throw new HttpError(400, "Jenis tinta wajib diisi");
    return { jenis_tinta: jenis, satuan: "Kg", keterangan: str(data.item_keterangan ?? data.keterangan_item) };
  }
  const nama = str(data.nama_barang);
  if (!nama) throw new HttpError(400, "Nama barang wajib diisi");
  return { nama_barang: nama, satuan: str(data.satuan) || "unit", keterangan: str(data.item_keterangan ?? data.keterangan_item) };
}

/** Harga (opsional) — mode: per_satuan | per_kg (kertas) | total | custom. PPN nominal Rp (opsional). */
export const PRICE_MODES = ["per_satuan", "per_kg", "total", "custom"];
export function buildPrice(data) {
  const mode = PRICE_MODES.includes(data?.harga_mode) ? data.harga_mode : "per_satuan";
  const raw = str(data?.harga);
  const harga = raw === "" ? null : num(raw);
  if (harga !== null && !(harga >= 0)) throw new HttpError(400, "Harga tidak valid");
  const ppnAda = !!data?.ppn_ada;
  const ppnNominal = ppnAda ? num(data?.ppn_nominal) : 0;
  return {
    harga_mode: mode,
    harga,
    harga_label: mode === "custom" ? str(data?.harga_label) : "",
    ppn_ada: ppnAda,
    ppn_nominal: ppnNominal,
  };
}

/** Kunci unik item (untuk mencegah duplikat). */
export function itemKey(type, it) {
  if (type === "paper") {
    return `${it.jenis_kertas.toLowerCase()}|${num(it.gramatur)}|${num(it.panjang)}|${num(it.lebar)}|${it.satuan.toLowerCase()}`;
  }
  if (type === "ink") return it.jenis_tinta.toLowerCase();
  return `${it.nama_barang.toLowerCase()}|${it.satuan.toLowerCase()}`;
}

/** Nama item untuk tampilan & PDF. */
export function itemLabel(type, it) {
  if (!it) return "-";
  if (type === "paper") return `${it.jenis_kertas} ${num(it.gramatur)}gr ${num(it.panjang)}x${num(it.lebar)}`;
  if (type === "ink") return it.jenis_tinta;
  return it.nama_barang;
}

/** Field identitas item yang ikut disalin ke setiap mutasi (laporan & PDF). */
export function identityOf(type, it) {
  if (type === "paper") {
    const { jenis_kertas, gramatur, panjang, lebar, satuan } = it;
    return { jenis_kertas, gramatur, panjang, lebar, satuan };
  }
  if (type === "ink") return { jenis_tinta: it.jenis_tinta, satuan: "Kg" };
  return { nama_barang: it.nama_barang, satuan: it.satuan };
}

export async function getItemOr404(type, id) {
  const db = await getDb();
  const it = await db.collection(COL.stockItems).findOne({ id: String(id || ""), type }, { projection: { _id: 0 } });
  if (!it) throw new HttpError(404, "Item tidak ditemukan");
  return it;
}

export async function assertNoDuplicate(type, item, excludeId = null) {
  const db = await getDb();
  const all = await db.collection(COL.stockItems).find({ type }, { projection: { _id: 0 } }).toArray();
  const key = itemKey(type, item);
  if (all.some((x) => x.id !== excludeId && itemKey(type, x) === key)) {
    throw new HttpError(400, "Item ini sudah ada. Untuk menambah stok, klik panah hijau pada item tersebut.");
  }
}

/** Stok per item_id dari seluruh mutasi (opsional: kecualikan satu mutasi). */
export async function stockByItem(type, { excludeId = null } = {}) {
  const db = await getDb();
  const rows = await db.collection(collectionFor(type))
    .find({}, { projection: { _id: 0, id: 1, item_id: 1, jenis_transaksi: 1, jumlah: 1, date: 1, time: 1, supplier: 1 } })
    .toArray();
  const acc = {};
  for (const m of rows) {
    if (excludeId && m.id === excludeId) continue;
    const a = (acc[m.item_id] ||= { stock: 0, masuk: 0, keluar: 0, count: 0, last: "", suppliers: [] });
    const sup = str(m.supplier);
    if (m.jenis_transaksi === "masuk" && sup && !a.suppliers.some((x) => x.toLowerCase() === sup.toLowerCase())) a.suppliers.push(sup);
    const q = num(m.jumlah);
    if (m.jenis_transaksi === "masuk") { a.stock += q; a.masuk += q; } else { a.stock -= q; a.keluar += q; }
    a.count += 1;
    const ts = `${m.date || ""} ${m.time || ""}`;
    if (ts > a.last) a.last = ts;
  }
  for (const a of Object.values(acc)) {
    a.stock = round(a.stock); a.masuk = round(a.masuk); a.keluar = round(a.keluar); a.last = a.last.trim();
  }
  return acc;
}

/** Daftar item + stok, terurut nama. */
export async function listItemsWithStock(type) {
  const db = await getDb();
  const [items, stock] = await Promise.all([
    db.collection(COL.stockItems).find({ type }, { projection: { _id: 0 } }).toArray(),
    stockByItem(type),
  ]);
  const out = items.map((it) => ({
    ...it,
    label: itemLabel(type, it),
    stock: stock[it.id]?.stock ?? 0,
    total_masuk: stock[it.id]?.masuk ?? 0,
    total_keluar: stock[it.id]?.keluar ?? 0,
    mutation_count: stock[it.id]?.count ?? 0,
    last_mutation: stock[it.id]?.last || null,
    suppliers: stock[it.id]?.suppliers || [],
  }));
  out.sort((a, b) => a.label.localeCompare(b.label, "id", { numeric: true }));
  return out;
}

/* ---------------------------- MUTASI ---------------------------- */

function requireDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) throw new HttpError(400, "Tanggal tidak valid");
}
function normTime(t) {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Validasi isian mutasi masuk/keluar (tanpa harga/kode/retur). */
export function buildMutation(data) {
  const jenis = data.jenis_transaksi;
  if (!["masuk", "keluar"].includes(jenis)) throw new HttpError(400, "Jenis mutasi harus Masuk atau Keluar");
  requireDate(data.date);
  const jumlah = num(data.jumlah);
  if (!(jumlah > 0)) throw new HttpError(400, "Jumlah harus lebih dari 0");
  return {
    jenis_transaksi: jenis,
    jumlah,
    date: data.date,
    time: normTime(data.time),
    year: Number(String(data.date).slice(0, 4)),
    supplier: jenis === "masuk" ? str(data.supplier) : "",
    nama_cetakan: str(data.nama_cetakan),
    keterangan: str(data.keterangan),
  };
}

/** Stok tidak boleh negatif setelah perubahan. */
export async function assertStockOk(type, itemId, mutation, excludeId = null) {
  const stock = await stockByItem(type, { excludeId });
  const current = stock[itemId]?.stock ?? 0;
  const delta = mutation.jenis_transaksi === "masuk" ? mutation.jumlah : -mutation.jumlah;
  if (round(current + delta) < 0) {
    throw new HttpError(400, `Stok tidak cukup. Stok saat ini: ${current} (tanpa mutasi ini).`);
  }
}

const TRACKED = ["jenis_transaksi", "jumlah", "date", "time", "supplier", "nama_cetakan", "keterangan"];

/** Ringkasan perubahan field: { field: [lama, baru] }. */
export function diffMutation(before, after) {
  const changes = {};
  for (const f of TRACKED) {
    const a = before?.[f] ?? "", b = after?.[f] ?? "";
    if (String(a) !== String(b)) changes[f] = [a, b];
  }
  return changes;
}

export function historyEntry(action, current, changes = {}) {
  return { action, by_id: current.id, by_name: current.name || current.username, at: nowIso(), changes };
}

export function sortMutationsDesc(rows) {
  return rows.sort((a, b) =>
    `${b.date} ${b.time || ""} ${b.created_at || ""}`.localeCompare(`${a.date} ${a.time || ""} ${a.created_at || ""}`));
}

/** Semua user login boleh ubah/hapus mutasi siapa pun (tercatat di riwayat & log audit). */
export function canModify(current, mutation) {
  if (!current || !mutation) return [false, "Tidak diizinkan"];
  return [true, ""];
}

export { stripId };
