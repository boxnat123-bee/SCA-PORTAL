import { handle, json, readJson, HttpError } from "@/server/http";
import { requireSuperadmin } from "@/server/auth";
import { getDb, COL } from "@/server/mongo";
import { getInvoiceOr404, enrich, STATUSES, nowIso } from "@/server/tempo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = handle(async (req, { params }) => {
  await requireSuperadmin(req);
  const { id } = await params;
  await getInvoiceOr404(id);
  const body = await readJson(req);
  const status = String(body?.status ?? "");
  if (!STATUSES.includes(status)) throw new HttpError(400, "Status harus 'lunas' atau 'belum_lunas'");

  // Tanggal pelunasan dipilih user saat menandai Lunas (default hari ini).
  const paid = String(body?.paid_date || "");
  const paidDate = status === "lunas" ? (/^\d{4}-\d{2}-\d{2}$/.test(paid) ? paid : new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)) : null;
  const db = await getDb();
  await db
    .collection(COL.tempoInvoices)
    .updateOne({ id }, { $set: { status, paid_date: paidDate, updated_at: nowIso() } });
  return json(enrich(await db.collection(COL.tempoInvoices).findOne({ id })));
});
