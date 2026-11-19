import DataResetPage from "@/components/DataResetPage";
import { downloadPdf } from "@/lib/api";

const stamp = () => new Date().toISOString().slice(0, 10);
const STEPS = [
  { key: "kertas", label: "PDF Mutasi Kertas", fn: () => downloadPdf("/pdf/paper-mutations", {}, `laporan-mutasi-kertas-${stamp()}.pdf`) },
  { key: "tinta", label: "PDF Mutasi Tinta", fn: () => downloadPdf("/pdf/ink-mutations", {}, `laporan-mutasi-tinta-${stamp()}.pdf`) },
  { key: "lain", label: "PDF Mutasi Lain", fn: () => downloadPdf("/pdf/other-mutations", {}, `laporan-mutasi-lain-${stamp()}.pdf`) },
  { key: "stok", label: "PDF Laporan Stok Akhir", fn: () => downloadPdf("/pdf/stock-ringkas", {}, `laporan-stok-akhir-${stamp()}.pdf`) },
];

/** Hapus Data Mutasi Stok (dulu "Tutup Tahun") — khusus Superadmin. */
export default function YearClose() {
  return (
    <DataResetPage
      testid="year-close-page" eyebrow="Mutasi Stok" title="Hapus Data Mutasi Stok"
      description={<>Menghapus <b className="text-foreground">semua</b> riwayat Mutasi Kertas, Tinta & Lain. Daftar item tetap ada
        dan sisa stok tiap item dicatat ulang sebagai mutasi masuk &quot;Saldo awal&quot;. Unduh semua PDF di bawah dulu sebagai arsip.</>}
      steps={STEPS} endpoint="/year/close"
      buttonLabel="Hapus Semua Data Mutasi Stok" dialogTitle="Hapus semua data Mutasi Stok?"
      successMessage={(d) => `${d.paper_deleted + d.ink_deleted + d.other_deleted} mutasi dihapus, ${d.paper_carried + d.ink_carried + d.other_carried} saldo awal dibuat.`}
    />
  );
}
