import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { embedLogo, LOGO_RATIO } from "@/server/pdf/logo";

/**
 * PDF Penawaran HPP (A4, satu produk per PDF):
 * header logo · info order · kotak Catatan 2 kolom · Rincian Komponen Biaya (hanya yang dipakai) ·
 * total (Subtotal → Bunga → Laba → PPN → Harga jual) · gambar Susunan Kertas · footer.
 */
const A4 = [595.28, 841.89];
const M = 57;                 // margin kiri/kanan
const W = A4[0] - M * 2;      // lebar isi
const NAVY = rgb(0x1f / 255, 0x3a / 255, 0x8a / 255);
const BLUE = rgb(0x2f / 255, 0x4f / 255, 0xa8 / 255);
const GRAY = rgb(0x6b / 255, 0x72 / 255, 0x80 / 255);
const TEXT = rgb(0.07, 0.07, 0.09);
const RULE = rgb(0.85, 0.87, 0.9);
const BOX_BG = rgb(0.953, 0.957, 0.965);
const PLANO_BG = rgb(0.925, 0.937, 0.965);
const WHITE = rgb(1, 1, 1);

const num = (v, d = 1) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(Number(v) || 0);
const rp = (v) => `${Number(v) < 0 ? "- " : ""}Rp ${num(Math.abs(Number(v) || 0))}`;
const clean = (t) => String(t ?? "").replace(/[^\n\x20-\x7E -ÿ]/g, (ch) => (
  { "×": "x", "÷": ":", "–": "-", "—": "-", "→": "->", "’": "'", "‘": "'", "“": '"', "”": '"', "•": "-" }[ch] ?? "?"));
const dec = (v) => Number(String(v ?? "").replace(",", ".")) || 0;

function wrap(font, text, size, maxW) {
  const out = [];
  for (const para of clean(text).split(/\r?\n/)) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out.filter((l, i, a) => l || a.length === 1);
}

