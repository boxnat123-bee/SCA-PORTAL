// Teks harga item stok, cth "Rp 30.000/Kg" — dipakai di web (Mutasi, Laporan Stok) dan PDF Laporan Stok Akhir.
const rp = (v) => `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(v) || 0)}`;

export function priceText(it) {
  if (it?.harga === null || it?.harga === undefined || it?.harga === "") return "";
  const basis = it.harga_mode === "total" ? " total kiriman"
    : it.harga_mode === "per_kg" ? "/Kg"
    : it.harga_mode === "custom" ? `/${String(it.harga_label || "custom").replace(/^per\s+/i, "")}`
    : `/${it.satuan || "satuan"}`;
  return `${rp(it.harga)}${basis}${it.ppn_ada ? ` · PPN ${rp(it.ppn_nominal)}` : ""}`;
}
