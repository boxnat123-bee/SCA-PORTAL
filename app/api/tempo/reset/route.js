import { handle, json, readJson, HttpError } from "@/server/http";
import { requireSuperadmin } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hapus Data Keuangan (khusus Superadmin): semua invoice Jatuh Tempo Klien
 * (cicilan tersimpan di dalam invoice, Laporan Jatuh Tempo dihitung dari invoice).
 * Opsi TOP & data HPP tidak disentuh. Server meminta konfirmasi teks "HAPUS".
 */
export const POST = handle(async (req) => {
  const current = await requireSuperadmin(req);
  const body = await readJson(req);
  if (String(body?.confirm || "").trim().toUpperCase() !== "HAPUS") {
    throw new HttpError(400, 'Ketik "HAPUS" untuk konfirmasi.');
  }
  const db = await getDb();
  const r = await db.collection(COL.tempoInvoices).deleteMany({});
  const result = { deleted: r.deletedCount };
  await db.collection(COL.auditLogs).insertOne({
    id: crypto.randomUUID(), user_id: current.id, name: current.name,
    action: "hapus_data_keuangan", mutation_type: "all", mutation_id: null,
    before: result, after: null, timestamp: nowIso(),
  });
  return json({ success: true, ...result });
});