function tanggalId(d = new Date()) {
  return new Date(d.getTime() + 7 * 3600e3).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export async function buildHppPdf({ name, customer, notes, company, result, info = {} }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  let page = doc.addPage(A4);
  let y = A4[1] - 58;

  const text = (t, x, yy, { f = font, size = 10, color = TEXT } = {}) => page.drawText(clean(t), { x, y: yy, font: f, size, color });
  const right = (t, xr, yy, opt = {}) => text(t, xr - (opt.f || font).widthOfTextAtSize(clean(t), opt.size || 10), yy, opt);
  const newPage = () => { page = doc.addPage(A4); y = A4[1] - 58; };
  const ensure = (h, bottom = 60) => { if (y - h < bottom) { newPage(); return true; } return false; };

  // ---------- 1. Header ----------
  const logo = await embedLogo(doc);
  const logoH = 42, logoW = logoH * LOGO_RATIO;
  page.drawImage(logo, { x: M, y: y - logoH + 12, width: logoW, height: logoH });
  const tx = M + logoW + 16;
  text(company || "Percetakan SCA", tx, y - 8, { f: bold, size: 22, color: NAVY });
  text("Penawaran Harga Pokok Produksi (HPP)", tx, y - 25, { size: 10, color: GRAY });
  y -= 70;

  // ---------- 2. Info order ----------
  [
    ["Customer", customer || "-"],
    ["Nama Produk", name || "-"],
    ["Kuantiti Order", info.qtyOrder || "-"],
    ["Tanggal Kalkulasi", tanggalId()],
  ].forEach(([k, v]) => {
    text(k, M, y, { size: 10, color: GRAY });
    text(":", M + 100, y, { size: 10, color: GRAY });
    text(v, M + 110, y, { size: 10 });
    y -= 17.5;
  });
  y -= 18;

  // ---------- 3. Kotak Catatan (2 kolom) ----------
  const comps = (result?.components || []).filter((c) => c.enabled !== false && Number(c.value) > 0);
  const usesSF = comps.some((c) => c.key === "laminasi");
  const pairs = (list) => list.filter(([, v]) => String(v || "").trim()).map(([k, v]) => `${k} : ${v}`);
  const left = pairs([
    ["Ukuran Kertas Plano", info.ukPlano], ["Uk Lembar Kertas", info.ukLembar], ["Uk Kres Cetak", info.ukKresCetak],
    ...(usesSF ? [["Uk Single Face", info.ukSingleFace]] : []),
  ]);
  const rightCol = pairs([
    ["Warna", info.warna], ["Kebutuhan Kertas Plano", info.kebutuhanPlano], ["Beli Kertas", info.beliKertas], ["Total Hasil Jadi", info.totalHasil],
  ]);
  const colW = W / 2 - 16;
  const leftL = left.flatMap((l) => wrap(font, l, 10, colW));
  const rightL = rightCol.flatMap((l) => wrap(font, l, 10, colW));
  const extraL = notes ? wrap(font, notes, 9.5, W - 22) : [];
  if (leftL.length || rightL.length || extraL.length) {
    const lh = 14;
    const rowsN = Math.max(leftL.length, rightL.length);
    const boxH = 28 + rowsN * lh + (extraL.length ? 6 + extraL.length * 13 : 0) + 2;
    page.drawRectangle({ x: M, y: y - boxH, width: W, height: boxH, color: BOX_BG, borderColor: RULE, borderWidth: 0.8 });
    text("Catatan", M + 11, y - 15, { f: bold, size: 10, color: NAVY });
    let ly = y - 30;
    leftL.forEach((l, i) => text(l, M + 11, ly - i * lh, { size: 10 }));
    rightL.forEach((l, i) => text(l, M + W / 2 + 12, ly - i * lh, { size: 10 }));
    if (leftL.length && rightL.length) {
      page.drawLine({ start: { x: M + W / 2, y: y - 26 }, end: { x: M + W / 2, y: ly - (rowsN - 1) * lh - 5 }, thickness: 0.6, color: RULE });
    }
    ly -= rowsN * lh + 6;
    extraL.forEach((l, i) => text(l, M + 11, ly - i * 13, { size: 9.5 }));
    y -= boxH + 22;
  }

  // ---------- 4. Rincian Komponen Biaya ----------
  text("Rincian Komponen Biaya (per Pcs)", M, y, { f: bold, size: 12.5, color: NAVY });
  y -= 12;
  const xNo = M + 7, xLabel = M + 34, xRight = M + W - 6, xDesc = M + 43;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 17, width: W, height: 17, color: NAVY });
    text("No", xNo, y - 12, { f: bold, size: 9, color: WHITE });
    text("Komponen", xLabel, y - 12, { f: bold, size: 9, color: WHITE });
    right("Biaya / Pcs", M + W - 62, y - 12, { f: bold, size: 9, color: WHITE });
    y -= 17;
  };
  header();
  comps.forEach((c, i) => {
    const desc = c.rumus ? wrap(font, c.rumus, 7.8, xRight - xDesc) : [];
    const h = 19 + desc.length * 9.5 + 4;
    if (ensure(h)) header();
    y -= 12.5;
    text(String(i + 1), xNo, y, { size: 10 });
    text(c.label, xLabel, y, { size: 10 });
    right(rp(c.value), xRight, y, { size: 10 });
    y -= 4;
    desc.forEach((l) => { y -= 9.5; text(l, xDesc, y, { size: 7.8, color: BLUE }); });
    y -= 6.5;
    page.drawLine({ start: { x: xLabel, y }, end: { x: M + W, y }, thickness: 0.5, color: RULE });
  });

  // ---------- 5. Total ----------
  const labaLabel = result?.labaMode === "rp" ? `Laba (Rp ${num(result?.labaRp)}/pcs)` : `Laba (${num(result?.labaPct, 2)}%)`;
  const totals = [
    ["Subtotal HPP", result?.subtotal, true],
    [`Bunga (${num(result?.bungaPct, 2)}%)`, result?.bunga],
    [labaLabel, result?.laba],
    [`PPN (${num(result?.ppnPct, 2)}%)`, result?.ppn],
    ["HARGA JUAL / PCS", result?.final, true],
  ];
  ensure(totals.length * 18.5 + 10, 40);
  y -= 6;
  totals.forEach(([lab, val, strong]) => {
    y -= 18.5;
    const opt = { f: strong ? bold : font, size: 10.5, color: strong ? NAVY : TEXT };
    right(lab, M + W - 116, y + 4, opt);
    right(rp(val), xRight, y + 4, opt);
  });
  y -= 24;

  // ---------- 6. Susunan Kertas ----------
  drawLayout();

  // ---------- 7. Footer ----------
  ensure(20);
  text("Dokumen dibuat otomatis oleh Kalkulator HPP SCA.", M, y, { f: italic, size: 8.5, color: GRAY });

  return await doc.save();

  /** Plano digambar lanskap (sisi panjang mendatar), produk = kotak navy, garis putus-putus = potongan lembar. */
  function drawLayout() {
    const a = dec(info.planoP), b = dec(info.planoL);
    const pw = dec(info.produkP), ph = dec(info.produkL);
    const cols = Math.round(dec(info.kolom)), rows = Math.round(dec(info.baris));
    if (!(a && b && pw && ph && cols > 0 && rows > 0)) return;
    const PW = Math.max(a, b), PH = Math.min(a, b);   // lanskap
    const lembar = Math.max(1, Math.round(dec(info.lembar)) || 1);
    const tegak = info.arahPotong !== "mendatar";      // potongan lembar: garis tegak (bagi sisi panjang) / mendatar
    const drawW = 308, s = drawW / PW, drawH = PH * s;
    const need = 26 + 34 + drawH + 34;
    if (y - need < 60) newPage();

    text(`Susunan Kertas (Plano ${num(a)} x ${num(b)})`, M, y, { f: bold, size: 12.5, color: NAVY });
    y -= 34;
    const x0 = M + (W - drawW) / 2 + 20, yTop = y - 24, y0 = yTop - drawH;

    // Plano + garis potongan lembar
    page.drawRectangle({ x: x0, y: y0, width: drawW, height: drawH, color: PLANO_BG, borderColor: BLUE, borderWidth: 0.7, borderDashArray: [3, 2] });
    for (let k = 1; k < lembar; k++) {
      const start = tegak ? { x: x0 + (drawW * k) / lembar, y: y0 } : { x: x0, y: y0 + (drawH * k) / lembar };
      const end = tegak ? { x: start.x, y: yTop } : { x: x0 + drawW, y: start.y };
      page.drawLine({ start, end, thickness: 0.7, color: BLUE, dashArray: [3, 2] });
    }

    // Produk: dalam tiap lembar, blok produk dirapatkan & diletakkan di tengah lembar.
    const per = tegak ? cols % lembar === 0 : rows % lembar === 0;
    const groups = per ? lembar : 1;
    const gc = tegak && per ? cols / lembar : cols, gr = !tegak && per ? rows / lembar : rows;
    const gW = tegak && per ? drawW / lembar : drawW, gH = !tegak && per ? drawH / lembar : drawH;
    const centersX = [], centersY = [];
    for (let g = 0; g < groups; g++) {
      const gx = x0 + (tegak ? g * gW : 0), gy = y0 + (tegak ? 0 : g * gH);
      const bx = gx + (gW - gc * pw * s) / 2, by = gy + (gH - gr * ph * s) / 2;
      for (let c = 0; c < gc; c++) {
        for (let r = 0; r < gr; r++) {
          const px = bx + c * pw * s, py = by + (gr - 1 - r) * ph * s;
          page.drawRectangle({ x: px + 0.6, y: py + 0.6, width: pw * s - 1.2, height: ph * s - 1.2, color: NAVY });
          const lab = `${num(pw)} x ${num(ph)}`;
          const fs = Math.min(7.5, (pw * s - 6) / Math.max(1, font.widthOfTextAtSize(lab, 1)));
          page.drawText(lab, { x: px + (pw * s - font.widthOfTextAtSize(lab, fs)) / 2, y: py + ph * s / 2 - fs / 2 + 1 + (ph * s) * 0.1, font, size: fs, color: WHITE });
          if (r === 0) centersX.push(px + (pw * s) / 2);
          if (c === 0 && g === 0) centersY.push(py + (ph * s) / 2);
        }
      }
    }

    // Ukuran: atas (per kolom + total panjang), kiri (per baris + total lebar)
    const dimY = yTop + 14;
    page.drawLine({ start: { x: x0, y: dimY }, end: { x: x0 + drawW, y: dimY }, thickness: 0.5, color: GRAY });
    [x0, x0 + drawW].forEach((x) => page.drawLine({ start: { x, y: dimY - 3 }, end: { x, y: dimY + 3 }, thickness: 0.5, color: GRAY }));
    const tot = `${num(PW)} cm`;
    page.drawText(tot, { x: x0 + drawW / 2 - bold.widthOfTextAtSize(tot, 9) / 2, y: dimY + 4, font: bold, size: 9, color: TEXT });
    centersX.forEach((cx) => { const l = num(pw); page.drawText(l, { x: cx - font.widthOfTextAtSize(l, 8.5) / 2, y: dimY - 10, font, size: 8.5, color: TEXT }); });
    const dimX = x0 - 34;
    page.drawLine({ start: { x: dimX, y: y0 }, end: { x: dimX, y: yTop }, thickness: 0.5, color: GRAY });
    [y0, yTop].forEach((yy) => page.drawLine({ start: { x: dimX - 3, y: yy }, end: { x: dimX + 3, y: yy }, thickness: 0.5, color: GRAY }));
    const lt = `${num(PH)} cm`;
    page.drawText(lt, { x: dimX - 6, y: y0 + drawH / 2 - bold.widthOfTextAtSize(lt, 9) / 2, font: bold, size: 9, color: TEXT, rotate: { type: "degrees", angle: 90 } });
    centersY.forEach((cy) => { const l = num(ph); page.drawText(l, { x: x0 - 6 - font.widthOfTextAtSize(l, 8.5), y: cy - 3, font, size: 8.5, color: TEXT }); });

    // Keterangan
    const total = cols * rows;
    const lw = tegak ? PW / lembar : PW, lh = tegak ? PH : PH / lembar;
    const up = Math.round(total / lembar);
    const gandeng = Math.round(dec(info.gandeng));
    const cap = `Garis putus-putus = potongan lembar cetak ${num(lw)} x ${num(lh)} cm (${up} up). 1 plano = ${total} pcs.${gandeng > 1 ? ` Digandeng ${gandeng}.` : ""}`;
    const capL = lembar > 1 ? cap : `1 plano = ${total} pcs.${gandeng > 1 ? ` Digandeng ${gandeng}.` : ""}`;
    y = y0 - 16;
    text(capL, x0 + drawW / 2 - font.widthOfTextAtSize(clean(capL), 8) / 2, y, { size: 8, color: GRAY });
    y -= 28;
  }
}
