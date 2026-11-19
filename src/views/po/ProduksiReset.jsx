import DataResetPage from "@/components/DataResetPage";
import { exportPoRekapPdf } from "@/lib/poApi";
import { exportKlienStokPdf, exportKlienRiwayatPdf } from "@/lib/klienApi";

const STEPS = [
  { key: "po", label: "PDF Rekap Daftar PO (semua PO)", fn: () => exportPoRekapPdf({}) },
  { key: "stok", label: "PDF Stok Klien", fn: () => exportKlienStokPdf("semua") },
  { key: "riwayat", label: "PDF Riwayat Mutasi Klien", fn: () => exportKlienRiwayatPdf({}) },
];

/** Hapus semua data bagian Produksi (khusus Superadmin). */
export default function ProduksiReset() {
  return (
    <DataResetPage
      testid="produksi-reset-page" eyebrow="Produksi" title="Hapus Data Produksi"
      description={<>Menghapus <b className="text-foreground">semua</b> data Daftar PO, jadwal Kalender Produksi, file lampiran PO,
        dan seluruh Stok Klien (klien, PO, item, riwayat mutasi). Unduh semua PDF di bawah dulu sebagai arsip.</>}
      steps={STEPS} endpoint="/po/reset"
      buttonLabel="Hapus Semua Data Produksi" dialogTitle="Hapus semua data Produksi?"
      successMessage={(d) => `Data Produksi dihapus: ${d.po} PO, ${d.klien} klien, ${d.mutasi_klien} mutasi klien.`}
    />
  );
}
