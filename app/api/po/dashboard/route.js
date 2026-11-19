import { handle, json } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { getDb, COL } from "@/server/mongo";
import { computeStatus } from "@/server/po/stages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  await requireAuth(req);
  const db = await getDb();
  const pos = await db.collection(COL.pos).find({}).toArray();
  const counts = { proses: 0, siap_kirim: 0, completed: 0, delivery_failed: 0, no_stages: 0 };
  let active = 0;
  let completed = 0;
  for (const po of pos) {
    const c = computeStatus(po);
    if (c.bucket === "completed") {
      completed++;
      counts.completed++;
    } else {
      active++;
      if (counts[c.bucket] !== undefined) counts[c.bucket]++;
      if (c.delivery_failed) counts.delivery_failed++;
    }
  }
  return json({
    counts,
    total_active: active,
    total_completed: completed,
    total: pos.length,
  });
});
