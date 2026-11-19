import { forwardRef, useLayoutEffect, useRef } from "react";

/**
 * Input nominal uang dengan titik ribuan otomatis saat mengetik (format Indonesia).
 *   ketik 1500000   → tampil 1.500.000
 *   koma = desimal  → 1.500,5
 * Nilai yang dikirim ke onChange: string angka polos ("1500000" / "1500.5"), aman untuk n()/Number().
 */

/** Teks ketikan → angka polos. Titik diabaikan (pemisah ribuan), koma = desimal. */
export function toPlain(text) {
  const s = String(text ?? "").replace(/[^\d,.-]/g, "");
  const neg = s.trim().startsWith("-");
  const [intRaw, ...rest] = s.replace(/-/g, "").replace(/\./g, "").split(",");
  const int = intRaw.replace(/^0+(?=\d)/, "");
  const hasDec = rest.length > 0;
  const dec = rest.join("").slice(0, 4);
  if (!int && !hasDec) return neg ? "-" : "";
  return `${neg ? "-" : ""}${int || "0"}${hasDec ? `.${dec}` : ""}`;
}

/** Angka polos → tampilan Indonesia (1.500.000,5). */
export function toDisplay(plain) {
  if (plain === null || plain === undefined || plain === "") return "";
  let s = String(plain);
  if (typeof plain === "number") s = Number.isFinite(plain) ? String(plain) : "";
  const neg = s.startsWith("-");
  const body = s.replace(/^-/, "");
  // Nilai lama yang tersimpan dengan koma desimal ("15,5") tetap dibaca benar.
  const [int, dec] = body.includes(".") ? body.split(".") : body.split(",");
  const grouped = (int || "").replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}${grouped}${dec !== undefined ? `,${dec}` : ""}`;
}

/** Kelas tampilan sama dengan komponen Input (shadcn) — pakai: <MoneyInput className={INPUT_CLS} … /> */
export const INPUT_CLS = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-soft transition-[color,background-color,border-color,box-shadow] duration-200 ease-out placeholder:text-muted-foreground/70 hover:border-border focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const MoneyInput = forwardRef(function MoneyInput({ value, onChange, className = "", ...rest }, outerRef) {
  const ref = useRef(null);
  const caret = useRef(null);
  const display = toDisplay(value);

  // Pertahankan posisi kursor setelah titik ditambahkan/dihapus.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current === null || document.activeElement !== el) return;
    const want = caret.current;
    let count = 0, pos = 0;
    while (pos < display.length && count < want) {
      if (/[\d,-]/.test(display[pos])) count++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [display]);

  const setRefs = (el) => {
    ref.current = el;
    if (typeof outerRef === "function") outerRef(el);
    else if (outerRef) outerRef.current = el;
  };

  return (
    <input
      ref={setRefs}
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={display}
      onChange={(e) => {
        const t = e.target.value;
        const before = t.slice(0, e.target.selectionStart ?? t.length);
        caret.current = (before.match(/[\d,-]/g) || []).length;
        onChange(toPlain(t));
      }}
      {...rest}
    />
  );
});

export default MoneyInput;
