import { createDoc, docHeader, section, drawTable, finish } from "@/server/pdf/core";
import { formatNum, formatDateSlash } from "@/server/format";

const dash = (v) => (v === null || v === undefined || v === "" ? "-" : v);
const when = (m) => `${formatDateSlash(m.date)}${m.time && m.time !== "00:00" ? ` ${m.time}` : ""}`;
/** Jumlah bertanda: + masuk, - keluar (pengganti kolom Transaksi). */
const signed = (m) => `${m.jenis_transaksi === "masuk" ? "+" : "-"}${formatNum(m.jumlah)}`;
const LEGEND = "Jumlah: + = masuk, - = keluar";

function totalsRow(rows, cols, labelIdx, qtyIdx) {
  const masuk = rows.filter((m) => m.jenis_transaksi === "masuk").reduce((a, m) => a + Number(m.jumlah || 0), 0);
  const keluar = rows.filter((m) => m.jenis_transaksi === "keluar").reduce((a, m) => a + Number(m.jumlah || 0), 0);
  const r = Array(cols).fill("");
  r[labelIdx] = `TOTAL  masuk ${formatNum(masuk)} / keluar ${formatNum(keluar)}`;
  r[qtyIdx] = formatNum(masuk - keluar);
  return r;
}

export async function paperMutationsPdf(rows, periodLabel) {
  const ctx = await createDoc({ landscape: true });
  docHeader(ctx, "Laporan Mutasi Stok Kertas", `${periodLabel}   |   ${LEGEND}`);
  const header = ["Tanggal", "Jenis Kertas", "Gram", "Ukuran", "Satuan", "Jumlah",
    "Supplier", "Nama Cetakan", "PIC", "Keterangan"];
  const weights = [1.05, 1.5, 0.55, 0.85, 0.7, 0.8, 1.5, 1.5, 1, 2];
  const data = rows.map((m) => [
    when(m), m.jenis_kertas || "", formatNum(m.gramatur), `${formatNum(m.panjang)}x${formatNum(m.lebar)}`,
    m.satuan || "Rim", signed(m), dash(m.supplier), dash(m.nama_cetakan), m.pic_name || "", dash(m.keterangan),
  ]);
  if (rows.length) data.push(totalsRow(rows, header.length, 1, 5));
  drawTable(ctx, header, data, { weights, rightCols: [5], wrap: true });
  return await finish(ctx);
}

export async function inkMutationsPdf(rows, periodLabel) {
  const ctx = await createDoc({ landscape: true });
  docHeader(ctx, "Laporan Mutasi Stok Tinta", `${periodLabel}   |   ${LEGEND}`);
  const header = ["Tanggal", "Jenis Tinta", "Satuan", "Jumlah", "Supplier", "Nama Cetakan", "PIC", "Keterangan"];
  const weights = [1.05, 1.6, 0.6, 0.8, 1.6, 1.6, 1, 2.2];
  const data = rows.map((m) => [
    when(m), m.jenis_tinta || "", "Kg", signed(m), dash(m.supplier), dash(m.nama_cetakan), m.pic_name || "", dash(m.keterangan),
  ]);
  if (rows.length) data.push(totalsRow(rows, header.length, 1, 3));
  drawTable(ctx, header, data, { weights, rightCols: [3], wrap: true });
  return await finish(ctx);
}

export async function otherMutationsPdf(rows, periodLabel) {
  const ctx = await createDoc({ landscape: true });
  docHeader(ctx, "Laporan Mutasi Stok Lain", `${periodLabel}   |   ${LEGEND}`);
  const header = ["Tanggal", "Nama Barang", "Satuan", "Jumlah", "Supplier", "Nama Cetakan", "PIC", "Keterangan"];
  const weights = [1.05, 1.6, 0.7, 0.8, 1.6, 1.6, 1, 2.1];
  const data = rows.map((m) => [
    when(m), m.nama_barang || "", dash(m.satuan), signed(m), dash(m.supplier), dash(m.nama_cetakan), m.pic_name || "", dash(m.keterangan),
  ]);
  if (rows.length) data.push(totalsRow(rows, header.length, 1, 3));
  drawTable(ctx, header, data, { weights, rightCols: [3], wrap: true });
  return await finish(ctx);
}

export async function stockSummaryPdf(stock, periodLabel) {
  const ctx = await createDoc();
  docHeader(ctx, "Laporan Stok", periodLabel);
  const rowsOf = (list, nameFn) => list.map((x) => [
    nameFn(x), x.satuan || "-", formatNum(x.total_masuk), formatNum(x.total_keluar), formatNum(x.stock),
  ]);
  const hdr = (first) => [first, "Satuan", "Total Masuk", "Total Keluar", "Stok"];
  const opt = { weights: [2.6, 0.8, 1, 1, 1], rightCols: [2, 3, 4], wrap: true };

  section(ctx, "Stok Kertas");
  drawTable(ctx, hdr("Jenis Kertas (Gram, Ukuran)"), rowsOf(stock.paper || [],
    (p) => `${p.jenis_kertas} ${formatNum(p.gramatur)}gr ${formatNum(p.panjang)}x${formatNum(p.lebar)}`), opt);
  section(ctx, "Stok Tinta");
  drawTable(ctx, hdr("Jenis Tinta"), rowsOf(stock.ink || [], (i) => i.jenis_tinta), opt);
  section(ctx, "Stok Lain");
  drawTable(ctx, hdr("Nama Barang"), rowsOf(stock.other || [], (o) => o.nama_barang), opt);
  return await finish(ctx);
}
