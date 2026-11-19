import { n, parseGsm, parseUkuran } from "@/lib/format";
import { findPaper, PAPER_METODE } from "@/lib/hppRefData";

export function calcKertas(k) {
  // Manual (custom) bila bahan, gramatur, atau ukuran dipilih "Custom".
  const isCustom = k.bahan === "Custom" || k.gramatur === "Custom" || k.ukuran === "Custom";
  const gramaturEff = k.gramatur === "Custom" ? (k.gramaturCustom || "") : k.gramatur;
  const ukuranEff = k.ukuran === "Custom" ? (k.ukuranCustom || "") : k.ukuran;
  const row = isCustom ? null : findPaper(k.bahan, k.gramatur, k.ukuran);
  const hargaKg = isCustom ? n(k.customHargaKg) : (row ? row.hargaKg : 0);
  const pembagi = isCustom ? (n(k.customPembagi) || 20000) : (row ? row.pembagi : 20000);
  const indeks = isCustom ? n(k.customIndeks) : (row && row.indeks ? row.indeks : 0);
  const minKg = isCustom ? 0 : (row ? row.minKg : 0);
  const metode = isCustom ? (n(k.customMetode) || 1) : (PAPER_METODE[k.bahan] || 1);
  const gsm = parseGsm(gramaturEff);
  const [P, L] = parseUkuran(ukuranEff);
  const vol = gsm * P * L;
  const rim1 = pembagi ? (vol * hargaKg) / pembagi : 0;
  const rim2 = rim1 * (1 + indeks);
  const hargaRim = metode === 1 ? rim1 : rim2;
  const hargaLembar = hargaRim / 500;
  const qpp = n(k.qtyPerPlano);
  const hargaPcs = qpp ? hargaLembar / qpp : 0;
  const hargaFinal = hargaPcs * (1 + n(k.wes));
  const qtyRim = qpp ? n(k.qtyOrder) / qpp / 500 : 0;
  const biayaPembelian = qtyRim * hargaRim;
  return {
    hargaKg, pembagi, indeks, minKg, metode, gsm, P, L, vol,
    hargaRim, hargaLembar, hargaPcs, hargaFinal, qtyRim, biayaPembelian,
    output: hargaFinal,
  };
}

/**
 * Warna = ( Σ (Kebutuhan Tinta Kg × Harga per Kg)  +  Biaya Listrik  +  Gaji Operator ) ÷ Quantity Order (Pcs)
 * Jumlah jenis tinta bebas (mis. 4 warna = 4 baris tinta).
 */
export function calcWarna(w) {
  const tintas = (Array.isArray(w.tintas) ? w.tintas : []).map((t) => ({
    ...t, subtotal: n(t.kg) * n(t.harga),
  }));
  const biayaTinta = tintas.reduce((a, t) => a + t.subtotal, 0);
  const listrik = n(w.listrik);
  const gaji = n(w.gaji);
  const totalBiaya = biayaTinta + listrik + gaji;
  const qty = n(w.qtyOrder);
  const output = qty ? totalBiaya / qty : 0;
  return { tintas, jumlahTinta: tintas.length, biayaTinta, listrik, gaji, totalBiaya, qtyOrder: qty, output };
}

/**
 * Perhitungan HPP lama menyimpan Warna sebagai harga × qty warna ÷ qty per lembar
 * dengan satu "Jenis Tinta". Saat dimuat, ubah ke format baru (daftar tinta).
 */
export function normalizeWarna(w = {}) {
  if (Array.isArray(w.tintas)) return w;
  const { harga, qtyWarna, qtyPerLembar, jenisTinta, hargaTintaKg, ...rest } = w;
  const tintas = (jenisTinta || hargaTintaKg) ? [{ nama: jenisTinta || "", kg: "", harga: hargaTintaKg || "" }] : [{ nama: "", kg: "", harga: "" }];
  return { qtyOrder: "", ...rest, tintas };
}

export function calcDesign(d) {
  const q = n(d.qtyOrder);
  const output = q ? n(d.jasaDesign) / q : 0;
  return { output };
}

export function calcCTP(c) {
  const q = n(c.qtyOrder);
  const output = q ? (n(c.biayaCTP) * n(c.qtyWarna)) / q : 0;
  return { output };
}

