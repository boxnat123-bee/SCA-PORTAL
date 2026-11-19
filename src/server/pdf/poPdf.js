import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { STAGE_ORDER, WAITING_IDS } from "@/server/po/stages";

/**
 * Rekap Daftar PO — A4 TEGAK (portrait).
 * Setiap PO digambar sebagai tabel sendiri (judul PO + baris label/nilai 2 kolom),
 * sehingga muat banyak informasi tanpa kolom yang terpotong ke samping.
 */

const MONTH_NAMES = {
  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April", "05": "Mei", "06": "Juni",
  "07": "Juli", "08": "Agustus", "09": "September", "10": "Oktober", "11": "November", "12": "Desember",
};

const BUCKET_LABELS = {
  proses: "Proses",
  siap_kirim: "Siap Kirim",
  completed: "Selesai",
  delivery_failed: "Gagal Kirim",
  no_stages: "Tanpa Tahapan",
};

const BUCKET_COLORS = {
  proses: [59, 130, 246],
  siap_kirim: [14, 165, 233],
  completed: [16, 185, 129],
  delivery_failed: [239, 68, 68],
  no_stages: [148, 163, 184],
};

const WAITING_LABEL = { 1: "Kertas", 12: "Single Face", 2: "CTCP", 3: "Pisau Plong" };

