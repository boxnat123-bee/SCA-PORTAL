import { handle, json, qp, HttpError } from "@/server/http";
import { getCurrentUser } from "@/server/auth";
import { computeTrend } from "@/server/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/reports/trend?type=paper|ink|other&start=YYYY-MM-DD&end=YYYY-MM-DD */
export const GET = handle(async (req) => {
  await getCurrentUser(req);
  const type = qp(req, "type") || "paper";
  if (!["paper", "ink", "other"].includes(type)) throw new HttpError(400, "Jenis tidak dikenal");
  return json({ trend: await computeTrend(type, qp(req, "start"), qp(req, "end")) });
});
