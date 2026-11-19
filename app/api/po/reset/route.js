import { handle, json, readJson, HttpError } from "@/server/http";
import { requireSuperadmin } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hapus SEMUA data bagian Produksi (khusus Superadmin): Daftar PO, jadwal Kalender,
 * file lampiran PO, dan seluruh Stok Klien (klien, PO klien, item, mutasi).
 * Halaman wajib mengunduh semua PDF Produksi dulu; server meminta konfirmasi teks "HAPUS".
 */
export const POST = handle(async (req) => {
  const current = await requireSuperadmin(req);
  const body = await readJson(req);
  if (String(body?.confirm || "").trim().toUpperCase() !== "HAPUS") {
    throw new HttpError(400, 'Ketik "HAPUS" untuk konfirmasi.');
  }
  const db = await getDb();
  const result = {};
  for (const [key, col] of [
    ["po", COL.pos], ["jadwal", COL.poSchedules], ["file_po", COL.poFiles],
    ["klien", COL.klienClients], ["po_klien", COL.klienPos], ["item_klien", COL.klienItems], ["mutasi_klien", COL.klienMutations],
  ]) {
    const r = await db.collection(col).deleteMany({});
    result[key] = r.deletedCount;
  }
  await db.collection(COL.auditLogs).insertOne({
    id: crypto.randomUUID(), user_id: current.id, name: current.name,
    action: "hapus_data_produksi", mutation_type: "produksi", mutation_id: null,
    before: result, after: null, timestamp: nowIso(),
  });
  return json({ success: true, ...result });
});
