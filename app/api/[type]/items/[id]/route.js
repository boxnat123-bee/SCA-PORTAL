import { handle, json, readJson, HttpError } from "@/server/http";
import { getCurrentUser, logAudit } from "@/server/auth";
import { getDb, COL, nowIso, stripId } from "@/server/mongo";
import {
  collectionFor, buildItem, buildPrice, assertNoDuplicate, getItemOr404, identityOf, itemLabel,
  stockByItem, sortMutationsDesc,
} from "@/server/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/[type]/items/[id] — detail item + seluruh riwayat mutasi (termasuk riwayat edit)
export const GET = handle(async (req, { params }) => {
  await getCurrentUser(req);
  const { type, id } = await params;
  const item = await getItemOr404(type, id);
  const db = await getDb();
  const muts = (await db.collection(collectionFor(type)).find({ item_id: id }).toArray()).map(stripId);
  const stock = (await stockByItem(type))[id]?.stock ?? 0;
  return json({ item: { ...item, label: itemLabel(type, item), stock }, mutations: sortMutationsDesc(muts) });
});

// PUT /api/[type]/items/[id] — ubah identitas item (ikut memperbarui salinan di mutasi)
export const PUT = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type, id } = await params;
  const existing = await getItemOr404(type, id);
  const body = await readJson(req);
  const item = { ...buildItem(type, body), ...buildPrice(body) };
  await assertNoDuplicate(type, item, id);
  const db = await getDb();
  await db.collection(COL.stockItems).updateOne(
    { id },
    { $set: { ...item, updated_by_name: current.name, updated_at: nowIso() } },
  );
  await db.collection(collectionFor(type)).updateMany({ item_id: id }, { $set: identityOf(type, item) });
  await logAudit(current, "edit_item", type, id, existing, { ...existing, ...item });
  return json({ ...existing, ...item, label: itemLabel(type, item) });
});

// DELETE /api/[type]/items/[id] — hanya jika item belum punya mutasi
export const DELETE = handle(async (req, { params }) => {
  const current = await getCurrentUser(req);
  const { type, id } = await params;
  const existing = await getItemOr404(type, id);
  const db = await getDb();
  const count = await db.collection(collectionFor(type)).countDocuments({ item_id: id });
  if (count > 0) {
    throw new HttpError(400, `Item masih punya ${count} mutasi. Hapus mutasinya dulu lewat tombol Detail.`);
  }
  await db.collection(COL.stockItems).deleteOne({ id });
  await logAudit(current, "delete_item", type, id, existing, null);
  return json({ success: true });
});
