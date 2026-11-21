import { handle, qp, pdfResponse, HttpError } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { getDb, COL } from "@/server/mongo";
import { enrichPo, filterPos } from "@/server/po/stages";
import { buildPoRekapPdf } from "@/server/pdf/poPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  await requireAuth(req);
  const search = qp(req, "search");
  const bucket = qp(req, "bucket");
  const month = qp(req, "month");
  const id = qp(req, "id"); // satu PO saja (tombol "Unduh PDF" di kartu Daftar PO)
  const db = await getDb();
  if (id) {
    const doc = await db.collection(COL.pos).findOne({ id });
    if (!doc) throw new HttpError(404, "PO tidak ditemukan");
    const bytes = await buildPoRekapPdf({ pos: [enrichPo(doc)] });
    return pdfResponse(bytes, `PO_${String(doc.po_number || "SCA").replace(/[^\w.-]+/g, "_")}.pdf`);
  }
  const docs = await db.collection(COL.pos).find({}).limit(2000).toArray();
  const enriched = docs.map(enrichPo);
  const filtered = filterPos(enriched, search, bucket, month);
  const bytes = await buildPoRekapPdf({ pos: filtered, month });
  const fname = `Rekap_PO_SCA${month ? "_" + month : ""}.pdf`;
  return pdfResponse(bytes, fname);
});
