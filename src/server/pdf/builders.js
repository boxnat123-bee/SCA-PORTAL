import { createDoc, docHeader, section, drawTable, groupTitle, finish, C } from "@/server/pdf/core";
import { formatNum, formatDateSlash } from "@/server/format";

const dash = (v) => (v === null || v === undefined || v === "" ? "-" : v);
const when = (m) => `${formatDateSlash(m.date)}${m.time && m.time !== "00:00" ? ` ${m.time}` : ""}`;

const ITEM_LABEL = {
  paper: (m) => `${m.jenis_kertas || "-"}  ${formatNum(m.gramatur)} gr  ${formatNum(m.panjang)} x ${formatNum(m.lebar)} cm`,
  ink: (m) => m.jenis_tinta || "-",
  other: (m) => m.nama_barang || "-",
};
const UNIT = { paper: (m) => m.satuan || "Rim", ink: () => "Kg", other: (m) => m.satuan || "-" };
const TITLE = { paper: "Laporan Mutasi Stok Kertas", ink: "Laporan Mutasi Stok Tinta", other: "Laporan Mutasi Stok Lain" };

/**
 * PDF mutasi dikelompokkan per item: pita judul item, lalu tabel mutasinya
 * (kolom Masuk hijau / Keluar merah terpisah supaya mudah dibaca).
 */
async function groupedMutationsPdf(type, rows, periodLabel) {
  const ctx = await createDoc({ landscape: true });
  const groups = new Map();
  for (const m of rows) {
    const key = m.item_id || ITEM_LABEL[type](m);
    if (!groups.has(key)) groups.set(key, { label: ITEM_LABEL[type](m), unit: UNIT[type](m), rows: [] });
    groups.get(key).rows.push(m);
  }
  const list = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "id", { numeric: true }));
  docHeader(ctx, TITLE[type], `${periodLabel}   |   ${list.length} item, ${rows.length} mutasi`);

  const header = ["Tanggal", "Masuk", "Keluar", "Supplier", "Nama Cetakan", "PIC", "Keterangan"];
  const weights = [1.1, 0.75, 0.75, 1.9, 1.9, 1.0, 2.6];
  if (!list.length) {
    drawTable(ctx, header, [], { weights, wrap: true });
    return await finish(ctx);
  }
  for (const g of list) {
    const title = g.label;
    const right = `Satuan: ${g.unit}  -  ${g.rows.length} mutasi`;
    groupTitle(ctx, title, right);
    const data = g.rows.map((m) => {
      const masuk = m.jenis_transaksi === "masuk";
      return [
        when(m), masuk ? formatNum(m.jumlah) : "", masuk ? "" : formatNum(m.jumlah),
        masuk ? dash(m.supplier) : "", dash(m.nama_cetakan), m.pic_name || "", dash(m.keterangan),
      ];
    });
    drawTable(ctx, header, data, {
      weights, rightCols: [1, 2], wrap: true, boldCols: [1, 2],
      colColors: { 1: C.emerald, 2: C.rose },
      onPageBreak: () => groupTitle(ctx, `${title} (lanjutan)`, right, { minSpace: 0 }),
    });
    ctx.y -= 4;
  }
  return await finish(ctx);
}

export const paperMutationsPdf = (rows, periodLabel) => groupedMutationsPdf("paper", rows, periodLabel);
export const inkMutationsPdf = (rows, periodLabel) => groupedMutationsPdf("ink", rows, periodLabel);
export const otherMutationsPdf = (rows, periodLabel) => groupedMutationsPdf("other", rows, periodLabel);

export async function stockSummaryPdf(stock, periodLabel) {
  const ctx = await createDoc();
  docHeader(ctx, "Laporan Stok Akhir", periodLabel);
  const rowsOf = (list, nameFn) => list.map((x) => [
    nameFn(x), x.satuan || "-", (x.suppliers || []).join(", ") || "-", formatNum(x.stock),
  ]);
  const hdr = (first) => [first, "Satuan", "Supplier", "Stok"];
  const opt = { weights: [2.4, 0.8, 2.4, 0.9], rightCols: [3], wrap: true };

  section(ctx, "Stok Kertas");
  drawTable(ctx, hdr("Jenis Kertas (Gram, Ukuran)"), rowsOf(stock.paper || [],
    (p) => `${p.jenis_kertas} ${formatNum(p.gramatur)}gr ${formatNum(p.panjang)}x${formatNum(p.lebar)}`), opt);
  section(ctx, "Stok Tinta");
  drawTable(ctx, hdr("Jenis Tinta"), rowsOf(stock.ink || [], (i) => i.jenis_tinta), opt);
  section(ctx, "Stok Lain");
  drawTable(ctx, hdr("Nama Barang"), rowsOf(stock.other || [], (o) => o.nama_barang), opt);
  return await finish(ctx);
}
