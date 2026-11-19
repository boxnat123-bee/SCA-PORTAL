import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { embedLogo, LOGO_RATIO } from "@/server/pdf/logo";

const A4 = [595.28, 841.89];

export const C = {
  header: rgb(0.118, 0.161, 0.231), // #1e293b
  primary: rgb(0.145, 0.388, 0.922), // #2563eb
  light: rgb(0.945, 0.961, 0.976), // #f1f5f9
  border: rgb(0.796, 0.835, 0.882), // #cbd5e1
  white: rgb(1, 1, 1),
  sub: rgb(0.392, 0.455, 0.545), // #64748b
  text: rgb(0.09, 0.11, 0.14),
  rose: rgb(0.956, 0.247, 0.369),
  sky: rgb(0.055, 0.647, 0.914),
  amber: rgb(0.961, 0.62, 0.043),
  emerald: rgb(0.02, 0.588, 0.412),
  violet: rgb(0.545, 0.361, 0.965),
  navy: rgb(0.118, 0.227, 0.541),     // #1e3a8a — warna aksen kop
  slate: rgb(0.2, 0.255, 0.333),      // #334155 — teks header tabel
  thead: rgb(0.945, 0.957, 0.976),    // #f1f4f9 — latar header tabel
  rule: rgb(0.886, 0.91, 0.941),      // #e2e8f0 — garis antar baris
  muted: rgb(0.278, 0.333, 0.412),    // #475569
  green: rgb(0.016, 0.471, 0.341),    // #047857
  red: rgb(0.725, 0.11, 0.11),        // #b91c1c
};
const FOOTER_SPACE = 22; // ruang di bawah untuk nomor halaman

export const SERIES_COLORS = [C.primary, C.rose, C.sky, C.amber, C.emerald, C.violet];

/** pdf-lib StandardFonts hanya mendukung WinAnsi — bersihkan karakter di luar itu. */
export function sanitize(input) {
  let s = String(input ?? "");
  s = s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2022\u00B7]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
  // buang sisa karakter non-latin1
  return s.replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

export async function createDoc({ landscape = false } = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("LAPORAN STOK SCA");
  pdf.setProducer("LAPORAN STOK SCA");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const size = landscape ? [A4[1], A4[0]] : [A4[0], A4[1]];
  const logo = await embedLogo(pdf);
  const ctx = { pdf, font, bold, size, margin: 34, page: null, y: 0, landscape, pageHeader: null, logo };
  newPage(ctx);
  return ctx;
}

export function newPage(ctx) {
  ctx.page = ctx.pdf.addPage(ctx.size);
  ctx.y = ctx.size[1] - ctx.margin;
  // Halaman lanjutan: kop ringkas (judul + garis) supaya tetap jelas dokumen apa.
  if (ctx.pageHeader && ctx.pdf.getPageCount() > 1) ctx.pageHeader(ctx);
}

export function contentWidth(ctx) {
  return ctx.size[0] - ctx.margin * 2;
}

export function ensure(ctx, h) {
  if (ctx.y - h < ctx.margin + FOOTER_SPACE) {
    newPage(ctx);
    return true;
  }
  return false;
}

export function text(ctx, str, { x, y, size = 9, bold = false, color = C.text } = {}) {
  const f = bold ? ctx.bold : ctx.font;
  ctx.page.drawText(sanitize(str), {
    x: x ?? ctx.margin,
    y: y ?? ctx.y,
    size,
    font: f,
    color,
  });
}

export function widthOf(ctx, str, size = 9, bold = false) {
  const f = bold ? ctx.bold : ctx.font;
  return f.widthOfTextAtSize(sanitize(str), size);
}

