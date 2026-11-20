/** PDF Jatuh Tempo Klien — pdf-lib via core.js (konsisten dengan modul lain). */
import {
  createDoc, docHeader, section, drawTable, text, barChart, C, finish, newPage, summaryCards,
} from "@/server/pdf/core";

const rp = (v) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDate = (iso) => {
  if (!iso) return "-";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
};

/** Rincian cicilan per baris: "Ke-1  01/10/2026  Rp 5.000.000". */
function cicilanText(inv) {
  if (inv.top !== "Cicilan") return "-";
  const list = [...(inv.installments || [])]
    .filter((c) => Number(c.amount) > 0 || c.date)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  if (!list.length) return "Belum ada pembayaran";
  return list.map((c) => `Ke-${c.sequence}  ${fmtDate(c.date)}  ${rp(c.amount)}`).join("\n");
}

const STATUS_LABEL = (s) => (s === "lunas" ? "Lunas" : "Belum Lunas");

/** Selisih hari antara dua tanggal YYYY-MM-DD (b - a). */
function daysBetween(a, b) {
  const x = Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`);
  const y = Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return Math.round((y - x) / 86400000);
}
const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Tanggal pelunasan: cicilan = tanggal cicilan terakhir; lainnya = Tanggal Lunas yang diisi. */
function paidOn(inv) {
  if (inv.status !== "lunas") return null;
  if (inv.top === "Cicilan") {
    const dates = (inv.installments || []).map((c) => c.date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }
  return inv.paid_date || null;
}

/** Rekap seluruh invoice (dipakai juga sebagai backup wajib sebelum hapus semua). */
export async function buildInvoicesPdf({ invoices, periodLabel, printedBy = "" }) {
  const ctx = await createDoc({ landscape: true });
  docHeader(ctx, "Laporan Jatuh Tempo Klien", periodLabel || "Seluruh data invoice", { printedBy });

  const list = invoices || [];
  const totalNilai = list.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const totalBayar = list.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
  const totalSisa = list.reduce((s, i) => s + (Number(i.remaining_amount) || 0), 0);

  summaryCards(ctx, [
    { label: "Jumlah invoice", value: String(list.length) },
    { label: "Total nilai", value: rp(totalNilai) },
    { label: "Terbayar", value: rp(totalBayar), color: C.green },
    { label: "Sisa tagihan", value: rp(totalSisa), color: C.red },
  ]);

  section(ctx, "Daftar Invoice");
  const pair = (no, date) => `${no || "-"}\n${fmtDate(date)}`;
  const nominal = (i) => (i.nominal_amount ?? i.total_amount);
  const rows = list.map((i, idx) => [
    String(idx + 1),
    i.client_name || "-",
    i.top || "-",
    pair(i.po_number, i.po_date),
    pair(i.delivery_note_number, i.delivery_note_date),
    pair(i.invoice_number, i.invoice_date),
    rp(nominal(i)),
    Number(i.ppn_amount) ? rp(i.ppn_amount) : "-",
    fmtDate(i.due_date),
    rp(i.total_amount),
    rp(i.remaining_amount),
    STATUS_LABEL(i.status),
  ]);

  if (rows.length === 0) {
    text(ctx, "Belum ada invoice.", { size: 9, color: C.sub });
    ctx.y -= 14;
  } else {
    const totalNominal = list.reduce((s, i) => s + (Number(nominal(i)) || 0), 0);
    const totalPpn = list.reduce((s, i) => s + (Number(i.ppn_amount) || 0), 0);
    drawTable(
      ctx,
      ["No", "Nama Klien", "TOP", "PO", "Surat Jalan", "Invoice", "Nominal", "PPN", "Jatuh Tempo", "Total", "Sisa", "Status"],
      rows,
      {
        weights: [0.4, 1.75, 0.8, 1.2, 1.2, 1.2, 1.25, 1.1, 0.95, 1.3, 1.3, 1.1],
        rightCols: [6, 7, 9, 10], fontSize: 7.5, wrap: true, pairCols: [3, 4, 5],
        boldCols: [1, 9, 11],
        colColors: { 10: C.red, 11: (v) => (v === "Lunas" ? C.green : C.red) },
        footRow: ["", "TOTAL", "", "", "", "", rp(totalNominal), rp(totalPpn), "", rp(totalNilai), rp(totalSisa), ""],
      },
    );

    // Rincian invoice cicilan (Terbayar & riwayat) dipisah agar tabel utama tetap lega.
    const cicilan = list.filter((i) => i.top === "Cicilan");
    if (cicilan.length) {
      section(ctx, "Rincian Pembayaran Cicilan");
      drawTable(
        ctx,
        ["Nama Klien", "No. Invoice", "Total", "Terbayar", "Sisa", "Pembayaran Cicilan"],
        cicilan.map((i) => [i.client_name || "-", i.invoice_number || "-", rp(i.total_amount), rp(i.paid_amount), rp(i.remaining_amount), cicilanText(i)]),
        { weights: [1.8, 1.2, 1.2, 1.2, 1.2, 3], rightCols: [2, 3, 4], fontSize: 7.5, wrap: true, boldCols: [0], colColors: { 3: C.green, 4: C.red } },
      );
    }
  }

  // ---------- Halaman akhir: klien terlambat bayar ----------
  const today = todayWib();
  const paidLate = list
    .map((i) => ({ i, paid: paidOn(i) }))
    .filter(({ i, paid }) => i.due_date && paid && daysBetween(i.due_date, paid) > 0)
    .map(({ i, paid }) => ({ i, paid, late: daysBetween(i.due_date, paid) }))
    .sort((a, b) => b.late - a.late);
  const unpaidLate = list
    .filter((i) => i.status !== "lunas" && i.due_date && daysBetween(i.due_date, today) > 0)
    .map((i) => ({ i, late: daysBetween(i.due_date, today) }))
    .sort((a, b) => b.late - a.late);
  const noPaidDate = list.filter((i) => i.status === "lunas" && i.top !== "Cicilan" && !i.paid_date).length;

  newPage(ctx);
  section(ctx, "Klien Terlambat Bayar");
  text(ctx, `Dihitung dari tanggal jatuh tempo. Posisi per ${fmtDate(today)}.`, { size: 8, color: C.muted });
  ctx.y -= 14;

  section(ctx, `Lunas tapi telat (${paidLate.length})`);
  drawTable(ctx,
    ["No", "Nama Klien", "No. Invoice", "TOP", "Jatuh Tempo", "Tanggal Lunas", "Total", "Telat"],
    paidLate.map(({ i, paid, late }, idx) => [
      String(idx + 1), i.client_name || "-", i.invoice_number || "-", i.top || "-",
      fmtDate(i.due_date), fmtDate(paid), rp(i.total_amount), `${late} hari`,
    ]),
    { weights: [0.45, 2.4, 1.5, 1, 1.2, 1.2, 1.5, 1], rightCols: [6, 7], fontSize: 8, wrap: true, boldCols: [1, 7], colColors: { 7: C.red } });

  section(ctx, `Telat & belum bayar (${unpaidLate.length})`);
  drawTable(ctx,
    ["No", "Nama Klien", "No. Invoice", "TOP", "Jatuh Tempo", "Sisa Tagihan", "Telat s/d hari ini"],
    unpaidLate.map(({ i, late }, idx) => [
      String(idx + 1), i.client_name || "-", i.invoice_number || "-", i.top || "-",
      fmtDate(i.due_date), rp(i.remaining_amount), `${late} hari`,
    ]),
    {
      weights: [0.45, 2.4, 1.5, 1, 1.2, 1.5, 1.3], rightCols: [5, 6], fontSize: 8, wrap: true, boldCols: [1, 6], colColors: { 6: C.red },
      footRow: unpaidLate.length ? ["", "TOTAL", "", "", "", rp(unpaidLate.reduce((s, x) => s + (Number(x.i.remaining_amount) || 0), 0)), ""] : null,
    });

  if (noPaidDate) {
    text(ctx, `Catatan: ${noPaidDate} invoice lunas (non-cicilan) belum diisi Tanggal Lunas, jadi tidak ikut dihitung.`, { size: 7.5, color: C.muted });
    ctx.y -= 12;
  }

  return finish(ctx);
}

/** Detail 1 invoice + riwayat cicilan. */
export async function buildInvoiceDetailPdf({ invoice }) {
  const ctx = await createDoc();
  const inv = invoice || {};
  docHeader(ctx, "Detail Invoice Klien", inv.invoice_number ? `No. ${inv.invoice_number}` : (inv.client_name || "-"));

  section(ctx, "Informasi Invoice");
  drawTable(
    ctx,
    ["Keterangan", "Nilai"],
    [
      ["Nama Klien", inv.client_name || "-"],
      ["TOP / Sistem Pembayaran", inv.top || "-"],
      ["No. PO", inv.po_number || "-"],
      ["Tanggal PO", fmtDate(inv.po_date)],
      ["No. Surat Jalan", inv.delivery_note_number || "-"],
      ["Tanggal Surat Jalan", fmtDate(inv.delivery_note_date)],
      ["No. Invoice", inv.invoice_number || "-"],
      ["Tanggal Invoice", fmtDate(inv.invoice_date)],
      ["Nominal", rp(inv.nominal_amount ?? inv.total_amount)],
      ["PPN", Number(inv.ppn_amount) ? rp(inv.ppn_amount) : "-"],
      ["Tanggal Jatuh Tempo", fmtDate(inv.due_date)],
      ["Total Tagihan", rp(inv.total_amount)],
      ["Terbayar", rp(inv.paid_amount)],
      ["Sisa Tagihan", rp(inv.remaining_amount)],
      ["Status", STATUS_LABEL(inv.status)],
    ],
    { weights: [1.4, 1.6], rightCols: [1], fontSize: 9 },
  );

  const installments = [...(inv.installments || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  if (inv.top === "Cicilan") {
    section(ctx, "Riwayat Cicilan");
    if (installments.length === 0) {
      text(ctx, "Belum ada pembayaran cicilan.", { size: 9, color: C.sub });
      ctx.y -= 14;
    } else {
      drawTable(
        ctx,
        ["Cicilan ke-", "Tanggal", "Nominal"],
        installments.map((c) => [String(c.sequence), fmtDate(c.date), rp(c.amount)]),
        { weights: [1, 1.2, 1.4], rightCols: [2], fontSize: 9 },
      );
    }
  }

  return finish(ctx);
}

/** Laporan keuangan: ringkasan + omset bulanan + rincian per klien. */
export async function buildTempoReportPdf({ summary, breakdown, monthly, year, periodLabel }) {
  const ctx = await createDoc();
  docHeader(ctx, "Laporan Keuangan Jatuh Tempo Klien", periodLabel || `Tahun ${year}`);

  const s = summary || {};
  section(ctx, "Ringkasan");
  drawTable(
    ctx,
    ["Keterangan", "Nilai"],
    [
      ["Pemasukan Bulan Ini", rp(s.pemasukan_bulan_ini)],
      ["Total Piutang", rp(s.total_piutang)],
      ["Invoice Lunas", String(s.count_lunas ?? 0)],
      ["Invoice Belum Lunas", String(s.count_belum_lunas ?? 0)],
      ["Total Nilai Invoice", rp(s.total_nilai_invoice)],
      ["Total Terbayar", rp(s.total_terbayar)],
    ],
    { weights: [1.5, 1.5], rightCols: [1], fontSize: 9 },
  );

  const md = monthly?.data || [];
  if (md.length) {
    section(ctx, `Nilai Invoice per Bulan - ${year}`);
    barChart(ctx, {
      labels: md.map((m) => m.month),
      values: md.map((m) => m.omset),
      title: "Nilai Invoice (Rp)",
      color: C.primary,
    });
    section(ctx, `Pembayaran Diterima per Bulan - ${year}`);
    barChart(ctx, {
      labels: md.map((m) => m.month),
      values: md.map((m) => m.pembayaran),
      title: "Pembayaran Diterima (Rp)",
      color: C.emerald,
    });
  }

  const bdTable = (title, items, emptyText) => {
    section(ctx, title);
    const list = items || [];
    if (list.length === 0) {
      text(ctx, emptyText, { size: 9, color: C.sub });
      ctx.y -= 14;
      return;
    }
    drawTable(ctx, ["Klien", "Nominal"], list.map((i) => [i.client, rp(i.amount)]), {
      weights: [2, 1.2],
      rightCols: [1],
      fontSize: 9,
    });
  };

  bdTable("Pemasukan Bulan Ini - per Klien", breakdown?.pemasukan_by_client, "Belum ada pembayaran masuk bulan ini.");
  bdTable("Lunas Bulan Ini - per Klien", breakdown?.lunas_by_client, "Belum ada invoice yang lunas bulan ini.");
  bdTable("Total Piutang - per Klien", breakdown?.piutang_by_client, "Tidak ada piutang berjalan.");

  return finish(ctx);
}
