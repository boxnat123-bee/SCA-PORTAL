import {
  createDoc, docHeader, section, drawTable, groupTitle, summaryCards, finish, ensure, text, C,
} from "@/server/pdf/core";
import { formatNum, formatDateSlash } from "@/server/format";

const dash = (v) => (v === null || v === undefined || v === "" ? "-" : v);
const when = (m) => `${formatDateSlash(m.date)}${m.time && m.time !== "00:00" ? ` ${m.time}` : ""}`;

const ITEM_NAME = {
  paper: (m) => m.jenis_kertas || "-",
  ink: (m) => m.jenis_tinta || "-",
  other: (m) => m.nama_barang || "-",
};
const ITEM_SPEC = {
  paper: (m) => `${formatNum(m.gramatur)} gr  -  ${formatNum(m.panjang)} x ${formatNum(m.lebar)} cm`,
  ink: () => "",
  other: () => "",
};
const UNIT = { paper: (m) => m.satuan || "Rim", ink: () => "Kg", other: (m) => m.satuan || "-" };
const TITLE = { paper: "Laporan Mutasi Stok Kertas", ink: "Laporan Mutasi Stok Tinta", other: "Laporan Mutasi Stok Lain" };

/** Baris ringkas: "3 item   13 mutasi   Masuk +170   Keluar -113" + legenda warna. */
function statsLine(ctx, parts, legend = true) {
  ensure(ctx, 24);
  let x = ctx.margin;
  const y = ctx.y - 8;
  for (const p of parts) {
    ctx.page.drawText(p.label, { x, y, size: 8.5, font: ctx.font, color: C.muted });
    x += ctx.font.widthOfTextAtSize(p.label, 8.5) + 4;
    ctx.page.drawText(p.value, { x, y, size: 8.5, font: ctx.bold, color: p.color || C.text });
    x += ctx.bold.widthOfTextAtSize(p.value, 8.5) + 16;
  }
  if (legend) {
    let rx = ctx.size[0] - ctx.margin;
    for (const [lab, col] of [["Keluar", C.red], ["Masuk", C.green]]) {
      const tw = ctx.font.widthOfTextAtSize(lab, 8.5);
      rx -= tw;
      ctx.page.drawText(lab, { x: rx, y, size: 8.5, font: ctx.font, color: C.slate });
      rx -= 11;
      ctx.page.drawRectangle({ x: rx, y: y - 0.5, width: 7, height: 7, color: col });
      rx -= 14;
    }
  }
  ctx.y -= 22;
}

/**
 * PDF mutasi dikelompokkan per item: judul item (nama + spesifikasi, satuan, jumlah mutasi,
 * stok saat ini), lalu tabel mutasinya. Kolom Masuk hijau / Keluar merah.
 */
async function groupedMutationsPdf(type, rows, periodLabel, { printedBy = "", stockById = {} } = {}) {
  const ctx = await createDoc({ landscape: true });
  const groups = new Map();
  for (const m of rows) {
    const key = m.item_id || `${ITEM_NAME[type](m)}|${ITEM_SPEC[type](m)}`;
    if (!groups.has(key)) {
      groups.set(key, { id: m.item_id, name: ITEM_NAME[type](m), spec: ITEM_SPEC[type](m), unit: UNIT[type](m), rows: [] });
    }
    groups.get(key).rows.push(m);
  }
  const list = [...groups.values()].sort((a, b) => `${a.name} ${a.spec}`.localeCompare(`${b.name} ${b.spec}`, "id", { numeric: true }));
  docHeader(ctx, TITLE[type], periodLabel, { printedBy });

  const masuk = rows.filter((m) => m.jenis_transaksi === "masuk").reduce((a, m) => a + Number(m.jumlah || 0), 0);
  const keluar = rows.filter((m) => m.jenis_transaksi === "keluar").reduce((a, m) => a + Number(m.jumlah || 0), 0);
  const units = [...new Set(list.map((g) => g.unit))];
  const u = units.length === 1 ? ` ${units[0]}` : "";
  statsLine(ctx, [
    { label: "Item", value: String(list.length) },
    { label: "Mutasi", value: String(rows.length) },
    { label: "Masuk", value: `+${formatNum(masuk)}${u}`, color: C.green },
    { label: "Keluar", value: `-${formatNum(keluar)}${u}`, color: C.red },
  ]);

  const header = ["Tanggal", "Masuk", "Keluar", "Supplier", "Nama Cetakan", "PIC", "Keterangan"];
  const weights = [1.1, 0.7, 0.7, 1.9, 1.9, 0.9, 2.8];
  if (!list.length) {
    drawTable(ctx, header, [], { weights, wrap: true });
    return await finish(ctx);
  }
  for (const g of list) {
    const stockNow = g.id && stockById[g.id] !== undefined ? `  -  Stok saat ini ${formatNum(stockById[g.id])}` : "";
    const right = `Satuan ${g.unit}  -  ${g.rows.length} mutasi${stockNow}`;
    groupTitle(ctx, g.name, right, { sub: g.spec });
    const data = g.rows.map((m) => {
      const isIn = m.jenis_transaksi === "masuk";
      return [
        when(m), isIn ? formatNum(m.jumlah) : "", isIn ? "" : formatNum(m.jumlah),
        isIn ? dash(m.supplier) : "", dash(m.nama_cetakan), m.pic_name || "", dash(m.keterangan),
      ];
    });
    drawTable(ctx, header, data, {
      weights, rightCols: [1, 2], wrap: true, boldCols: [1, 2], fontSize: 8,
      colColors: { 1: C.green, 2: C.red },
      onPageBreak: () => groupTitle(ctx, `${g.name} (lanjutan)`, right, { minSpace: 0, sub: g.spec }),
    });
    ctx.y -= 2;
  }
  return await finish(ctx);
}