export function calcFinishing(f) {
  const per = n(f.qtyPerLembar);
  const output = per ? (n(f.ukuranP) * n(f.ukuranL) * n(f.hargaPerCm)) / per : 0;
  return { output };
}

export function calcLaminasi(l) {
  const per = n(l.perPcs);
  const hargaLembar = (n(l.ukuranP) / 100) * (n(l.ukuranL) / 100) * n(l.hargaIndex);
  const perPcs = per ? hargaLembar / per : 0;
  const output = perPcs * (1 + n(l.wes));
  return { hargaLembar, perPcs, output };
}

export function calcLem(l) {
  const output = n(l.spotP) * n(l.spotL) * n(l.biaya) * (1 + n(l.wes));
  return { output };
}

export function calcPisauPapan(p) {
  const qP = n(p.pisauQtyOrder);
  const pisau = qP ? (n(p.pisauBiaya) * n(p.pisauUkuran) * n(p.pisauQtyLembar)) / qP : 0;
  const papanP = n(p.papanLembarP) + n(p.papanLebihan);
  const papanL = n(p.papanLembarL) + n(p.papanLebihan);
  const qPp = n(p.papanQtyOrder);
  const papan = qPp ? (papanP * papanL * n(p.papanBiaya)) / qPp : 0;
  return { pisau, papan, papanP, papanL, total: pisau + papan };
}

export function calcPlong(p) {
  const per = n(p.qtyPerLembar);
  const output = per ? n(p.biayaLbr) / per : 0;
  return { output };
}

export function calcOngkosCetak(o) {
  const qtyWarnaEff = o.qtyWarna === "Custom" ? n(o.qtyWarnaCustom) : n(o.qtyWarna);
  const qtyLembarCetak = n(o.qtyPerLembar) ? n(o.qtyOrder) / n(o.qtyPerLembar) : 0;
  const qtySisa = qtyLembarCetak - n(o.minLembar);
  const hargaCetakMin = n(o.hargaOngkos);
  const hargaSetelahMinTotal = n(o.hargaSetelahMin) * qtyWarnaEff * Math.max(qtySisa, 0);
  const total = hargaCetakMin + hargaSetelahMinTotal;
  const output = n(o.qtyOrder) ? total / n(o.qtyOrder) : 0;
  return { qtyLembarCetak, qtySisa, hargaCetakMin, hargaSetelahMinTotal, total, output };
}

export function calcOngkosPlong(o) {
  const qLembarPlong = n(o.qtyPerLembar) ? n(o.qtyOrder) / n(o.qtyPerLembar) : 0;
  const qSisa = qLembarPlong - n(o.minLembarPlong);
  const hargaPlongMin = n(o.biayaMinimum);
  const hargaSetelahMinTotal = Math.max(qSisa, 0) * n(o.biayaSetelahMin);
  const total = hargaPlongMin + hargaSetelahMinTotal;
  const output = n(o.qtyOrder) ? total / n(o.qtyOrder) : 0;
  return { qLembarPlong, qSisa, hargaPlongMin, hargaSetelahMinTotal, total, output };
}

export function calcOther(o) {
  const transport = n(o.qtyOrderT) ? n(o.biayaTranspor) / n(o.qtyOrderT) : 0;
  const paking = n(o.qtyHari) ? n(o.biayaPaking) / n(o.qtyHari) : 0;
  const potongTotal = (n(o.qtyLembarPlano) / 500) * n(o.biayaPotongRim);
  const potong = n(o.qtyOrderP) ? potongTotal / n(o.qtyOrderP) : 0;
  const kopek = n(o.qtyPcsLbr) ? n(o.biayaKopekLbr) / n(o.qtyPcsLbr) : 0;
  const rajangTotal = (n(o.qtyLembarRajang) / 500) * n(o.biayaRajangRim);
  const rajang = n(o.qtyOrderR) ? rajangTotal / n(o.qtyOrderR) : 0;
  const output = transport + paking + potong + kopek + rajang;
  return { transport, paking, potong, potongTotal, kopek, rajang, rajangTotal, output };
}

/**
 * Uk Area Cetak (patokan = Ukuran Cetak yang diketik):
 *   Ukuran Kertas P    = Cetak P + Selisih Kres P + Anleg P
 *   Ukuran Kertas L    = Cetak L + Selisih Kres L
 *   Ukuran Single Face = Ukuran Cetak + Tambahan Single Face (P & L)
 * Contoh: Cetak 45 x 62 · Tambahan SF 1,7 → Single Face 46,7 x 63,7
 */
