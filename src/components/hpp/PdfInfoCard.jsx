/**
 * Data yang hanya dipakai di PDF HPP: info order, kotak Catatan (2 kolom) dan gambar Susunan Kertas.
 * Disimpan di state.pdfInfo (ikut tersimpan bersama perhitungan); Customer & Nama Produk di meta.
 */
const INPUT = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

function F({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}{hint && <span className="font-normal"> · {hint}</span>}</span>
      {children}
    </label>
  );
}

const Group = ({ title, desc, children }) => (
  <div className="border-t border-border pt-4">
    <div className="text-sm font-semibold">{title}</div>
    {desc && <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{desc}</p>}
    {children}
  </div>
);

export default function PdfInfoCard({ meta, setMeta, info, setInfo }) {
  const txt = (key, placeholder) => (
    <input className={INPUT} value={info[key] || ""} placeholder={placeholder} onChange={(e) => setInfo(key, e.target.value)} data-testid={`pdf-${key}`} />
  );
  const numIn = (key, placeholder) => (
    <input className={INPUT} inputMode="decimal" value={info[key] || ""} placeholder={placeholder}
      onChange={(e) => setInfo(key, e.target.value.replace(/[^\d.,]/g, ""))} data-testid={`pdf-${key}`} />
  );

  return (
    <div className="mb-4 space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-soft md:p-5" data-testid="hpp-pdf-info">
      <div>
        <div className="text-sm font-semibold">Data untuk PDF</div>
        <p className="mt-0.5 text-xs text-muted-foreground">Yang kosong tidak ditampilkan di PDF. Tanggal kalkulasi terisi otomatis.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <F label="Customer"><input className={INPUT} value={meta.customer || ""} placeholder="cth: Sei'Indonesia"
          onChange={(e) => setMeta((m) => ({ ...m, customer: e.target.value }))} data-testid="pdf-customer" /></F>
        <F label="Nama Produk"><input className={INPUT} value={meta.name || ""} placeholder="cth: Innerbox (34,3 x 35,7 cm)"
          onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} data-testid="pdf-name" /></F>
        <F label="Kuantiti Order">{txt("qtyOrder", "cth: 100.000 Pcs")}</F>
      </div>

      <Group title="Kotak Catatan" desc="Kiri = informasi ukuran, kanan = warna & kebutuhan kertas.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <F label="Ukuran Kertas Plano">{txt("ukPlano", "cth: 79 x 109 cm (6 up)")}</F>
            <F label="Uk Lembar Kertas">{txt("ukLembar", "cth: 79 x 36,3 cm (2 up / lembar)")}</F>
            <F label="Uk Kres Cetak">{txt("ukKresCetak", "cth: 72,6 x 34,3 cm")}</F>
            <F label="Uk Single Face" hint="tampil hanya bila Single Face dipakai">{txt("ukSingleFace", "cth: 74,3 x 36 cm")}</F>
          </div>
          <div className="space-y-3">
            <F label="Warna">{txt("warna", "cth: 2 Warna (Hitam + Merah)")}</F>
            <F label="Kebutuhan Kertas Plano">{txt("kebutuhanPlano", "cth: 17.250 lbr (Waste 3,5%)")}</F>
            <F label="Beli Kertas">{txt("beliKertas", "cth: 34,5 rim = 4.233 kg (4,23 ton)")}</F>
            <F label="Total Hasil Jadi">{txt("totalHasil", "cth: 103.500 Pcs")}</F>
          </div>
        </div>
        <F label="Catatan tambahan" hint="opsional, di bawah kedua kolom" className="mt-3">
          <textarea rows={2} value={meta.notes || ""} onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
            placeholder="cth: Harga berlaku 14 hari." data-testid="pdf-notes"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
        </F>
      </Group>

      <Group title="Gambar Susunan Kertas" desc="Plano digambar mendatar (sisi panjang di atas). Isi semua angka agar gambar muncul di PDF.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <F label="Plano P (cm)">{numIn("planoP", "79")}</F>
          <F label="Plano L (cm)">{numIn("planoL", "109")}</F>
          <F label="Produk mendatar (cm)">{numIn("produkP", "34,3")}</F>
          <F label="Produk menurun (cm)">{numIn("produkL", "35,7")}</F>
          <F label="Jumlah kolom (up)">{numIn("kolom", "3")}</F>
          <F label="Jumlah baris (up)">{numIn("baris", "2")}</F>
          <F label="Lembar per plano">{numIn("lembar", "3")}</F>
          <F label="Arah potongan lembar">
            <select className={INPUT} value={info.arahPotong || "tegak"} onChange={(e) => setInfo("arahPotong", e.target.value)} data-testid="pdf-arahPotong">
              <option value="tegak">Tegak (│)</option>
              <option value="mendatar">Mendatar (─)</option>
            </select>
          </F>
          <F label="Digandeng" hint="opsional">{numIn("gandeng", "cth: 2")}</F>
        </div>
      </Group>
    </div>
  );
}
