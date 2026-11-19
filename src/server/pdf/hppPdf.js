import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { embedLogo, LOGO_RATIO } from "@/server/pdf/logo";

function rp(v) {
  const num = Number(v || 0);
  const neg = num < 0;
  const abs = Math.abs(num);
  const s = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(abs);
  return (neg ? "- " : "") + "Rp " + s;
}

function wrap(font, text, size, maxW) {
  const out = [];
  for (const para of String(text || "").split(/\r?\n/)) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
const clean = (t) => String(t ?? "").replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, (ch) => ({ "×": "x", "÷": ":", "–": "-", "—": "-", "→": "->", "’": "'", "“": '"', "”": '"' }[ch] ?? "?"));

export async function buildHppPdf({ name, customer, notes, company, result }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(30 / 255, 58 / 255, 138 / 255);
  const muted = rgb(100 / 255, 116 / 255, 139 / 255);
  const grid = rgb(226 / 255, 232 / 255, 240 / 255);

  let page = doc.addPage([595.28, 841.89]); // A4
  const marginX = 40;
  let y = 810;

  const logo = await embedLogo(doc);
  const logoH = 40, logoW = logoH * LOGO_RATIO;
  page.drawImage(logo, { x: marginX, y: y - logoH + 16, width: logoW, height: logoH });
  const tX = marginX + logoW + 12;
  page.drawText(company || "Percetakan SCA", { x: tX, y, font: bold, size: 20, color: navy });
  y -= 18;
  page.drawText("Penawaran Harga Pokok Produksi (HPP)", { x: tX, y, font, size: 10, color: muted });
  y -= 30;

  const meta = [
    ["Nama Produk", name || "-"],
    ["Customer", customer || "-"],
    ["Tanggal", new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })],
  ];
  meta.forEach(([k, v]) => {
    page.drawText(k, { x: marginX, y, font, size: 10, color: muted });
    page.drawText(":", { x: marginX + 100, y, font, size: 10, color: muted });
    page.drawText(String(v), { x: marginX + 110, y, font, size: 10 });
    y -= 15;
  });
  y -= 10;

  // Kotak Catatan (di bawah tanggal, di atas Rincian)
  if (notes) {
    const lines = wrap(font, clean(notes), 9.5, 500);
    const boxH = 22 + lines.length * 13;
    page.drawRectangle({ x: marginX, y: y - boxH + 8, width: 520, height: boxH, borderColor: grid, borderWidth: 1, color: rgb(0.973, 0.98, 0.988) });
    page.drawText("Catatan", { x: marginX + 10, y: y - 6, font: bold, size: 9.5, color: navy });
    let ly = y - 20;
    for (const l of lines) { page.drawText(l, { x: marginX + 10, y: ly, font, size: 9.5 }); ly -= 13; }
    y -= boxH + 14;
  }

  page.drawText("Rincian Komponen Biaya (per Pcs)", { x: marginX, y, font: bold, size: 12, color: navy });
  y -= 8;

  // Table header
  const colX = { no: marginX, label: marginX + 30, value: 480 };
  const drawRow = (no, label, value, isHeader = false, isTotal = false) => {
    const rowH = 18;
    if (isHeader) {
      page.drawRectangle({ x: marginX, y: y - rowH + 4, width: 520, height: rowH, color: navy });
      page.drawText(no, { x: colX.no + 4, y: y - 10, font: bold, size: 9, color: rgb(1, 1, 1) });
      page.drawText(label, { x: colX.label, y: y - 10, font: bold, size: 9, color: rgb(1, 1, 1) });
      page.drawText("Biaya / Pcs", { x: colX.value - 60, y: y - 10, font: bold, size: 9, color: rgb(1, 1, 1) });
    } else {
      page.drawText(String(no), { x: colX.no + 4, y: y - 10, font, size: 9 });
      page.drawText(String(label), { x: colX.label, y: y - 10, font: isTotal ? bold : font, size: 9 });
      const txt = rp(value);
      const width = font.widthOfTextAtSize(txt, 9);
      page.drawText(txt, { x: 520 + marginX - width - 4, y: y - 10, font: isTotal ? bold : font, size: 9, color: isTotal ? navy : rgb(0, 0, 0) });
      page.drawLine({ start: { x: marginX, y: y - 12 }, end: { x: marginX + 520, y: y - 12 }, thickness: 0.3, color: grid });
    }
    y -= rowH;
  };

  drawRow("No", "Komponen", null, true);
  const comps = result?.components || [];
  comps.forEach((c, i) => {
    if (y < 100) {
      page = doc.addPage([595.28, 841.89]);
      y = 810;
      drawRow("No", "Komponen", null, true);
    }
    drawRow(i + 1, clean(c.label), c.value);
    if (c.manual && c.rumus) {
      for (const l of wrap(font, clean(c.rumus), 8, 380)) {
        page.drawText(l, { x: colX.label + 8, y: y - 2, font, size: 8.5, color: navy });
        y -= 11;
      }
      y -= 2;
    }
  });

  y -= 8;
  const summary = [
    ["Subtotal HPP", result?.subtotal, true],
    [`Bunga (${result?.bungaPct || 0}%)`, result?.bunga, false],
    [`Laba (${result?.labaPct || 0}%)`, result?.laba, false],
    [`PPN (${result?.ppnPct || 0}%)`, result?.ppn, false],
    ["HARGA JUAL / PCS", result?.final, true],
  ];
  summary.forEach(([lab, val, isBold]) => {
    const line = String(lab);
    const txt = rp(val);
    const lw = font.widthOfTextAtSize(line, 10);
    page.drawText(line, { x: 520 + marginX - lw - 100, y, font: isBold ? bold : font, size: 10, color: isBold ? navy : rgb(0, 0, 0) });
    const vw = font.widthOfTextAtSize(txt, 10);
    page.drawText(txt, { x: 520 + marginX - vw - 4, y, font: isBold ? bold : font, size: 10, color: isBold ? navy : rgb(0, 0, 0) });
    y -= 16;
  });

  y -= 20;
  page.drawText("Dokumen dibuat otomatis oleh Kalkulator HPP SCA.", { x: marginX, y, font, size: 9, color: muted });

  return await doc.save();
}
