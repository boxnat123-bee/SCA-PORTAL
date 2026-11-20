/**
 * Tombol Tab di kolom tanggal/jam: browser (Chrome/Edge) memindahkan Tab ke bagian hari → bulan → tahun
 * dulu, jadi perlu 3x Tab. Di sini Tab langsung pindah ke kolom berikutnya (Shift+Tab ke sebelumnya).
 * Angka tanggal tetap bisa diketik biasa — bagian hari/bulan/tahun maju otomatis.
 */
const DATE_TYPES = new Set(["date", "time", "datetime-local", "month", "week"]);
const FOCUSABLE = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function onKeyDown(e) {
  const el = e.target;
  if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
  if (!(el instanceof HTMLInputElement) || !DATE_TYPES.has(el.type)) return;
  const scope = el.closest('[role="dialog"], [role="alertdialog"]') || document;
  const list = [...scope.querySelectorAll(FOCUSABLE)].filter((n) => n.tabIndex >= 0 && n.getClientRects().length > 0);
  const next = list[list.indexOf(el) + (e.shiftKey ? -1 : 1)];
  if (!next) return; // di ujung: biarkan browser/dialog yang menangani
  e.preventDefault();
  next.focus();
}

let installed = false;
export function installTabFix() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("keydown", onKeyDown, true);
}
