import { handle, json, readJson, HttpError } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { getDb, COL, stripId, nowIso } from "@/server/mongo";
import { STAGE_NAMES } from "@/server/po/stages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/po/schedules/[id] — ubah tahap / rentang tanggal
export const PUT = handle(async (req, { params }) => {
  await requireAuth(req);
  const { id } = await params;
  const body = await readJson(req);
  const db = await getDb();
  const cur = await db.collection(COL.poSchedules).findOne({ id });
  if (!cur) throw new HttpError(404, "Jadwal tidak ditemukan");
  const date = String(body.date || cur.date);
  const endDate = String(body.end_date || date);
  if (endDate < date) throw new HttpError(400, "Tanggal selesai tidak boleh sebelum tanggal mulai");
  const stageNumber = body.stage_number ? Number(body.stage_number) : cur.stage_number;
  const set = {
    date, end_date: endDate, stage_number: stageNumber,
    stage_name: STAGE_NAMES[stageNumber] || "", updated_at: nowIso(),
  };
  if (body.note !== undefined) set.note = String(body.note || "");
  await db.collection(COL.poSchedules).updateOne({ id }, { $set: set });
  return json(stripId(await db.collection(COL.poSchedules).findOne({ id })));
});

export const DELETE = handle(async (req, { params }) => {
  await requireAuth(req);
  const { id } = await params;
  const db = await getDb();
  await db.collection(COL.poSchedules).deleteOne({ id });
  return json({ ok: true });
});
