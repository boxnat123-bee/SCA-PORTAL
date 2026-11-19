// Stage definitions untuk PO Tracker + status helpers.
// ID tahap dipertahankan agar data lama tetap valid; "Menunggu PO Single Face" memakai ID 12
// tetapi ditampilkan di urutan ke-2.
export const STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const STAGE_ORDER = [1, 12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Tahap "menunggu": berdiri sendiri (checklist, tanpa urutan).
export const WAITING_IDS = [1, 12, 2, 3];
// Tahap proses: berurutan (garis runutan).
export const PROCESS_IDS = [4, 5, 6, 7, 8, 9, 10, 11];

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
};

export const stageName = (n) => STAGE_NAMES[n] || `Tahap ${n}`;
// Nomor tampilan = posisi di urutan (1..12), bukan ID internal.
export const stagePos = (n) => STAGE_ORDER.indexOf(n) + 1;
export const sortStages = (arr) => [...arr].sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));

export const FINISHING_OPTIONS = ["Laminasi Flute", "UV Vernish", "Laminasi Glossy", "Laminasi Doff", "Hot Print"];
export const GLUE_OPTIONS = ["Lem Samping", "Lem Bottom"];
export const MACHINES = ["Mesin Cetak A1", "Mesin Cetak A2"];

// Status PO di Daftar PO hanya 3 macam: Proses, Siap Kirim, Selesai.
export const BUCKET_LABELS = {
  proses: "Proses",
  siap_kirim: "Siap Kirim",
  completed: "Selesai",
  delivery_failed: "Gagal Kirim",
  no_stages: "Tanpa Tahapan",
  unknown: "-",
};

export const BUCKET_META = {
  proses: { color: "#3B82F6", label: BUCKET_LABELS.proses },
  siap_kirim: { color: "#0EA5E9", label: BUCKET_LABELS.siap_kirim },
  completed: { color: "#10B981", label: BUCKET_LABELS.completed },
  delivery_failed: { color: "#EF4444", label: BUCKET_LABELS.delivery_failed },
  no_stages: { color: "#94A3B8", label: BUCKET_LABELS.no_stages },
};
