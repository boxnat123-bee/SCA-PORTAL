import { handle, json, readJson, HttpError } from "@/server/http";
import { getCurrentUser, logAudit } from "@/server/auth";
import { getDb, stripId, nowIso } from "@/server/mongo";
import {
  collectionFor, buildMutation, assertStockOk, canModify, diffMutation, historyEntry,
} from "@/server/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOrFail(collection, id) {
  const db = await getDb();
  const existing = await db.collection(collection).findOne({ id });
  if (!existing) throw new HttpError(404, "Mutasi tidak ditemukan");
  return stripId(existing);
}

// PUT — ubah mutasi; perubahan dicatat di history (siapa, kapan, apa yang berubah)
export const PUT = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type, id } = await params;
  const collection = collectionFor(type);
  const existing = await loadOrFail(collection, id);
  const [ok, msg] = canModify(current, existing);
  if (!ok) throw new HttpError(403, msg);

  const body = await readJson(req);
  const m = buildMutation({ ...existing, ...body });
  await assertStockOk(type, existing.item_id, m, id);
  const changes = diffMutation(existing, m);
  if (!Object.keys(changes).length) return json(existing);

  const db = await getDb();
  const now = nowIso();
  await db.collection(collection).updateOne(
    { id },
    {
      $set: { ...m, updated_at: now, updated_by_name: current.name },
      $push: { history: historyEntry("ubah", current, changes) },
    },
  );
  const updated = stripId(await db.collection(collection).findOne({ id }));
  await logAudit(current, "edit", type, id, existing, updated);
  return json(updated);
});

// DELETE — hapus mutasi (dicatat di log audit)
export const DELETE = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type, id } = await params;
  const collection = collectionFor(type);
  const existing = await loadOrFail(collection, id);
  const [ok, msg] = canModify(current, existing);
  if (!ok) throw new HttpError(403, msg);
  // Hapus mutasi MASUK tidak boleh membuat stok negatif
  if (existing.jenis_transaksi === "masuk") {
    await assertStockOk(type, existing.item_id, { jenis_transaksi: "masuk", jumlah: 0 }, id);
  }
  const db = await getDb();
  await db.collection(collection).deleteOne({ id });
  await logAudit(current, "delete", type, id, existing, null);
  return json({ success: true });
});
