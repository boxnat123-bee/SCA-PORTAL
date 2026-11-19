import { handle, json, readJson } from "@/server/http";
import { getCurrentUser } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";
import { HttpError } from "@/server/http";
import {
  collectionFor, buildItem, buildPrice, buildMutation, assertNoDuplicate, listItemsWithStock, itemLabel,
  identityOf, historyEntry,
} from "@/server/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/[type]/items — daftar item + stok
export const GET = handle(async (req, { params }) => {
  await getCurrentUser(req);
  const { type } = await params;
  collectionFor(type);
  return json(await listItemsWithStock(type));
});

// POST /api/[type]/items — tambah item baru + mutasi masuk awal (Jumlah & Supplier wajib; Harga & PPN opsional)
export const POST = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type } = await params;
  const col = collectionFor(type);
  const body = await readJson(req);
  const item = buildItem(type, body);
  const price = buildPrice(body);
  if (!String(body.supplier || "").trim()) throw new HttpError(400, "Supplier wajib diisi");
  const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString(); // WIB
  const m = buildMutation({
    jenis_transaksi: "masuk", jumlah: body.jumlah,
    date: body.date || now.slice(0, 10), time: body.time || now.slice(11, 16),
    supplier: body.supplier, nama_cetakan: body.nama_cetakan, keterangan: body.keterangan,
  });
  await assertNoDuplicate(type, item);
  const doc = {
    id: crypto.randomUUID(), type, ...item, ...price,
    created_by: current.id, created_by_name: current.name, created_at: nowIso(),
  };
  const mut = {
    id: crypto.randomUUID(), item_id: doc.id, ...identityOf(type, doc), ...m, ...price,
    awal: true, // mutasi masuk awal dari "+ Item"
    pic_name: current.name, created_by: current.id, created_by_name: current.name,
    created_at: nowIso(), updated_at: null, updated_by_name: null,
    history: [historyEntry("buat", current)],
  };
  const db = await getDb();
  await db.collection(COL.stockItems).insertOne({ ...doc });
  await db.collection(col).insertOne({ ...mut });
  return json({ ...doc, label: itemLabel(type, doc), stock: m.jumlah, mutation_count: 1 }, 201);
});
