// Rentang grafik Mutasi di Beranda: minimal 1 bulan, maksimal 12 bulan (dipakai web & server).
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

/** Tanggal `s` digeser n bulan, dikurangi 1 hari (1 Jan + 1 bulan → 31 Jan). */
function addMonthsMinusDay(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(y, m - 1 + n, d - 1);
  // 31 Jan + 1 bulan: pakai akhir bulan bila tanggal melewati bulan target
  const last = new Date(y, m - 1 + n + 1, 0);
  return ymd(t > last ? last : t);
}

/** Default: awal bulan, 5 bulan lalu → hari ini (6 bulan). */
export function defaultTrendRange(now = new Date()) {
  return { start: ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1)), end: ymd(now) };
}

/** Pesan galat (string) bila rentang tidak valid, atau "" bila valid. */
export function trendRangeError(start, end) {
  if (!isYmd(start) || !isYmd(end)) return "Isi tanggal awal dan akhir.";
  if (end < start) return "Tanggal akhir harus setelah tanggal awal.";
  if (end < addMonthsMinusDay(start, 1)) return "Rentang minimal 1 bulan.";
  if (end > addMonthsMinusDay(start, 12)) return "Rentang maksimal 12 bulan.";
  return "";
}
