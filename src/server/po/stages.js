// Server-side PO status computation (mirror STAGE_NAMES di frontend).
//
// ID tahap dipertahankan supaya data lama tetap valid. Tahap baru "Menunggu PO Single Face"
// memakai ID 12 tetapi ditampilkan di urutan ke-2 (lihat STAGE_ORDER).
export const STAGE_NAMES = {
  1: "Menunggu PO Kertas",
  2: "Menunggu Pesanan CTCP",
  3: "Menunggu Pesanan Pisau Plong",
  4: "Proses Potong Kertas",
  5: "Proses Cetak",
  6: "Proses Finishing",
  7: "Proses Plong",
  8: "Proses Kopek",
  9: "Proses Lem",
  10: "Proses Packing",
  11: "Selesai Cetak & Pengiriman",
  12: "Menunggu PO Single Face",
  13: "Proses Lam. Single Face",
};

export const MAX_STAGE = 13;
// Urutan tampilan di form & detail. Lam. Single Face (13) setelah Cetak & Finishing.
export const STAGE_ORDER = [1, 12, 2, 3, 4, 5, 6, 13, 7, 8, 9, 10, 11];
// Tahap "menunggu": masing-masing berdiri sendiri, boleh dicentang tanpa urutan.
export const WAITING_IDS = [1, 12, 2, 3];
// Tahap proses: berurutan (garis runutan).
export const PROCESS_IDS = [4, 5, 6, 13, 7, 8, 9, 10, 11];

export function validStage(n) {
  return Number.isInteger(n) && n >= 1 && n <= MAX_STAGE;
}

export function lastAttempt(data) {
  const arr = data?.delivery_attempts || [];
  return arr.length ? arr[arr.length - 1] : null;
}

/**
 * Data lama: Tahap 1 pernah memuat "butuh single face" + "single face datang".
 * Saat dibaca, ubah jadi tahap 12 tanpa menyentuh database.
 */
export function normalizeLegacy(po) {
  if (!po) return po;
  const sd = po.stage_data || {};
  const s1 = sd["1"] || {};
  const enabled = po.enabled_stages || [];
  if (s1.needs_single_face && !enabled.includes(12)) {
    return {
      ...po,
      enabled_stages: [...enabled, 12],
      stage_data: { ...sd, "12": sd["12"] || { arrived: !!s1.single_face_arrived } },
    };
  }
  return po;
}

export function isStageDone(po, num) {
  const data = (po.stage_data || {})[String(num)] || {};
  if (num === 1) return !!data.paper_arrived;
  if (num === 2 || num === 3 || num === 12) return !!data.arrived;
  if (num === 11) {
    const att = lastAttempt(data);
    return !!data.print_completed && !!att && att.status === "success";
  }
  return !!data.done;
}

export function computeStatus(rawPo) {
  const po = normalizeLegacy(rawPo);
  const enabled = [...(po.enabled_stages || [])];
  const doneStages = enabled.filter((n) => isStageDone(po, n));

  const waitingEnabled = STAGE_ORDER.filter((n) => WAITING_IDS.includes(n) && enabled.includes(n));
  const processEnabled = PROCESS_IDS.filter((n) => enabled.includes(n));
  const waitingPending = waitingEnabled.filter((n) => !doneStages.includes(n));

  // Tahap proses berjalan = proses pertama yang belum selesai (urut).
  const currentProcess = processEnabled.find((n) => !doneStages.includes(n)) || null;
  const completed = enabled.length > 0 && doneStages.length === enabled.length;

  const data11 = (po.stage_data || {})["11"] || {};
  const att = lastAttempt(data11);
  const printCompleted = !!data11.print_completed && enabled.includes(11);

  // Hanya 3 status: Proses, Siap Kirim, Selesai.
  let bucket = "proses";
  if (!enabled.length) bucket = "no_stages";
  else if (completed) bucket = "completed";
  else if (printCompleted) bucket = "siap_kirim";

  let deliveryStatus = null;
  if (enabled.includes(11)) {
    if (att) deliveryStatus = att.status;
    else if (printCompleted) deliveryStatus = "no_schedule";
  }

  let currentName = "Selesai";
  if (!completed) {
    if (currentProcess) currentName = STAGE_NAMES[currentProcess];
    else if (waitingPending.length) currentName = STAGE_NAMES[waitingPending[0]];
    else currentName = "-";
  }

  return {
    current_stage: currentProcess || 0,
    current_stage_name: currentName,
    bucket,
    print_completed: printCompleted,
    delivery_status: deliveryStatus,
    delivery_failed: !completed && !!att && att.status === "failed",
    is_completed: completed,
    done_stages: doneStages,
    waiting_pending: waitingPending,
  };
}

export function enrichPo(po) {
  if (!po) return po;
  const { _id, ...rest } = po;
  const normalized = normalizeLegacy(rest);
  normalized.computed = computeStatus(normalized);
  return normalized;
}

export function poMonth(po) {
  const d = po.po_date || po.est_start || "";
  return d.length >= 7 ? d.slice(0, 7) : "";
}

export function rangesOverlap(s1, e1, s2, e2) {
  if (!s1 || !e1 || !s2 || !e2) return false;
  return s1 <= e2 && s2 <= e1;
}

export function filterPos(list, search, bucket, month) {
  let out = list;
  if (search) {
    const s = search.toLowerCase();
    out = out.filter((p) =>
      (p.po_number || "").toLowerCase().includes(s)
      || (p.client_name || "").toLowerCase().includes(s)
      || (p.item_type || "").toLowerCase().includes(s)
      || (p.paper_size || "").toLowerCase().includes(s)
      || (p.paper_size_plano || "").toLowerCase().includes(s)
      || (p.material || "").toLowerCase().includes(s));
  }
  if (month) out = out.filter((p) => poMonth(p) === month);
  if (bucket) {
    if (bucket === "active") out = out.filter((p) => !p.computed.is_completed);
    else if (bucket === "completed") out = out.filter((p) => p.computed.is_completed);
    else if (bucket === "delivery_failed") out = out.filter((p) => p.computed.delivery_failed);
    else out = out.filter((p) => p.computed.bucket === bucket);
  }
  return out;
}
