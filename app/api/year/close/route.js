import { handle, json, readJson, HttpError } from "@/server/http";
import { requireSuperadmin } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";
import { TYPES, collectionFor, listItemsWithStock, identityOf, historyEntry } from "@/server/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hapus Data Mutasi Stok (dulu "Tutup Tahun"): hapus semua mutasi, lalu setiap item yang masih punya stok
 * mendapat 1 mutasi masuk "Saldo awal" sebesar stok terakhir (item tetap ada).
 */
export const POST = handle(async (req) => {
  const current = await requireSuperadmin(req);
  const body = await readJson(req);
  if (String(body?.confirm || "").trim().toUpperCase() !== "HAPUS") {
    throw new HttpError(400, 'Ketik "HAPUS" untuk konfirmasi.');
  }
  const db = await getDb();
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const result = {};
  for (const type of TYPES) {
    const items = await listItemsWithStock(type);
    const col = db.collection(collectionFor(type));
    const del = await col.deleteMany({});
    const carry = items.filter((it) => Number(it.stock) > 0).map((it) => ({
      id: crypto.randomUUID(), item_id: it.id, ...identityOf(type, it),
      jenis_transaksi: "masuk", jumlah: Number(it.stock), date, time: "00:00",
      year: Number(date.slice(0, 4)), supplier: "", nama_cetakan: "",
      keterangan: `Saldo awal (sisa stok per ${date.split("-").reverse().join("/")})`,
      pic_name: current.name, created_by: current.id, created_by_name: current.name,
      created_at: nowIso(), updated_at: null, updated_by_name: null,
      history: [historyEntry("buat", current)],
    }));
    if (carry.length) await col.insertMany(carry);
    result[`${type}_deleted`] = del.deletedCount;
    result[`${type}_carried`] = carry.length;
  }
  await db.collection(COL.auditLogs).insertOne({
    id: crypto.randomUUID(), user_id: current.id, name: current.name,
    action: "hapus_data_mutasi_stok", mutation_type: "all", mutation_id: null,
    before: result, after: null, timestamp: nowIso(),
  });
  return json({ success: true, ...result });
});