const r4 = (v) => Math.round(v * 10000) / 10000; // hindari 82.30000000000001
export function calcUkArea(a) {
  const cetakP = n(a.cetakP);
  const cetakL = n(a.cetakL);
  const kertasP = r4(cetakP + n(a.kresP) + n(a.anlegP));
  const kertasL = r4(cetakL + n(a.kresL));
  // Single Face = Ukuran Cetak + tambahan SF (berlaku ke P dan L). Cth: 45 x 62 + 1,7 → 46,7 x 63,7
  const sfP = r4(cetakP + n(a.sf));
  const sfL = r4(cetakL + n(a.sf));
  return {
    planoP: n(a.planoP), planoL: n(a.planoL),
    cetakP, cetakL, kertasP, kertasL, sfP, sfL,
    kresP: n(a.kresP), kresL: n(a.kresL), sf: n(a.sf),
    sfCetakP: r4(sfP - cetakP), sfCetakL: r4(sfL - cetakL),
    anlegP: n(a.anlegP), arahSerat: a.arahSerat || "P",
  };
}

export function calcAll(s) {
  const kertas = calcKertas(s.kertas);
  const warna = calcWarna(s.warna);
  const ongkosCetak = calcOngkosCetak(s.ongkosCetak);
  const design = calcDesign(s.design);
  const ctp = calcCTP(s.ctp);
  const finishing = calcFinishing(s.finishing);
  const laminasi = calcLaminasi(s.laminasi);
  const lem = calcLem(s.lem);
  const pisauPapan = calcPisauPapan(s.pisauPapan);
  const plong = calcPlong(s.plong);
  const ongkosPlong = calcOngkosPlong(s.ongkosPlong);
  const other = calcOther(s.other);
  const ukArea = calcUkArea(s.ukArea);

  const en = s.enabled || {};
  const isOn = (k) => en[k] !== false;
  const components = [
    { key: "kertas", label: "Kertas", value: kertas.output },
    { key: "warna", label: "Warna", value: warna.output },
    { key: "ongkosCetak", label: "Ongkos Cetak", value: ongkosCetak.output },
    { key: "design", label: "Design", value: design.output },
    { key: "ctp", label: "CTP", value: ctp.output },
    { key: "finishing", label: "Finishing", value: finishing.output },
    { key: "laminasi", label: "Single Face", value: laminasi.output },
    { key: "lem", label: "Lem", value: lem.output },
    { key: "pisauPlong", label: "Pisau Plong", value: pisauPapan.pisau },
    { key: "papanPlong", label: "Papan Plong", value: pisauPapan.papan },
    { key: "plong", label: "Plong", value: plong.output },
    { key: "ongkosPlong", label: "Jasa Ongkos Plong", value: ongkosPlong.output },
    { key: "other", label: "Transportasi / Potong / Packing", value: other.output },
  ].map((c) => {
    // "Penghitungan sendiri": Biaya/Pcs yang diketik MENGGANTIKAN hasil otomatis tahap ini.
    const m = (s.manual || {})[c.key];
    const manual = !!(m && m.on);
    const val = manual ? n(m.biaya) : c.value;
    return { ...c, manual, rumus: manual ? String(m.rumus || "") : "", enabled: isOn(c.key), value: isOn(c.key) ? val : 0 };
  });

  const subtotal = components.reduce((a, c) => a + (c.value || 0), 0);
  const labaPct = n(s.total.labaPct);
  const bungaPct = n(s.total.bungaPct);
  const ppnPct = n(s.total.ppnPct);
  // Urutan: Subtotal → Bunga → Laba → PPN → Harga jual (hasil akhir sama, hanya pembagian nominalnya).
  const bunga = (bungaPct / 100) * subtotal;
  const afterBunga = subtotal + bunga;
  const laba = (labaPct / 100) * afterBunga;
  const afterLaba = afterBunga + laba;
  const ppn = (ppnPct / 100) * afterLaba;
  const final = afterLaba + ppn;

  return {
    kertas, warna, ongkosCetak, design, ctp, finishing, laminasi, lem,
    pisauPapan, plong, ongkosPlong, other, ukArea,
    components, subtotal, labaPct, bungaPct, ppnPct, laba, afterLaba,
    bunga, afterBunga, ppn, final,
  };
}
