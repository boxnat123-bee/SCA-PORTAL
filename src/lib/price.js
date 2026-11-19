// Teks harga item stok — dipakai di web (Mutasi, Laporan Stok) dan PDF Laporan Stok Akhir.
const rp = (v) => `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(v) || 0)}`;

export function priceText(it, sep = " · ") {
  if (it?.harga === null || it?.harga === undefined || it?.harga === "") return "";
  const basis = it.harga_mode === "total" ? "total kiriman"
    : it.harga_mode === "per_kg" ? "per Kg"
    : it.harga_mode === "custom" ? (it.harga_label || "custom")
    : `per ${it.satuan || "satuan"}`;
  return `${rp(it.harga)} ${basis}${it.ppn_ada ? `${sep}PPN ${rp(it.ppn_nominal)}` : ""}`;
}
