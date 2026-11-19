import DataResetPage from "@/components/DataResetPage";
import { exportInvoicesPdf, exportTempoReportPdf } from "@/lib/tempoApi";

const STEPS = [
  { key: "invoice", label: "PDF Jatuh Tempo Klien (semua invoice)", fn: () => exportInvoicesPdf({}) },
  { key: "laporan", label: "PDF Laporan Jatuh Tempo", fn: () => exportTempoReportPdf({}) },
];

/** Hapus Data Keuangan — hanya data Jatuh Tempo Klien & Laporan Jatuh Tempo (khusus Superadmin). */
export default function KeuanganReset() {
  return (
    <DataResetPage
      testid="keuangan-reset-page" eyebrow="Keuangan" title="Hapus Data Keuangan"
      description={<>Menghapus <b className="text-foreground">semua</b> invoice Jatuh Tempo Klien beserta cicilannya, sehingga
        Laporan Jatuh Tempo ikut kosong. Data Kalkulator HPP tidak terhapus. Unduh semua PDF di bawah dulu sebagai arsip.</>}
      steps={STEPS} endpoint="/tempo/reset"
      buttonLabel="Hapus Semua Data Keuangan" dialogTitle="Hapus semua data Keuangan?"
      successMessage={(d) => `Data Keuangan dihapus: ${d.deleted} invoice.`}
    />
  );
}