function fmtDate(s) {
  if (!s) return "-";
  const str = String(s).slice(0, 10);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

function poMonth(po) {
  const d = po.po_date || po.est_start || "";
  return d.length >= 7 ? d.slice(0, 7) : "";
}

function monthLabel(mk) {
  if (!mk || mk.length < 7) return "Tanpa Tanggal";
  return `${MONTH_NAMES[mk.slice(5, 7)] || mk.slice(5, 7)} ${mk.slice(0, 4)}`;
}

const rgbOf = ([r, g, b]) => rgb(r / 255, g / 255, b / 255);

export async function buildPoRekapPdf({ pos, month }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(29 / 255, 78 / 255, 216 / 255);
  const grid = rgb(203 / 255, 213 / 255, 225 / 255);
  const labelBg = rgb(241 / 255, 245 / 255, 249 / 255);
  const muted = rgb(100 / 255, 116 / 255, 139 / 255);
  const ink = rgb(15 / 255, 23 / 255, 42 / 255);
  const white = rgb(1, 1, 1);

  // Font standar PDF hanya mendukung WinAnsi: ganti karakter lain agar tidak error.
  const okCache = new Map();
  const safe = (text) => {
    const s = String(text ?? "").replace(/[\r\t]/g, " ").replace(/[→⟶➔]/g, "->").replace(/[✓✔]/g, "v").replace(/[✗✘]/g, "x");
    let out = "";
    for (const ch of s) {
      if (!okCache.has(ch)) {
        try { font.encodeText(ch); okCache.set(ch, true); } catch { okCache.set(ch, false); }
      }
      out += okCache.get(ch) ? ch : "?";
    }
    return out;
  };

  const wrap = (text, f, size, maxWidth) => {
    const lines = [];
    for (const para of safe(text || "-").split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { lines.push(""); continue; }
      let line = "";
      for (let w of words) {
        // potong kata yang sangat panjang (mis. nomor tanpa spasi)
        while (f.widthOfTextAtSize(w, size) > maxWidth && w.length > 1) {
          let cut = w.length - 1;
          while (cut > 1 && f.widthOfTextAtSize(w.slice(0, cut), size) > maxWidth) cut--;
          if (line) { lines.push(line); line = ""; }
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        const t = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(t, size) > maxWidth && line) { lines.push(line); line = w; }
        else line = t;
      }
      lines.push(line);
    }
    return lines.length ? lines : ["-"];
  };

  // A4 portrait
  const pageW = 595.28, pageH = 841.89;
  const mX = 36, topY = pageH - 40, bottomY = 46;
  const tableW = pageW - mX * 2;
  // 4 kolom: label | nilai | label | nilai
  const LBL = 112;
  const colW = [LBL, tableW / 2 - LBL, LBL, tableW / 2 - LBL];
  const colX = [mX, mX + colW[0], mX + colW[0] + colW[1], mX + colW[0] + colW[1] + colW[2]];
  const fs = 8.5, lh = 11, padX = 5, padY = 4;

  let page = doc.addPage([pageW, pageH]);
  let y = topY;
  const newPage = () => { page = doc.addPage([pageW, pageH]); y = topY; };

  // ===== Judul dokumen =====
  page.drawText("Rekap Purchase Order - SCA", { x: mX, y, font: bold, size: 17, color: navy });
  y -= 17;
  const now = new Date();
  const scope = month ? `Bulan: ${monthLabel(month)}` : "Semua Bulan";
  const sub = `${scope}  •  Total PO: ${pos.length}  •  Dicetak: ${now.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
  page.drawText(safe(sub), { x: mX, y, font, size: 9, color: muted });
  y -= 22;

  if (!pos.length) {
    page.drawText("Tidak ada data PO untuk filter ini.", { x: mX, y, font, size: 11 });
    return await doc.save();
  }

  // Kelompokkan per bulan (terbaru dulu), PO di dalamnya urut tanggal.
  const groups = new Map();
  for (const p of pos) {
    const mk = poMonth(p);
    if (!groups.has(mk)) groups.set(mk, []);
    groups.get(mk).push(p);
  }
  const monthKeys = [...groups.keys()].sort().reverse();

  const waitingText = (p) => {
    const enabled = p.enabled_stages || [];
    const done = p.computed?.done_stages || [];
    const list = STAGE_ORDER.filter((n) => WAITING_IDS.includes(n) && enabled.includes(n));
    if (!list.length) return "-";
    return list.map((n) => `${WAITING_LABEL[n]}: ${done.includes(n) ? "Sudah" : "Belum"}`).join("   •   ");
  };

  const estText = (p) => {
    if (!p.est_start && !p.est_end) return "-";
    return `${fmtDate(p.est_start)}  s/d  ${fmtDate(p.est_end)}`;
  };

  // Tiap baris = [label, nilai, label, nilai] atau { full: [label, nilai] } (nilai selebar tabel)
  const rowsOf = (p) => [
    ["Tanggal PO", fmtDate(p.po_date), "Qty", p.quantity],
    ["Item", p.item_type, "Bahan", p.material],
    ["Ukuran Kertas", p.paper_size, "Ukuran Single Face", p.size_single_face],
    ["Ukuran Kres Cetak", p.size_kres_cetak, "Ukuran Kres Pisau Plong", p.size_kres_pisau],
    ["Mesin Cetak", p.print_machine, "Est. Produksi", estText(p)],
    ["Tahap Saat Ini", p.computed?.current_stage_name, "Dibuat Oleh", p.created_by],
    { full: ["Barang Ditunggu", waitingText(p)] },
    { full: ["Catatan", p.notes] },
  ];

  const layoutRow = (r) => {
    if (r.full) {
      const lab = wrap(r.full[0], bold, fs, colW[0] - padX * 2);
      const val = wrap(r.full[1] || "-", font, fs, tableW - colW[0] - padX * 2);
      return { full: true, cells: [lab, val], h: Math.max(lab.length, val.length) * lh + padY * 2 };
    }
    const cells = r.map((c, i) => wrap(i % 2 === 0 ? c : (c || "-"), i % 2 === 0 ? bold : font, fs, colW[i] - padX * 2));
    return { full: false, cells, h: Math.max(...cells.map((c) => c.length)) * lh + padY * 2 };
  };

  const headH = 22;

  const drawPo = (p, idx) => {
    const rows = rowsOf(p).map(layoutRow);
    const blockH = headH + rows.reduce((a, r) => a + r.h, 0);
    if (y - blockH < bottomY) newPage();

    // Header PO: nomor + klien (kiri), status (kanan)
    const top = y;
    page.drawRectangle({ x: mX, y: top - headH, width: tableW, height: headH, color: navy });
    const bucket = p.computed?.delivery_failed ? "delivery_failed" : (p.computed?.bucket || "proses");
    const status = BUCKET_LABELS[bucket] || "-";
    const stW = bold.widthOfTextAtSize(status, 8) + 14;
    const pillX = mX + tableW - stW - 6;
    page.drawRectangle({ x: pillX, y: top - headH + 5, width: stW, height: 12, color: rgbOf(BUCKET_COLORS[bucket] || BUCKET_COLORS.proses), borderColor: white, borderWidth: 0.6 });
    page.drawText(status, { x: pillX + 7, y: top - headH + 8.5, font: bold, size: 8, color: white });

    let title = safe(`${idx}. ${p.po_number || "-"}`);
    page.drawText(title, { x: mX + 7, y: top - 15, font: bold, size: 10.5, color: white });
    const tW = bold.widthOfTextAtSize(title, 10.5);
    const clientMax = pillX - (mX + 7 + tW + 12) - 6;
    let client = safe(p.client_name || "-");
    while (client.length > 1 && font.widthOfTextAtSize(`—  ${client}`, 9.5) > clientMax) client = client.slice(0, -2) + "…";
    page.drawText(`—  ${client}`, { x: mX + 7 + tW + 8, y: top - 15, font, size: 9.5, color: white });

    // Isi tabel
    let ry = top - headH;
    for (const r of rows) {
      // latar label
      page.drawRectangle({ x: colX[0], y: ry - r.h, width: colW[0], height: r.h, color: labelBg });
      if (!r.full) page.drawRectangle({ x: colX[2], y: ry - r.h, width: colW[2], height: r.h, color: labelBg });
      const draw = (lines, x, f) => lines.forEach((ln, li) => page.drawText(ln, { x: x + padX, y: ry - padY - 8 - li * lh, font: f, size: fs, color: ink }));
      if (r.full) {
        draw(r.cells[0], colX[0], bold);
        draw(r.cells[1], colX[1], font);
      } else {
        r.cells.forEach((lines, i) => draw(lines, colX[i], i % 2 === 0 ? bold : font));
      }
      // garis
      page.drawLine({ start: { x: mX, y: ry - r.h }, end: { x: mX + tableW, y: ry - r.h }, thickness: 0.5, color: grid });
      const verts = r.full ? [colX[1]] : [colX[1], colX[2], colX[3]];
      verts.forEach((vx) => page.drawLine({ start: { x: vx, y: ry }, end: { x: vx, y: ry - r.h }, thickness: 0.5, color: grid }));
      ry -= r.h;
    }
    // bingkai luar
    page.drawRectangle({ x: mX, y: ry, width: tableW, height: top - ry, borderColor: grid, borderWidth: 0.8 });
    y = ry - 14;
  };

  let counter = 0;
  for (const mk of monthKeys) {
    const rows = groups.get(mk).slice().sort((a, b) => (a.po_date || a.est_start || "").localeCompare(b.po_date || b.est_start || ""));
    if (y - 120 < bottomY) newPage();
    page.drawText(`${monthLabel(mk)}  (${rows.length} PO)`, { x: mX, y, font: bold, size: 12, color: ink });
    page.drawLine({ start: { x: mX, y: y - 5 }, end: { x: mX + tableW, y: y - 5 }, thickness: 1, color: navy });
    y -= 18;
    for (const p of rows) drawPo(p, ++counter);
    y -= 6;
  }

  // Nomor halaman
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    const txt = `Halaman ${i + 1} dari ${pages.length}`;
    pg.drawText(txt, { x: pageW - mX - font.widthOfTextAtSize(txt, 8), y: 24, font, size: 8, color: muted });
    pg.drawText("SCA Portal - Rekap Purchase Order", { x: mX, y: 24, font, size: 8, color: muted });
  });

  return await doc.save();
}