export const paperMutationsPdf = (rows, periodLabel, opts) => groupedMutationsPdf("paper", rows, periodLabel, opts);
export const inkMutationsPdf = (rows, periodLabel, opts) => groupedMutationsPdf("ink", rows, periodLabel, opts);
export const otherMutationsPdf = (rows, periodLabel, opts) => groupedMutationsPdf("other", rows, periodLabel, opts);

export async function stockSummaryPdf(stock, periodLabel, { printedBy = "" } = {}) {
  const ctx = await createDoc();
  docHeader(ctx, "Laporan Stok Akhir", periodLabel, { printedBy, periodName: "Posisi stok" });
  const paper = stock.paper || [], ink = stock.ink || [], other = stock.other || [];
  const rim = paper.filter((p) => String(p.satuan || "Rim").toLowerCase() === "rim").reduce((a, p) => a + Math.max(0, Number(p.stock) || 0), 0);
  const kg = ink.reduce((a, p) => a + Math.max(0, Number(p.stock) || 0), 0);
  summaryCards(ctx, [
    { label: "Kertas", value: `${paper.length} item  -  ${formatNum(rim)} Rim` },
    { label: "Tinta", value: `${ink.length} item  -  ${formatNum(kg)} Kg` },
    { label: "Barang lain", value: `${other.length} item` },
  ]);
  const rowsOf = (list, nameFn) => list.map((x) => [
    nameFn(x), x.satuan || "-", (x.suppliers || []).join(", ") || "-", formatNum(x.stock), dash(x.keterangan),
  ]);
  const hdr = (first) => [first, "Satuan", "Supplier", "Stok", "Keterangan"];
  const opt = {
    weights: [2.3, 0.75, 2.1, 0.75, 1.9], rightCols: [3], wrap: true, boldCols: [3], fontSize: 8.5,
    colColors: { 3: (v) => (Number(String(v).replace(/\./g, "").replace(",", ".")) <= 0 ? C.red : C.text) },
  };

  section(ctx, "Stok Kertas");
  drawTable(ctx, hdr("Jenis Kertas (Gram, Ukuran)"), rowsOf(paper,
    (p) => `${p.jenis_kertas}  ${formatNum(p.gramatur)} gr - ${formatNum(p.panjang)} x ${formatNum(p.lebar)}`), opt);
  section(ctx, "Stok Tinta");
  drawTable(ctx, hdr("Jenis Tinta"), rowsOf(ink, (i) => i.jenis_tinta), opt);
  section(ctx, "Stok Lain");
  drawTable(ctx, hdr("Nama Barang"), rowsOf(other, (o) => o.nama_barang), opt);

  // Kolom tanda tangan
  ensure(ctx, 120);
  ctx.y -= 12;
  text(ctx, "Angka merah = stok habis. Supplier diambil dari seluruh mutasi masuk item.", { size: 7.5, color: C.muted });
  ctx.y -= 22;
  const right = ctx.size[0] - ctx.margin;
  const boxW = 120, gap = 30;
  [["Dibuat oleh,", "Admin Gudang"], ["Diperiksa oleh,", "Pimpinan"]].forEach(([a, b], i) => {
    const x = right - (2 - i) * boxW - (1 - i) * gap;
    ctx.page.drawText(a, { x, y: ctx.y, size: 8, font: ctx.font, color: C.muted });
    ctx.page.drawLine({ start: { x, y: ctx.y - 48 }, end: { x: x + boxW, y: ctx.y - 48 }, thickness: 0.8, color: C.text });
    ctx.page.drawText(b, { x, y: ctx.y - 59, size: 8, font: ctx.font, color: C.text });
  });
  ctx.y -= 70;
  return await finish(ctx);
}
