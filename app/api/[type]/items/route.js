import { handle, json, readJson } from "@/server/http";
import { getCurrentUser } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";
import { collectionFor, buildItem, assertNoDuplicate, listItemsWithStock, itemLabel } from "@/server/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/[type]/items — daftar item + stok
export const GET = handle(async (req, { params }) => {
  await getCurrentUser(req);
  const { type } = await params;
  collectionFor(type);
  return json(await listItemsWithStock(type));
});

// POST /api/[type]/items — tambah item baru
export const POST = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type } = await params;
  collectionFor(type);
  const body = await readJson(req);
  const item = buildItem(type, body);
  await assertNoDuplicate(type, item);
  const doc = {
    id: crypto.randomUUID(), type, ...item,
    created_by: current.id, created_by_name: current.name, created_at: nowIso(),
  };
  const db = await getDb();
  await db.collection(COL.stockItems).insertOne({ ...doc });
  return json({ ...doc, label: itemLabel(type, doc), stock: 0, mutation_count: 0 }, 201);
});