export function truncate(ctx, str, maxWidth, size = 8, bold = false) {
  let s = sanitize(str);
  if (widthOf(ctx, s, size, bold) <= maxWidth) return s;
  while (s.length > 1 && widthOf(ctx, s + "..", size, bold) > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "..";
}

const pad2 = (n) => String(n).padStart(2, "0");
/** Waktu cetak WIB (server berjalan di UTC). */
export function nowWibLabel() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/**
 * Kop dokumen: kotak "SCA", nama perusahaan, judul; kanan: Periode / Tanggal cetak / Dicetak oleh.
 * opts: { printedBy, periodName = "Periode" }
 */
export function docHeader(ctx, title, periodLabel, { printedBy = "", periodName = "Periode" } = {}) {
  const top = ctx.y;
  const x0 = ctx.margin;
  const box = 34;                       // tinggi logo
  const logoW = box * LOGO_RATIO;
  ctx.page.drawImage(ctx.logo, { x: x0, y: top - box, width: logoW, height: box });
  const tx = x0 + logoW + 12;
  ctx.page.drawText("PERCETAKAN SCA", { x: tx, y: top - 11, size: 7.5, font: ctx.bold, color: C.muted });
  ctx.page.drawText(sanitize(title), { x: tx, y: top - 28, size: 15, font: ctx.bold, color: C.text });

  // Meta kanan (label abu-abu, nilai tebal)
  const meta = [...(periodName ? [[periodName, periodLabel || "-"]] : []), ["Tanggal cetak", nowWibLabel()]];
  if (printedBy) meta.push(["Dicetak oleh", printedBy]);
  const right = ctx.size[0] - ctx.margin;
  const valW = Math.max(...meta.map(([, v]) => widthOf(ctx, v, 8, true)));
  const labW = Math.max(...meta.map(([l]) => widthOf(ctx, l, 8)));
  meta.forEach(([l, v], i) => {
    const y = top - 8 - i * 11;
    ctx.page.drawText(sanitize(l), { x: right - valW - 10 - labW, y, size: 8, font: ctx.font, color: C.muted });
    ctx.page.drawText(sanitize(v), { x: right - valW, y, size: 8, font: ctx.bold, color: C.text });
  });

  ctx.y = top - box - 10;
  ctx.page.drawRectangle({ x: x0, y: ctx.y - 2.2, width: contentWidth(ctx), height: 2.2, color: C.navy });
  ctx.y -= 16;

  // Halaman berikutnya: kop ringkas
  ctx.pageHeader = (c) => {
    c.page.drawText(sanitize(title), { x: c.margin, y: c.y - 10, size: 10, font: c.bold, color: C.text });
    const lh = 16, lw = lh * LOGO_RATIO;
    c.page.drawImage(c.logo, { x: c.size[0] - c.margin - lw, y: c.y - 13, width: lw, height: lh });
    c.y -= 16;
    c.page.drawRectangle({ x: c.margin, y: c.y - 1.2, width: contentWidth(c), height: 1.2, color: C.navy });
    c.y -= 12;
  };
}

/** Baris kartu ringkasan (kotak tegas, sudut lancip). cards: [{ label, value, color? }] */
export function summaryCards(ctx, cards) {
  const gap = 10;
  const h = 40;
  ensure(ctx, h + 10);
  const w = (contentWidth(ctx) - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const x = ctx.margin + i * (w + gap);
    ctx.page.drawRectangle({ x, y: ctx.y - h, width: w, height: h, borderColor: C.border, borderWidth: 0.8 });
    ctx.page.drawText(sanitize(String(c.label).toUpperCase()), { x: x + 10, y: ctx.y - 13, size: 7, font: ctx.font, color: C.muted });
    ctx.page.drawText(sanitize(c.value), { x: x + 10, y: ctx.y - 31, size: 12.5, font: ctx.bold, color: c.color || C.text });
  });
  ctx.y -= h + 14;
}

export function section(ctx, title) {
  ensure(ctx, 40);
  ctx.y -= 6;
  text(ctx, title, { size: 11, bold: true, color: C.text });
  ctx.y -= 12;
}

/**
 * Tabel dengan header berulang tiap halaman.
 * weights: array bobot lebar kolom (relatif). rightCols: index kolom rata kanan.
 */
