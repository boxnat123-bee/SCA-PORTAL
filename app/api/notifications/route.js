import { handle, json } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { getDb, COL } from "@/server/mongo";
import { enrichPo } from "@/server/po/stages";
import { enrich as enrichInvoice } from "@/server/tempo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMPO_DAYS = 3; // klien jatuh tempo: H-3
const PO_DAYS = 5;    // PO: H-5 sebelum Est. Selesai

/** Selisih hari (tanggal lokal WIB) dari hari ini ke tanggal YYYY-MM-DD. */
function daysUntil(dateStr, todayStr) {
  if (!dateStr) return null;
  const a = Date.parse(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${todayStr}T00:00:00Z`);
  if (Number.isNaN(a)) return null;
  return Math.round((a - b) / 86400000);
}

function todayWib() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export const GET = handle(async (req) => {
  const current = await requireAuth(req);
  const db = await getDb();
  const today = todayWib();
  const out = [];

  // PO belum selesai, Est. Selesai ≤ 5 hari lagi (atau sudah lewat)
  const pos = await db.collection(COL.pos).find({ est_end: { $ne: null } }).limit(3000).toArray();
  for (const raw of pos) {
    const po = enrichPo(raw);
    if (po.computed?.is_completed) continue;
    const d = daysUntil(po.est_end, today);
    if (d === null || d > PO_DAYS) continue;
    out.push({
      id: `po-${po.id}-${po.est_end}`,
      kind: "po",
      title: `PO ${po.po_number} — ${po.client_name}`,
      body: `Tahap: ${po.computed?.current_stage_name || "-"}`,
      date: po.est_end,
      days: d,
      link: `/po/pos/${po.id}`,
    });
  }

  // Jatuh tempo klien (khusus Superadmin, karena menu Tempo hanya untuk Superadmin)
  if (current.role === "superadmin") {
    const invs = await db.collection(COL.tempoInvoices).find({ status: { $ne: "lunas" }, due_date: { $ne: null } }).limit(3000).toArray();
    for (const raw of invs) {
      const inv = enrichInvoice(raw);
      if (Number(inv.remaining_amount) <= 0) continue;
      const d = daysUntil(inv.due_date, today);
      if (d === null || d > TEMPO_DAYS) continue;
      out.push({
        id: `tempo-${inv.id}-${inv.due_date}`,
        kind: "tempo",
        title: `Jatuh tempo — ${inv.client_name}`,
        body: `Invoice ${inv.invoice_number || "-"}${inv.po_number ? ` · PO ${inv.po_number}` : ""}`,
        date: inv.due_date,
        days: d,
        amount: inv.remaining_amount,
        link: "/tempo",
      });
    }
  }

  out.sort((a, b) => a.days - b.days);
  return json({ today, items: out });
});
