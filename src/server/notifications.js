/**
 * Notifikasi lonceng & "Perlu Perhatian" (Beranda) dihitung langsung dari data PO / invoice,
 * jadi tidak menumpuk di database. Yang disimpan hanya status kecil per item (koleksi notif_state):
 *  - handled: centang "sudah ditangani" (berlaku untuk semua user)
 *  - dismissed_by: daftar user yang menghapus item itu dari tampilannya
 */
import { getDb, COL, nowIso } from "@/server/mongo";
import { enrichPo, lastAttempt } from "@/server/po/stages";
import { enrich as enrichInvoice } from "@/server/tempo";

const TEMPO_DAYS = 3; // jatuh tempo klien: H-3
const PO_DAYS = 14;   // Est. Selesai & Deadline PO: H-14 (pengingat ulang saat masuk H-7)
const SHIP_DAYS = 1;  // jadwal pengiriman: H-1
const STATE_TTL_DAYS = 90; // status lama dibersihkan otomatis

export const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Selisih hari dari hari ini ke tanggal YYYY-MM-DD. */
function daysUntil(dateStr, todayStr) {
  if (!dateStr) return null;
  const a = Date.parse(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${todayStr}T00:00:00Z`);
  return Number.isNaN(a) ? null : Math.round((a - b) / 86400000);
}

/** Semua item aktif (belum memperhitungkan status centang/hapus). */
async function buildItems(db, current, today) {
  const out = [];
  const pos = await db.collection(COL.pos)
    .find({ $or: [{ est_end: { $nin: [null, ""] } }, { deadline: { $nin: [null, ""] } }, { "stage_data.11.delivery_attempts.0": { $exists: true } }] })
    .limit(3000).toArray();
  for (const raw of pos) {
    const po = enrichPo(raw);
    if (po.computed?.is_completed) continue;
    const base = { title: `PO ${po.po_number} — ${po.client_name}`, link: `/po/pos/${po.id}` };
    // id berubah saat masuk H-7 → lonceng menandai belum dibaca lagi.
    const remind = (kind, date, label) => {
      const d = daysUntil(date, today);
      if (d === null || d > PO_DAYS) return;
      out.push({ ...base, id: `${kind}-${po.id}-${date}${d <= 7 ? "-h7" : "-h14"}`, kind, date, days: d,
        body: `${label} · Tahap: ${po.computed?.current_stage_name || "-"}` });
    };
    remind("po", po.est_end, "Est. Selesai");
    remind("deadline", po.deadline, "Deadline");
    // Jadwal pengiriman yang belum ada hasilnya: H-1, hari ini, atau terlewat.
    const ship = lastAttempt(po.stage_data?.["11"]);
    if (ship?.scheduled_date && ship.status === "waiting") {
      const d = daysUntil(ship.scheduled_date, today);
      if (d !== null && d <= SHIP_DAYS) {
        out.push({ ...base, id: `ship-${po.id}-${ship.id}`, kind: "ship", date: ship.scheduled_date, days: d,
          body: `Jadwal pengiriman${ship.driver_name ? ` · Supir: ${ship.driver_name}` : ""}` });
      }
    }
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
        id: `tempo-${inv.id}-${inv.due_date}`, kind: "tempo",
        title: `Jatuh tempo — ${inv.client_name}`,
        body: `Invoice ${inv.invoice_number || "-"}${inv.po_number ? ` · PO ${inv.po_number}` : ""}`,
        date: inv.due_date, days: d, amount: inv.remaining_amount, link: "/tempo",
      });
    }
  }
  return out;
}

export async function listNotifications(current) {
  const db = await getDb();
  const today = todayWib();
  const items = await buildItems(db, current, today);
  const states = await db.collection(COL.notifState)
    .find({ key: { $in: items.map((i) => i.id) } }, { projection: { _id: 0 } }).toArray();
  const byKey = new Map(states.map((s) => [s.key, s]));
  const visible = items
    .filter((i) => !(byKey.get(i.id)?.dismissed_by || []).includes(current.id))
    .map((i) => ({ ...i, handled: byKey.get(i.id)?.handled || null }));
  // Belum ditangani dulu (paling mendesak di atas), yang sudah dicentang di bawah.
  visible.sort((a, b) => (!!a.handled - !!b.handled) || a.days - b.days);
  return { today, items: visible };
}

/** action: "handle" | "unhandle" (semua user) · "dismiss" (hapus dari tampilan user ini). */
export async function updateNotificationState(current, ids, action) {
  const db = await getDb();
  const col = db.collection(COL.notifState);
  const keys = [...new Set((ids || []).map(String).filter(Boolean))].slice(0, 500);
  if (!keys.length) return 0;
  const now = nowIso();
  const update = action === "handle"
    ? { $set: { handled: { by: current.id, name: current.name || current.username, at: now }, updated_at: now } }
    : action === "unhandle"
      ? { $set: { handled: null, updated_at: now } }
      : { $addToSet: { dismissed_by: current.id }, $set: { updated_at: now } };
  await col.bulkWrite(keys.map((key) => ({ updateOne: { filter: { key }, update, upsert: true } })));
  // Bersihkan status yang sudah lama tidak dipakai agar koleksi tetap kecil.
  const cutoff = new Date(Date.now() - STATE_TTL_DAYS * 86400000).toISOString();
  await col.deleteMany({ updated_at: { $lt: cutoff } });
  return keys.length;
}