/** Pecah teks menjadi beberapa baris agar muat di lebar kolom. */
export function wrapLines(ctx, str, maxWidth, size = 8, bold = false) {
  // Baris baru ("\n") dipertahankan sebagai baris terpisah.
  const parts = String(str ?? "").split(/\r?\n/);
  if (parts.length > 1) return parts.flatMap((part) => wrapLines(ctx, part, maxWidth, size, bold));
  const words = sanitize(String(str ?? "")).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = "";
  for (let w of words) {
    while (widthOf(ctx, w, size, bold) > maxWidth && w.length > 1) {
      let cut = w.length - 1;
      while (cut > 1 && widthOf(ctx, w.slice(0, cut), size, bold) > maxWidth) cut--;
      if (line) { lines.push(line); line = ""; }
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const t = line ? `${line} ${w}` : w;
    if (line && widthOf(ctx, t, size, bold) > maxWidth) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Tabel PDF. Default: teks yang kepanjangan dipotong (…).
 * wrap: true → teks dibungkus ke baris berikutnya & tinggi baris menyesuaikan (tidak terpotong).
 */
/**
 * Pita judul grup (mis. nama item) — latar terang dengan aksen biru di kiri.
 * right: teks kecil rata kanan (mis. satuan / jumlah mutasi).
 */
export function groupTitle(ctx, title, right = "", { minSpace = 70, sub = "" } = {}) {
  ensure(ctx, minSpace);
  const y = ctx.y - 10;
  ctx.page.drawText(sanitize(title), { x: ctx.margin + 1, y, size: 10, font: ctx.bold, color: C.text });
  if (sub) {
    const tw = ctx.bold.widthOfTextAtSize(sanitize(title), 10);
    ctx.page.drawText(sanitize(sub), { x: ctx.margin + 1 + tw + 6, y, size: 9, font: ctx.font, color: C.muted });
  }
  if (right) {
    const r = sanitize(right);
    const tw = ctx.font.widthOfTextAtSize(r, 8);
    ctx.page.drawText(r, { x: ctx.size[0] - ctx.margin - tw, y: y + 0.5, size: 8, font: ctx.font, color: C.muted });
  }
  ctx.y -= 16;
}

export function drawTable(ctx, header, rows, {
  weights, rightCols = [], fontSize = 8, wrap = false,
  colColors = {},      // { indexKolom: warna } untuk isi sel (bukan header)
  boldCols = [],       // kolom isi yang ditebalkan
  onPageBreak = null,  // dipanggil di halaman baru sebelum header diulang (mis. ulang judul grup)
  footRow = null,      // baris TOTAL (tebal, garis atas tegas)
} = {}) {
  const total = contentWidth(ctx);
  const w = weights && weights.length === header.length ? weights : header.map(() => 1);
  const sumW = w.reduce((a, b) => a + b, 0);
  const widths = w.map((x) => (x / sumW) * total);
  const baseH = fontSize + 9;
  const lineH = fontSize + 2.5;
  const pad = 4;

  const layout = (cells, isHeader) => cells.map((cell, i) => {
    const raw = cell === null || cell === undefined || cell === "" ? "" : String(cell);
    if (!wrap) return [truncate(ctx, raw, widths[i] - pad * 2, fontSize, isHeader || boldCols.includes(i))];
    return wrapLines(ctx, raw, widths[i] - pad * 2, fontSize, isHeader || boldCols.includes(i));
  });
  const heightOf = (lines) => Math.max(baseH, Math.max(...lines.map((l) => l.length)) * lineH + 6.5);

  const drawRow = (cells, { isHeader = false, isFoot = false } = {}) => {
    const lines = layout(cells, isHeader);
    const rowH = heightOf(lines);
    if (ensure(ctx, rowH) && !isHeader) {
      if (onPageBreak) onPageBreak();
      drawRow(header, { isHeader: true });
    }
    const yTop = ctx.y;
    const yBot = yTop - rowH;
    if (isHeader) {
      ctx.page.drawRectangle({ x: ctx.margin, y: yBot, width: total, height: rowH, color: C.thead });
      ctx.page.drawLine({ start: { x: ctx.margin, y: yTop }, end: { x: ctx.margin + total, y: yTop }, thickness: 0.8, color: C.border });
      ctx.page.drawLine({ start: { x: ctx.margin, y: yBot }, end: { x: ctx.margin + total, y: yBot }, thickness: 0.8, color: C.border });
    } else if (isFoot) {
      ctx.page.drawRectangle({ x: ctx.margin, y: yBot, width: total, height: rowH, color: rgb(0.973, 0.98, 0.988) });
      ctx.page.drawLine({ start: { x: ctx.margin, y: yTop }, end: { x: ctx.margin + total, y: yTop }, thickness: 1.2, color: C.text });
    } else {
      ctx.page.drawLine({ start: { x: ctx.margin, y: yBot }, end: { x: ctx.margin + total, y: yBot }, thickness: 0.6, color: C.rule });
    }
    let x = ctx.margin;
    lines.forEach((cellLines, i) => {
      const cw = widths[i];
      const raw = cells[i] === null || cells[i] === undefined ? "" : String(cells[i]);
      const colorSpec = colColors[i];
      const cellColor = isHeader ? C.slate
        : typeof colorSpec === "function" ? (colorSpec(raw) || C.text) : (colorSpec || C.text);
      cellLines.forEach((label, li) => {
        const isBold = isHeader || isFoot || boldCols.includes(i);
        const tw = widthOf(ctx, label, fontSize, isBold);
        const tx = rightCols.includes(i) ? x + cw - pad - tw : x + pad;
        const ty = wrap
          ? yTop - 4 - fontSize - li * lineH + 1.5
          : yBot + (rowH - fontSize) / 2 + 1.5;
        ctx.page.drawText(label, {
          x: tx, y: ty,
          font: isBold ? ctx.bold : ctx.font,
          size: isHeader ? fontSize - 0.5 : fontSize,
          color: cellColor,
        });
      });
      x += cw;
    });
    ctx.y = yBot;
  };

  ensure(ctx, baseH * 2);
  drawRow(header, { isHeader: true });
  const data = rows.length ? rows : [header.map(() => "-")];
  data.forEach((r) => drawRow(r));
  if (footRow) drawRow(footRow, { isFoot: true });
  ctx.y -= 10;
}

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const step = max / count;
  const mag = 10 ** Math.floor(Math.log10(step));
  const norm = step / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const s = nice * mag;
  const ticks = [];
  for (let v = 0; v <= max + s * 0.001; v += s) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + s);
  return ticks;
}

function compact(v) {
  const n = Number(v || 0);
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "M";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "jt";
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "rb";
  return String(Math.round(n * 100) / 100);
}

function plotFrame(ctx, { title, height }) {
  ensure(ctx, height + 46);
  if (title) {
    text(ctx, title, { size: 9.5, bold: true, color: C.header });
    ctx.y -= 12;
  }
  const axisLabelW = 34;
  const x0 = ctx.margin + axisLabelW;
  const plotW = contentWidth(ctx) - axisLabelW - 6;
  const yTop = ctx.y;
  const yBot = yTop - height;
  return { x0, plotW, yTop, yBot, height };
}

function drawGrid(ctx, frame, ticks) {
  const { x0, plotW, yBot, height } = frame;
  const max = ticks[ticks.length - 1] || 1;
  ticks.forEach((t) => {
    const y = yBot + (t / max) * height;
    ctx.page.drawLine({
      start: { x: x0, y }, end: { x: x0 + plotW, y },
      thickness: 0.4, color: C.border,
    });
    const lbl = compact(t);
    ctx.page.drawText(sanitize(lbl), {
      x: x0 - 4 - ctx.font.widthOfTextAtSize(lbl, 6.5),
      y: y - 2,
      size: 6.5, font: ctx.font, color: C.sub,
    });
  });
}

function drawXLabels(ctx, frame, labels) {
  const { x0, plotW, yBot } = frame;
  const step = plotW / Math.max(labels.length, 1);
  labels.forEach((l, i) => {
    const s = sanitize(String(l).slice(0, 3));
    const w = ctx.font.widthOfTextAtSize(s, 6.5);
    ctx.page.drawText(s, {
      x: x0 + step * i + step / 2 - w / 2,
      y: yBot - 10,
      size: 6.5, font: ctx.font, color: C.sub,
    });
  });
}

function drawLegend(ctx, y, items) {
  let x = ctx.margin + 34;
  items.forEach((it) => {
    ctx.page.drawRectangle({ x, y: y + 1, width: 7, height: 7, color: it.color });
    const label = sanitize(it.name);
    ctx.page.drawText(label, { x: x + 10, y: y + 1.5, size: 6.8, font: ctx.font, color: C.sub });
    x += 10 + ctx.font.widthOfTextAtSize(label, 6.8) + 14;
  });
}

export function lineChart(ctx, { labels, series, title, height = 130 }) {
  const frame = plotFrame(ctx, { title, height });
  const allVals = series.flatMap((s) => s.values.map((v) => Number(v || 0)));
  const max = Math.max(0, ...allVals);
  const ticks = niceTicks(max);
  const tmax = ticks[ticks.length - 1] || 1;
  drawGrid(ctx, frame, ticks);

  const { x0, plotW, yBot } = frame;
  const step = plotW / Math.max(labels.length, 1);
  series.forEach((s, si) => {
    const color = s.color || SERIES_COLORS[si % SERIES_COLORS.length];
    const pts = s.values.map((v, i) => ({
      x: x0 + step * i + step / 2,
      y: yBot + (Number(v || 0) / tmax) * height,
    }));
    for (let i = 1; i < pts.length; i++) {
      ctx.page.drawLine({ start: pts[i - 1], end: pts[i], thickness: 1.3, color });
    }
    pts.forEach((p) => ctx.page.drawCircle({ x: p.x, y: p.y, size: 1.8, color }));
  });

  // sumbu
  ctx.page.drawLine({ start: { x: x0, y: yBot }, end: { x: x0 + plotW, y: yBot }, thickness: 0.8, color: C.sub });
  drawXLabels(ctx, frame, labels);
  ctx.y = yBot - 22;
  drawLegend(ctx, ctx.y, series.map((s, si) => ({
    name: s.name, color: s.color || SERIES_COLORS[si % SERIES_COLORS.length],
  })));
  ctx.y -= 16;
}

export function barChart(ctx, { labels, values, title, color = C.sky, height = 120 }) {
  const frame = plotFrame(ctx, { title, height });
  const max = Math.max(0, ...values.map((v) => Number(v || 0)));
  const ticks = niceTicks(max);
  const tmax = ticks[ticks.length - 1] || 1;
  drawGrid(ctx, frame, ticks);

  const { x0, plotW, yBot } = frame;
  const step = plotW / Math.max(values.length, 1);
  const bw = Math.max(step * 0.55, 2);
  values.forEach((v, i) => {
    const h = (Number(v || 0) / tmax) * height;
    if (h <= 0) return;
    ctx.page.drawRectangle({
      x: x0 + step * i + (step - bw) / 2, y: yBot, width: bw, height: h, color,
    });
  });
  ctx.page.drawLine({ start: { x: x0, y: yBot }, end: { x: x0 + plotW, y: yBot }, thickness: 0.8, color: C.sub });
  drawXLabels(ctx, frame, labels);
  ctx.y = yBot - 24;
}

/** Komposisi nominal: stacked bar 100% + legenda persentase (pengganti pie chart). */
export function compositionBar(ctx, { title, items, formatValue }) {
  const data = items.filter((i) => Number(i.value) > 0);
  if (!data.length) return;
  const rowsNeeded = 20 + Math.ceil(data.length / 2) * 12 + 30;
  ensure(ctx, rowsNeeded);
  if (title) {
    text(ctx, title, { size: 9.5, bold: true, color: C.header });
    ctx.y -= 14;
  }
  const total = data.reduce((a, b) => a + Number(b.value), 0);
  const w = contentWidth(ctx);
  const h = 16;
  let x = ctx.margin;
  const yBot = ctx.y - h;
  data.forEach((it, i) => {
    const cw = (Number(it.value) / total) * w;
    ctx.page.drawRectangle({
      x, y: yBot, width: cw, height: h,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    });
    x += cw;
  });
  ctx.page.drawRectangle({ x: ctx.margin, y: yBot, width: w, height: h, borderColor: C.border, borderWidth: 0.5 });
  ctx.y = yBot - 14;

  // legenda 2 kolom
  const colW = w / 2;
  data.forEach((it, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) ctx.y -= 12;
    const bx = ctx.margin + col * colW;
    ctx.page.drawRectangle({
      x: bx, y: ctx.y + 1, width: 7, height: 7,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    });
    const pctVal = ((Number(it.value) / total) * 100).toFixed(1);
    const label = `${it.name} - ${formatValue ? formatValue(it.value) : it.value} (${pctVal}%)`;
    ctx.page.drawText(truncate(ctx, label, colW - 16, 7.2), {
      x: bx + 10, y: ctx.y + 1.5, size: 7.2, font: ctx.font, color: C.text,
    });
  });
  ctx.y -= 22;
}

export async function finish(ctx) {
  // Nomor halaman di kanan bawah setiap halaman.
  const pages = ctx.pdf.getPages();
  pages.forEach((pg, i) => {
    const { width: w } = pg.getSize();
    const y = ctx.margin - 4;
    pg.drawLine({ start: { x: ctx.margin, y: y + 12 }, end: { x: w - ctx.margin, y: y + 12 }, thickness: 0.6, color: C.border });
    const label = `Halaman ${i + 1} dari ${pages.length}`;
    const tw = ctx.font.widthOfTextAtSize(label, 7.5);
    pg.drawText(label, { x: w - ctx.margin - tw, y, size: 7.5, font: ctx.font, color: C.muted });
  });
  return await ctx.pdf.save();
}
