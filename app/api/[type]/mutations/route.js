import { handle, json, qp, readJson } from "@/server/http";
import { getCurrentUser } from "@/server/auth";
import { getDb, stripId } from "@/server/mongo";
import {
  collectionFor, buildMutation, getItemOr404, identityOf, assertStockOk, historyEntry, sortMutationsDesc,
} from "@/server/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/[type]/mutations?start&end&item_id&jenis_transaksi
export const GET = handle(async (req, { params }) => {
  await getCurrentUser(req);
  const { type } = await params;
  const db = await getDb();
  const q = {};
  const itemId = qp(req, "item_id");
  const trx = qp(req, "jenis_transaksi");
  const start = qp(req, "start");
  const end = qp(req, "end");
  if (itemId) q.item_id = itemId;
  if (trx) q.jenis_transaksi = trx;
  if (start || end) q.date = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };
  const rows = (await db.collection(collectionFor(type)).find(q).toArray()).map(stripId);
  return json(sortMutationsDesc(rows));
});

// POST /api/[type]/mutations — catat masuk (panah hijau) / keluar (panah merah)
export const POST = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type } = await params;
  const body = await readJson(req);
  const item = await getItemOr404(type, body.item_id);
  const m = buildMutation(body);
  await assertStockOk(type, item.id, m);
  const doc = {
    id: crypto.randomUUID(),
    item_id: item.id,
    ...identityOf(type, item),
    ...m,
    pic_name: current.name,
    created_by: current.id,
    created_by_name: current.name,
    created_at: new Date().toISOString(),
    updated_at: null,
    updated_by_name: null,
    history: [historyEntry("buat", current)],
  };
  const db = await getDb();
  await db.collection(collectionFor(type)).insertOne({ ...doc });
  return json(doc, 201);
});
