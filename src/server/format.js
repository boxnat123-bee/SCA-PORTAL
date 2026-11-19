export const ID_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatRp(n) {
  const v = Math.round(Number(n || 0));
  return "Rp " + v.toLocaleString("de-DE");
}

export function formatNum(n) {
  const v = Number(n || 0);
  if (Number.isInteger(v)) return v.toLocaleString("de-DE");
  return v.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export function formatDateId(iso) {
  if (!iso) return "-";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  return `${d} ${ID_MONTHS[m - 1]} ${y}`;
}

/** "2026-10-01" → "01/10/2026" (ringkas untuk tabel PDF). */
export function formatDateSlash(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ? String(iso) : "-");
}

