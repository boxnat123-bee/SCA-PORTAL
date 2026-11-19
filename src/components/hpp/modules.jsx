import {
  FileStack, Palette, Printer, PenTool, Layers, Sparkles,
  Scissors, Droplets, SquareStack, Grid3x3, Truck, Ruler, LayoutDashboard, Plus, Trash2,
} from "lucide-react";
import { Field, NumberInput, MoneyField, TextInput, SelectInput, SectionTitle, ResultLine, OutputCard } from "@/components/hpp/fields";
import { formatGroup, formatRp } from "@/lib/format";
import {
  paperJenisList, paperGramaturList, paperUkuranList, findPaper, PAPER_METODE,
  machineList, findMachine, FINISHING_OPTIONS, findFinishing,
  CTP_OPTIONS, findCTP, LAMINASI_OPTIONS, LEM_OPTIONS, WARNA_OC_OPTIONS,
} from "@/lib/hppRefData";

const Grid = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">{children}</div>
);
const Box = ({ children }) => (
  <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-4 md:p-5">{children}</div>
);

const Kertas = ({ s, u, r }) => {
  const isCustom = s.bahan === "Custom";
  const gramaturCustom = !isCustom && s.gramatur === "Custom";
  const ukuranCustom = !isCustom && s.ukuran === "Custom";
  const anyManual = isCustom || gramaturCustom || ukuranCustom;
  const gramaturs = paperGramaturList(s.bahan);
  const ukurans = paperUkuranList(s.bahan, s.gramatur);
  // Saat beralih dari data DB ke Custom, isi awal harga manual dari baris DB agar tidak mulai dari 0.
  const seedManual = () => {
    const row = findPaper(s.bahan, s.gramatur, s.ukuran);
    if (!row) return;
    u("customHargaKg", String(row.hargaKg));
    u("customPembagi", String(row.pembagi));
    u("customIndeks", String(row.indeks || 0));
    u("customMetode", String(PAPER_METODE[s.bahan] || 1));
  };
  return (
    <>
      <SectionTitle title="Kertas" hint="Harga bahan kertas per pcs. Untuk bahan database, Harga/Kg & pembagi otomatis. Pilih 'Custom' untuk input manual." />
      <Grid>
        <Field label="Bahan" testid="field-kertas-bahan">
          <div className="space-y-2">
            <SelectInput testid="input-kertas-bahan" value={s.bahan} options={[...paperJenisList(), "Custom"]}
              onChange={(v) => {
                u("bahan", v);
                if (v === "Custom") { u("gramatur", ""); u("ukuran", ""); }
                else { const g = paperGramaturList(v); u("gramatur", g[0] || ""); const uk = paperUkuranList(v, g[0]); u("ukuran", uk[0] || ""); }
              }} />
            {isCustom && (
              <TextInput testid="input-kertas-bahan-custom" value={s.bahanCustom} onChange={(v) => u("bahanCustom", v)} placeholder="Tulis nama bahan..." />
            )}
          </div>
        </Field>
        {isCustom ? (
          <Field label="Gramatur" unit="Gr" testid="field-kertas-gramatur">
            <TextInput testid="input-kertas-gramatur" value={s.gramatur} onChange={(v) => u("gramatur", v)} placeholder="cth: 250 Gr" />
          </Field>
        ) : (
          <Field label="Gramatur" testid="field-kertas-gramatur">
            <div className="space-y-2">
              <SelectInput testid="input-kertas-gramatur" value={s.gramatur} options={[...gramaturs, "Custom"]}
                onChange={(v) => {
                  if (v === "Custom") { seedManual(); u("gramatur", v); return; }
                  u("gramatur", v); const uk = paperUkuranList(s.bahan, v); u("ukuran", uk[0] || "");
                }} />
              {gramaturCustom && (
                <TextInput testid="input-kertas-gramatur-custom" value={s.gramaturCustom} onChange={(v) => u("gramaturCustom", v)} placeholder="cth: 275 Gr" />
              )}
            </div>
          </Field>
        )}
        {isCustom ? (
          <Field label="Ukuran Plano (Cm)" unit="P x L" testid="field-kertas-ukuran">
            <TextInput testid="input-kertas-ukuran" value={s.ukuran} onChange={(v) => u("ukuran", v)} placeholder="cth: 90 x 120" />
          </Field>
        ) : (
          <Field label="Ukuran Plano" testid="field-kertas-ukuran">
            <div className="space-y-2">
              <SelectInput testid="input-kertas-ukuran" value={s.ukuran} options={[...ukurans, "Custom"]}
                onChange={(v) => { if (v === "Custom") seedManual(); u("ukuran", v); }} />
              {ukuranCustom && (
                <TextInput testid="input-kertas-ukuran-custom" value={s.ukuranCustom} onChange={(v) => u("ukuranCustom", v)} placeholder="cth: 90 x 120" />
              )}
            </div>
          </Field>
        )}
        {anyManual && (
          <>
            <Field label="Harga per Kg" unit="Rp" testid="field-kertas-hargakg">
              <MoneyField testid="input-kertas-hargakg" value={s.customHargaKg} onChange={(v) => u("customHargaKg", v)} />
            </Field>
            <Field label="Pembagi" testid="field-kertas-pembagi">
              <NumberInput testid="input-kertas-pembagi" value={s.customPembagi} onChange={(v) => u("customPembagi", v)} />
            </Field>
            <Field label="Indeks" testid="field-kertas-indeks">
              <NumberInput testid="input-kertas-indeks" value={s.customIndeks} onChange={(v) => u("customIndeks", v)} />
            </Field>
            <Field label="Metode" testid="field-kertas-metode">
              <SelectInput testid="input-kertas-metode" value={s.customMetode}
                options={[{ value: "1", label: "Metode 1 (Standar)" }, { value: "2", label: "Metode 2 (Indeks)" }]}
                onChange={(v) => u("customMetode", v)} />
            </Field>
          </>
        )}
        <Field label="Quantity Order" unit="Pcs" testid="field-kertas-qty">
          <NumberInput testid="input-kertas-qty" value={s.qtyOrder} onChange={(v) => u("qtyOrder", v)} />
        </Field>
        <Field label="Quantity / Plano" unit="Pcs" testid="field-kertas-qtyplano">
          <NumberInput testid="input-kertas-qtyplano" value={s.qtyPerPlano} onChange={(v) => u("qtyPerPlano", v)} />
        </Field>
        <Field label="Waste %" unit="(0.07 = 7%)" testid="field-kertas-wes">
          <NumberInput testid="input-kertas-wes" value={s.wes} onChange={(v) => u("wes", v)} />
        </Field>
      </Grid>
      <Box>
        <ResultLine label="Harga per Kg (DB)" value={r.hargaKg} />
        <ResultLine label="Harga per Rim" value={r.hargaRim} />
        <ResultLine label="Harga per Lembar" value={r.hargaLembar} />
        <ResultLine label="Harga per Pcs" value={r.hargaPcs} />
        <ResultLine label="Kebutuhan (Rim)" value={r.qtyRim} money={false} />
        <ResultLine label="Biaya Pembelian" value={r.biayaPembelian} />
        <ResultLine label="Harga per Pcs + Waste" value={r.hargaFinal} strong />
      </Box>
      <div className="mt-4"><OutputCard label="Harga Kertas / Pcs" value={r.output} /></div>
    </>
  );
};

const Warna = ({ s, u, r }) => {
  const tintas = Array.isArray(s.tintas) ? s.tintas : [];
  const setTinta = (i, key, val) => u("tintas", tintas.map((t, j) => (j === i ? { ...t, [key]: val } : t)));
  const addTinta = () => u("tintas", [...tintas, { nama: "", kg: "", harga: "" }]);
  const delTinta = (i) => u("tintas", tintas.filter((_, j) => j !== i));
  return (
    <>
      <SectionTitle title="Warna"
        hint="(Σ Kebutuhan Tinta Kg × Harga per Kg) + Biaya Listrik + Gaji Operator, lalu dibagi Quantity Order (Pcs)." />

      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Jenis Tinta ({tintas.length} warna)</p>
        <button type="button" onClick={addTinta} data-testid="warna-add-tinta"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary">
          <Plus className="h-4 w-4" /> Tambah Tinta
        </button>
      </div>

      <div className="space-y-3" data-testid="warna-tinta-list">
        {tintas.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Belum ada tinta. Klik “Tambah Tinta”.</p>
        )}
        {tintas.map((t, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3 sm:p-4" data-testid={`warna-tinta-${i}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Tinta {i + 1}</span>
              <button type="button" onClick={() => delTinta(i)} aria-label={`Hapus tinta ${i + 1}`} data-testid={`warna-del-tinta-${i}`}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Jenis Tinta" testid={`field-warna-nama-${i}`}>
                <TextInput testid={`input-warna-nama-${i}`} value={t.nama} onChange={(v) => setTinta(i, "nama", v)} placeholder="cth: Cyan / Pantone 485" />
              </Field>
              <Field label="Kebutuhan" unit="Kg" testid={`field-warna-kg-${i}`}>
                <NumberInput testid={`input-warna-kg-${i}`} value={t.kg} onChange={(v) => setTinta(i, "kg", v)} />
              </Field>
              <Field label="Harga / Kg" unit="Rp" testid={`field-warna-harga-${i}`}>
                <MoneyField testid={`input-warna-harga-${i}`} value={t.harga} onChange={(v) => setTinta(i, "harga", v)} />
              </Field>
            </div>
            <div className="mt-2 text-right text-xs text-muted-foreground">
              Subtotal: <span className="font-mono font-semibold text-foreground">{formatRp(r.tintas?.[i]?.subtotal || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-8 mb-3">Listrik, Operator & Quantity</p>
      <Grid>
        <Field label="Biaya Listrik" unit="Rp" testid="field-warna-listrik"><MoneyField testid="input-warna-listrik" value={s.listrik} onChange={(v) => u("listrik", v)} /></Field>
        <Field label="Gaji Operator" unit="Rp" testid="field-warna-gaji"><MoneyField testid="input-warna-gaji" value={s.gaji} onChange={(v) => u("gaji", v)} /></Field>
        <Field label="Nama Operator (opsional)" testid="field-warna-operator"><TextInput testid="input-warna-operator" value={s.operator} onChange={(v) => u("operator", v)} placeholder="Tulis nama operator..." /></Field>
        <Field label="Quantity Order" unit="Pcs" testid="field-warna-qty"><NumberInput testid="input-warna-qty" value={s.qtyOrder} onChange={(v) => u("qtyOrder", v)} /></Field>
      </Grid>

      <Box>
        <ResultLine label={`Biaya Tinta (${r.jumlahTinta || 0} warna)`} value={r.biayaTinta} />
        <ResultLine label="Biaya Listrik" value={r.listrik} />
        <ResultLine label="Gaji Operator" value={r.gaji} />
        <ResultLine label="Total Biaya Warna" value={r.totalBiaya} />
        <ResultLine label={`÷ Quantity Order (${formatGroup(r.qtyOrder) || 0} pcs)`} value={r.output} strong testid="warna-result-pcs" />
      </Box>
      <div className="mt-4"><OutputCard label="Harga Warna / Pcs" value={r.output} /></div>
    </>
  );
};

const OngkosCetak = ({ s, u, r }) => (
  <>
    <SectionTitle title="Ongkos Cetak" hint="Pilih mesin cetak → harga & minimal lembar terisi otomatis dari database (bisa diubah)." />
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Input Kertas</p>
    <Grid>
      <Field label="Bahan" testid="field-oc-bahan"><TextInput testid="input-oc-bahan" value={s.bahan} onChange={(v) => u("bahan", v)} /></Field>
      <Field label="Gramatur" testid="field-oc-gramatur"><TextInput testid="input-oc-gramatur" value={s.gramatur} onChange={(v) => u("gramatur", v)} /></Field>
      <Field label="Ukuran Plano" testid="field-oc-plano"><TextInput testid="input-oc-plano" value={s.ukuranPlano} onChange={(v) => u("ukuranPlano", v)} /></Field>
      <Field label="Ukuran Lembar (Cm)" unit="P x L" testid="field-oc-lembar">
        <div className="flex gap-2">
          <NumberInput testid="input-oc-lembarp" value={s.ukuranLembarP} onChange={(v) => u("ukuranLembarP", v)} />
          <NumberInput testid="input-oc-lembarl" value={s.ukuranLembarL} onChange={(v) => u("ukuranLembarL", v)} />
        </div>
      </Field>
      <Field label="Quantity Warna" testid="field-oc-warna">
        <div className="space-y-2">
          <SelectInput testid="input-oc-warna" value={s.qtyWarna} options={[...WARNA_OC_OPTIONS, "Custom"]} onChange={(v) => u("qtyWarna", v)} />
          {s.qtyWarna === "Custom" && (
            <NumberInput testid="input-oc-warna-custom" value={s.qtyWarnaCustom} onChange={(v) => u("qtyWarnaCustom", v)} placeholder="Jumlah warna" />
          )}
        </div>
      </Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-oc-qty"><NumberInput testid="input-oc-qty" value={s.qtyOrder} onChange={(v) => u("qtyOrder", v)} /></Field>
      <Field label="Quantity / Lembar" unit="Pcs" testid="field-oc-perlembar"><NumberInput testid="input-oc-perlembar" value={s.qtyPerLembar} onChange={(v) => u("qtyPerLembar", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-8 mb-3">Input Mesin Cetak</p>
    <Grid>
      <Field label="Type & Ukuran Mesin Cetak" testid="field-oc-mesin">
        <div className="space-y-2">
          <SelectInput testid="input-oc-mesin" value={s.mesin} options={[...machineList(), "Custom"]}
            onChange={(v) => { u("mesin", v); if (v !== "Custom") { const m = findMachine(v); if (m) { u("percetakan", m.percetakan); u("ukuranMax", m.ukuranMax); u("gramaturMax", m.gramaturMax); u("minLembar", String(m.minLembar)); u("hargaOngkos", String(m.hargaOngkos)); u("hargaSetelahMin", String(m.hargaSetelahMin)); } } }} />
          {s.mesin === "Custom" && (
            <TextInput testid="input-oc-mesin-custom" value={s.mesinCustom} onChange={(v) => u("mesinCustom", v)} placeholder="Tulis type & ukuran mesin cetak..." />
          )}
        </div>
      </Field>
      <Field label="Minimal Lembar Cetak" unit="Lbr" testid="field-oc-minlembar"><NumberInput testid="input-oc-minlembar" value={s.minLembar} onChange={(v) => u("minLembar", v)} /></Field>
      <Field label="Harga Ongkos Cetak (minimum)" unit="Rp" testid="field-oc-harga"><MoneyField testid="input-oc-harga" value={s.hargaOngkos} onChange={(v) => u("hargaOngkos", v)} /></Field>
      <Field label="Harga Setelah Min / Warna" unit="Rp" testid="field-oc-hargamin"><MoneyField testid="input-oc-hargamin" value={s.hargaSetelahMin} onChange={(v) => u("hargaSetelahMin", v)} /></Field>
    </Grid>
    <Box>
      <ResultLine label="Quantity Lembar Cetak" value={r.qtyLembarCetak} money={false} />
      <ResultLine label="Quantity Sisa Lembar" value={r.qtySisa} money={false} />
      <ResultLine label="Harga Cetak Minimum" value={r.hargaCetakMin} />
      <ResultLine label="Harga Setelah Minimum" value={r.hargaSetelahMinTotal} />
      <ResultLine label="Total Ongkos Cetak" value={r.total} strong />
    </Box>
    <div className="mt-4"><OutputCard label="Ongkos Cetak / Pcs" value={r.output} /></div>
  </>
);

const Design = ({ s, u, r }) => (
  <>
    <SectionTitle title="Design" hint="Jasa design dibagi jumlah order." />
    <Grid>
      <Field label="Nama Designer" testid="field-design-nama"><TextInput testid="input-design-nama" value={s.nama} onChange={(v) => u("nama", v)} placeholder="opsional" /></Field>
      <Field label="Jasa Design" unit="Rp" testid="field-design-jasa"><MoneyField testid="input-design-jasa" value={s.jasaDesign} onChange={(v) => u("jasaDesign", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-design-qty"><NumberInput testid="input-design-qty" value={s.qtyOrder} onChange={(v) => u("qtyOrder", v)} /></Field>
    </Grid>
    <div className="mt-6"><OutputCard label="Harga Design / Pcs" value={r.output} /></div>
  </>
);

const CTP = ({ s, u, r }) => (
  <>
    <SectionTitle title="CTP" hint="Biaya plat CTP per pcs." />
    <Grid>
      <Field label="Tipe Mesin Cetak" testid="field-ctp-mesin">
        <div className="space-y-2">
          <SelectInput testid="input-ctp-mesin" value={s.mesin} options={[...CTP_OPTIONS.map((c) => c.name), "Custom"]}
            onChange={(v) => { u("mesin", v); if (v !== "Custom") { const c = findCTP(v); if (c && c.biaya) u("biayaCTP", String(c.biaya)); } }} />
          {s.mesin === "Custom" && (
            <TextInput testid="input-ctp-mesin-custom" value={s.mesinCustom} onChange={(v) => u("mesinCustom", v)} placeholder="Tulis tipe mesin cetak..." />
          )}
        </div>
      </Field>
      <Field label="Ukuran Mesin (mm)" unit="P x L" testid="field-ctp-ukuran">
        <div className="flex gap-2">
          <NumberInput testid="input-ctp-ukuranp" value={s.ukuranP} onChange={(v) => u("ukuranP", v)} />
          <NumberInput testid="input-ctp-ukuranl" value={s.ukuranL} onChange={(v) => u("ukuranL", v)} />
        </div>
      </Field>
      <Field label="Biaya CTP / Lembar" unit="Rp" testid="field-ctp-biaya"><MoneyField testid="input-ctp-biaya" value={s.biayaCTP} onChange={(v) => u("biayaCTP", v)} /></Field>
      <Field label="Quantity Warna" unit="Warna" testid="field-ctp-warna"><NumberInput testid="input-ctp-warna" value={s.qtyWarna} onChange={(v) => u("qtyWarna", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-ctp-qty"><NumberInput testid="input-ctp-qty" value={s.qtyOrder} onChange={(v) => u("qtyOrder", v)} /></Field>
    </Grid>
    <div className="mt-6"><OutputCard label="Harga CTP / Pcs" value={r.output} /></div>
  </>
);

const Finishing = ({ s, u, r }) => (
  <>
    <SectionTitle title="Finishing" hint="Pilih jenis finishing → harga per cm terisi otomatis (bisa diubah)." />
    <Grid>
      <Field label="Jenis Finishing" testid="field-fin-jenis">
        <div className="space-y-2">
          <SelectInput testid="input-fin-jenis" value={s.jenis} options={[...FINISHING_OPTIONS.map((f) => f.name), "Custom"]}
            onChange={(v) => { const f = findFinishing(v); u("jenis", v); if (f) u("hargaPerCm", String(f.harga)); }} />
          {s.jenis === "Custom" && (
            <TextInput testid="input-fin-jenis-custom" value={s.jenisCustom} onChange={(v) => u("jenisCustom", v)} placeholder="Tulis jenis finishing..." />
          )}
        </div>
      </Field>
      <Field label="Ukuran Kertas (Cm)" unit="P x L" testid="field-fin-ukuran">
        <div className="flex gap-2">
          <NumberInput testid="input-fin-ukuranp" value={s.ukuranP} onChange={(v) => u("ukuranP", v)} />
          <NumberInput testid="input-fin-ukuranl" value={s.ukuranL} onChange={(v) => u("ukuranL", v)} />
        </div>
      </Field>
      <Field label="Harga per Cm" unit="Rp" testid="field-fin-harga"><MoneyField testid="input-fin-harga" value={s.hargaPerCm} onChange={(v) => u("hargaPerCm", v)} /></Field>
      <Field label="Quantity / Lembar" unit="Pcs" testid="field-fin-perlembar"><NumberInput testid="input-fin-perlembar" value={s.qtyPerLembar} onChange={(v) => u("qtyPerLembar", v)} /></Field>
    </Grid>
    <div className="mt-6"><OutputCard label="Harga Finishing / Pcs" value={r.output} /></div>
  </>
);

const Laminasi = ({ s, u, r }) => (
  <>
    <SectionTitle title="Single Face" hint="Ukuran (cm) dikonversi ke meter × harga index flute = harga per lembar, dibagi jumlah pcs per lembar, lalu ditambah waste." />
    <Grid>
      <Field label="Single Face" testid="field-lam-jenis">
        <div className="space-y-2">
          <SelectInput testid="input-lam-jenis" value={s.jenis} options={[...LAMINASI_OPTIONS, "Custom"]} onChange={(v) => u("jenis", v)} />
          {s.jenis === "Custom" && (
            <TextInput testid="input-lam-jenis-custom" value={s.jenisCustom} onChange={(v) => u("jenisCustom", v)} placeholder="Tulis jenis single face / flute..." />
          )}
        </div>
      </Field>
      <Field label="Ukuran (Cm)" unit="P x L" testid="field-lam-ukuran">
        <div className="flex gap-2">
          <NumberInput testid="input-lam-ukuranp" value={s.ukuranP} onChange={(v) => u("ukuranP", v)} />
          <NumberInput testid="input-lam-ukuranl" value={s.ukuranL} onChange={(v) => u("ukuranL", v)} />
        </div>
      </Field>
      <Field label="Harga Index Flute" unit="Rp" testid="field-lam-index"><MoneyField testid="input-lam-index" value={s.hargaIndex} onChange={(v) => u("hargaIndex", v)} /></Field>
      <Field label="1 Lembar jadi berapa Pcs" unit="Pcs" testid="field-lam-perpcs"><NumberInput testid="input-lam-perpcs" value={s.perPcs} onChange={(v) => u("perPcs", v)} /></Field>
      <Field label="Waste %" unit="(0.05 = 5%)" testid="field-lam-wes"><NumberInput testid="input-lam-wes" value={s.wes} onChange={(v) => u("wes", v)} /></Field>
    </Grid>
    <Box>
      <ResultLine label="Harga per Lembar" value={r.hargaLembar} />
      <ResultLine label="Harga per Pcs" value={r.perPcs} />
      <ResultLine label="Harga per Pcs + Waste" value={r.output} strong />
    </Box>
    <div className="mt-4"><OutputCard label="Harga Single Face / Pcs" value={r.output} /></div>
  </>
);

const Lem = ({ s, u, r }) => (
  <>
    <SectionTitle title="Lem" hint="Biaya lem per pcs." />
    <Grid>
      <Field label="Jenis Lem" testid="field-lem-jenis">
        <div className="space-y-2">
          <SelectInput testid="input-lem-jenis" value={s.jenis} options={[...LEM_OPTIONS, "Custom"]} onChange={(v) => u("jenis", v)} />
          {s.jenis === "Custom" && (
            <TextInput testid="input-lem-jenis-custom" value={s.jenisCustom} onChange={(v) => u("jenisCustom", v)} placeholder="Tulis jenis lem..." />
          )}
        </div>
      </Field>
      <Field label="Ukuran Spot Lem (Cm)" unit="P x L" testid="field-lem-ukuran">
        <div className="flex gap-2">
          <NumberInput testid="input-lem-spotp" value={s.spotP} onChange={(v) => u("spotP", v)} />
          <NumberInput testid="input-lem-spotl" value={s.spotL} onChange={(v) => u("spotL", v)} />
        </div>
      </Field>
      <Field label="Biaya / Cm" unit="Rp" testid="field-lem-biaya"><MoneyField testid="input-lem-biaya" value={s.biaya} onChange={(v) => u("biaya", v)} /></Field>
      <Field label="Waste %" unit="(0.06 = 6%)" testid="field-lem-wes"><NumberInput testid="input-lem-wes" value={s.wes} onChange={(v) => u("wes", v)} /></Field>
    </Grid>
    <div className="mt-6"><OutputCard label="Harga Lem / Pcs" value={r.output} /></div>
  </>
);

const PisauPapan = ({ s, u, r }) => (
  <>
    <SectionTitle title="Pisau & Papan Plong" hint="Biaya pisau plong dan papan plong (dua komponen terpisah di Total HPP)." />
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Pisau Plong</p>
    <Grid>
      <Field label="Biaya / Cm" unit="Rp" testid="field-pisau-biaya"><MoneyField testid="input-pisau-biaya" value={s.pisauBiaya} onChange={(v) => u("pisauBiaya", v)} /></Field>
      <Field label="Ukuran Kemasan /pcs" unit="Cm" testid="field-pisau-ukuran"><NumberInput testid="input-pisau-ukuran" value={s.pisauUkuran} onChange={(v) => u("pisauUkuran", v)} /></Field>
      <Field label="Quantity / Lembar" testid="field-pisau-qlembar"><NumberInput testid="input-pisau-qlembar" value={s.pisauQtyLembar} onChange={(v) => u("pisauQtyLembar", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-pisau-qorder"><NumberInput testid="input-pisau-qorder" value={s.pisauQtyOrder} onChange={(v) => u("pisauQtyOrder", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-8 mb-3">Papan Plong</p>
    <Grid>
      <Field label="Biaya / Cm" unit="Rp" testid="field-papan-biaya"><MoneyField testid="input-papan-biaya" value={s.papanBiaya} onChange={(v) => u("papanBiaya", v)} /></Field>
      <Field label="Ukuran Lembar (Cm)" unit="P x L" testid="field-papan-lembar">
        <div className="flex gap-2">
          <NumberInput testid="input-papan-lembarp" value={s.papanLembarP} onChange={(v) => u("papanLembarP", v)} />
          <NumberInput testid="input-papan-lembarl" value={s.papanLembarL} onChange={(v) => u("papanLembarL", v)} />
        </div>
      </Field>
      <Field label="Lebihan Ukuran" unit="Cm" testid="field-papan-lebihan"><NumberInput testid="input-papan-lebihan" value={s.papanLebihan} onChange={(v) => u("papanLebihan", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-papan-qorder"><NumberInput testid="input-papan-qorder" value={s.papanQtyOrder} onChange={(v) => u("papanQtyOrder", v)} /></Field>
    </Grid>
    <Box>
      <ResultLine label="Ukuran Papan (P x L)" value={`${r.papanP} x ${r.papanL}`} money={false} />
      <ResultLine label="Harga Pisau Plong / Pcs" value={r.pisau} />
      <ResultLine label="Harga Papan Plong / Pcs" value={r.papan} />
      <ResultLine label="Total Pisau + Papan / Pcs" value={r.total} strong />
    </Box>
  </>
);

const Plong = ({ s, u, r }) => (
  <>
    <SectionTitle title="Plong" hint="Biaya plong per pcs." />
    <Grid>
      <Field label="Ukuran Mesin Plong (Cm)" unit="P x L" testid="field-plong-ukuran">
        <div className="flex gap-2">
          <NumberInput testid="input-plong-ukuranp" value={s.ukuranP} onChange={(v) => u("ukuranP", v)} />
          <NumberInput testid="input-plong-ukuranl" value={s.ukuranL} onChange={(v) => u("ukuranL", v)} />
        </div>
      </Field>
      <Field label="Sistem Kerja" testid="field-plong-sistem"><TextInput testid="input-plong-sistem" value={s.sistem} onChange={(v) => u("sistem", v)} /></Field>
      <Field label="Jenis Laminasi" testid="field-plong-lam"><TextInput testid="input-plong-lam" value={s.jenisLaminasi} onChange={(v) => u("jenisLaminasi", v)} /></Field>
      <Field label="Biaya / Lembar" unit="Rp" testid="field-plong-biaya"><MoneyField testid="input-plong-biaya" value={s.biayaLbr} onChange={(v) => u("biayaLbr", v)} /></Field>
      <Field label="Quantity / Lembar" unit="Pcs" testid="field-plong-perlembar"><NumberInput testid="input-plong-perlembar" value={s.qtyPerLembar} onChange={(v) => u("qtyPerLembar", v)} /></Field>
    </Grid>
    <div className="mt-6"><OutputCard label="Harga Plong / Pcs" value={r.output} /></div>
  </>
);

const OngkosPlong = ({ s, u, r }) => (
  <>
    <SectionTitle title="Jasa Ongkos Plong" hint="Biaya jasa plong ke pihak lain per pcs." />
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Data Jasa Plong</p>
    <Grid>
      <Field label="Ukuran Mesin Plong (Cm)" unit="P x L" testid="field-op-mesin">
        <div className="flex gap-2">
          <NumberInput testid="input-op-mesinp" value={s.ukuranMesinP} onChange={(v) => u("ukuranMesinP", v)} />
          <NumberInput testid="input-op-mesinl" value={s.ukuranMesinL} onChange={(v) => u("ukuranMesinL", v)} />
        </div>
      </Field>
      <Field label="Minimum Lembar Plong" unit="Lbr" testid="field-op-min"><NumberInput testid="input-op-min" value={s.minLembarPlong} onChange={(v) => u("minLembarPlong", v)} /></Field>
      <Field label="Biaya Minimum" unit="Rp" testid="field-op-biayamin"><MoneyField testid="input-op-biayamin" value={s.biayaMinimum} onChange={(v) => u("biayaMinimum", v)} /></Field>
      <Field label="Biaya Setelah Minimum / Lbr" unit="Rp" testid="field-op-biayasetelah"><MoneyField testid="input-op-biayasetelah" value={s.biayaSetelahMin} onChange={(v) => u("biayaSetelahMin", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-8 mb-3">Order</p>
    <Grid>
      <Field label="Ukuran Lembar (Cm)" unit="P x L" testid="field-op-lembar">
        <div className="flex gap-2">
          <NumberInput testid="input-op-lembarp" value={s.ukuranLembarP} onChange={(v) => u("ukuranLembarP", v)} />
          <NumberInput testid="input-op-lembarl" value={s.ukuranLembarL} onChange={(v) => u("ukuranLembarL", v)} />
        </div>
      </Field>
      <Field label="Quantity per Lembar" unit="Pcs" testid="field-op-perlembar"><NumberInput testid="input-op-perlembar" value={s.qtyPerLembar} onChange={(v) => u("qtyPerLembar", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-op-qty"><NumberInput testid="input-op-qty" value={s.qtyOrder} onChange={(v) => u("qtyOrder", v)} /></Field>
    </Grid>
    <Box>
      <ResultLine label="Quantity Lembar Plong" value={r.qLembarPlong} money={false} />
      <ResultLine label="Quantity Sisa Lembar" value={r.qSisa} money={false} />
      <ResultLine label="Harga Plong Minimum" value={r.hargaPlongMin} />
      <ResultLine label="Harga Setelah Minimum" value={r.hargaSetelahMinTotal} />
      <ResultLine label="Total Harga Plong" value={r.total} strong />
    </Box>
    <div className="mt-4"><OutputCard label="Jasa Ongkos Plong / Pcs" value={r.output} /></div>
  </>
);

const Other = ({ s, u, r }) => (
  <>
    <SectionTitle title="Transportasi / Potong / Packing" hint="Biaya lain-lain: transport, packing, potong bahan, kopek & plong, potong rajang." />
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Transportasi</p>
    <Grid>
      <Field label="Lokasi Pengiriman" testid="field-oth-lokasi"><TextInput testid="input-oth-lokasi" value={s.lokasi} onChange={(v) => u("lokasi", v)} /></Field>
      <Field label="Biaya Transpor" unit="Rp" testid="field-oth-transpor"><MoneyField testid="input-oth-transpor" value={s.biayaTranspor} onChange={(v) => u("biayaTranspor", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-oth-qtyt"><NumberInput testid="input-oth-qtyt" value={s.qtyOrderT} onChange={(v) => u("qtyOrderT", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-7 mb-3">Packing / Admin / QC</p>
    <Grid>
      <Field label="Biaya Paking" unit="Rp" testid="field-oth-paking"><MoneyField testid="input-oth-paking" value={s.biayaPaking} onChange={(v) => u("biayaPaking", v)} /></Field>
      <Field label="Q Pcs Hasil / Hari" unit="Pcs" testid="field-oth-hari"><NumberInput testid="input-oth-hari" value={s.qtyHari} onChange={(v) => u("qtyHari", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-7 mb-3">Potong Bahan</p>
    <Grid>
      <Field label="Biaya Potong / Rim" unit="Rp" testid="field-oth-potongrim"><MoneyField testid="input-oth-potongrim" value={s.biayaPotongRim} onChange={(v) => u("biayaPotongRim", v)} /></Field>
      <Field label="Q Lembar Plano" unit="Lbr" testid="field-oth-planopotong"><NumberInput testid="input-oth-planopotong" value={s.qtyLembarPlano} onChange={(v) => u("qtyLembarPlano", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-oth-qtyp"><NumberInput testid="input-oth-qtyp" value={s.qtyOrderP} onChange={(v) => u("qtyOrderP", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-7 mb-3">Kopek & Plong</p>
    <Grid>
      <Field label="Biaya Kopek & Plong / Lbr" unit="Rp" testid="field-oth-kopek"><MoneyField testid="input-oth-kopek" value={s.biayaKopekLbr} onChange={(v) => u("biayaKopekLbr", v)} /></Field>
      <Field label="Q Pcs / Lbr" unit="Pcs" testid="field-oth-pcslbr"><NumberInput testid="input-oth-pcslbr" value={s.qtyPcsLbr} onChange={(v) => u("qtyPcsLbr", v)} /></Field>
    </Grid>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mt-7 mb-3">Potong Rajang / Struk Cetakan</p>
    <Grid>
      <Field label="Biaya Rajang / Rim" unit="Rp" testid="field-oth-rajangrim"><MoneyField testid="input-oth-rajangrim" value={s.biayaRajangRim} onChange={(v) => u("biayaRajangRim", v)} /></Field>
      <Field label="Q Lembar Kertas" unit="Lbr" testid="field-oth-planorajang"><NumberInput testid="input-oth-planorajang" value={s.qtyLembarRajang} onChange={(v) => u("qtyLembarRajang", v)} /></Field>
      <Field label="Quantity Order" unit="Pcs" testid="field-oth-qtyr"><NumberInput testid="input-oth-qtyr" value={s.qtyOrderR} onChange={(v) => u("qtyOrderR", v)} /></Field>
    </Grid>
    <Box>
      <ResultLine label="Transportasi / Pcs" value={r.transport} />
      <ResultLine label="Packing dll / Pcs" value={r.paking} />
      <ResultLine label="Potong Bahan / Pcs" value={r.potong} />
      <ResultLine label="Kopek & Plong / Pcs" value={r.kopek} />
      <ResultLine label="Potong Rajang / Pcs" value={r.rajang} />
      <ResultLine label="Total Others / Pcs" value={r.output} strong />
    </Box>
    <div className="mt-4"><OutputCard label="Total Biaya Others / Pcs" value={r.output} /></div>
  </>
);

const PaperDiagram = ({ d }) => {
  const kP = Number(d.kertasP) || 0, kL = Number(d.kertasL) || 0;
  const cP = Number(d.cetakP) || 0, cL = Number(d.cetakL) || 0;
  const g = (v) => formatGroup(v);
  if (!kP || !kL || !cP || !cL) return <p className="text-sm text-muted-foreground text-center py-12">Isi Ukuran Cetak untuk melihat visual.</p>;
  const S = 150 / Math.max(cP, cL);
  const cW = cL * S, cH = cP * S;
  const gSF = 16, gK = 16;
  const sfW = cW + gSF * 2, sfH = cH + gSF * 2;
  const kW = sfW + gK * 2, kH = sfH + gK * 2;
  const pad = 54;
  const svgW = kW + pad * 2, svgH = kH + pad * 2;
  const cx = pad + kW / 2, cy = pad + kH / 2;
  const R = (w, h, props) => <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} {...props} />;
  // Garis arah serat dibalik dari sebelumnya: "Menuju P" kini digambar mendatar, "Menuju L" tegak.
  const grainVertical = d.arahSerat === "L";
  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="max-w-full h-auto" data-testid="uk-paper-diagram">
      <defs>
        <marker id="ahd" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#ffffff" />
        </marker>
      </defs>
      {R(kW, kH, { fill: "#DBEAFE", stroke: "#2563EB", strokeWidth: 1.3, strokeDasharray: "5 3", rx: 2 })}
      {R(sfW, sfH, { fill: "#60A5FA", fillOpacity: 0.55, stroke: "#3B82F6", strokeWidth: 1 })}
      {R(cW, cH, { fill: "#1D4ED8", fillOpacity: 0.92, stroke: "#1E3A8A", strokeWidth: 1 })}
      {grainVertical
        ? <line x1={cx} y1={cy - cH / 2 + 10} x2={cx} y2={cy + cH / 2 - 10} stroke="#ffffff" strokeWidth="1.5" markerStart="url(#ahd)" markerEnd="url(#ahd)" />
        : <line x1={cx - cW / 2 + 10} y1={cy} x2={cx + cW / 2 - 10} y2={cy} stroke="#ffffff" strokeWidth="1.5" markerStart="url(#ahd)" markerEnd="url(#ahd)" />}
      <text x={cx} y={pad - 30} textAnchor="middle" fontSize="11" fill="#1E3A8A" fontWeight="700">L {g(kL)} cm</text>
      <text x={pad - 32} y={cy} textAnchor="middle" fontSize="11" fill="#1E3A8A" fontWeight="700" transform={`rotate(-90 ${pad - 32} ${cy})`}>P {g(kP)} cm</text>
      <text x={cx} y={cy - kH / 2 + 12} textAnchor="middle" fontSize="8" fill="#1E3A8A" fontWeight="600">Kertas</text>
      <text x={cx} y={cy - sfH / 2 + 11} textAnchor="middle" fontSize="8" fill="#0F172A" fontWeight="600">Single Face</text>
      <text x={cx} y={cy - cH / 2 + 12} textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="600">Cetak</text>
    </svg>
  );
};

const LegendDot = ({ style, label }) => (
  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={style} />{label}</span>
);

const UkArea = ({ s, u, r }) => {
  const g = (v) => formatGroup(v);
  const sf = r.arahSerat === "P" ? `P ${g(r.sfP)} x L ${g(r.sfL)} cm` : `L ${g(r.sfL)} x P ${g(r.sfP)} cm`;
  return (
    <>
      <SectionTitle title="Uk Area Cetak"
        hint="Patokan: Ukuran Cetak. Kertas P = Cetak P + Selisih Kres P + Anleg P; Kertas L = Cetak L + Selisih Kres L. Single Face = Kertas − Selisih Single Face. Tidak masuk ke Total HPP." />
      <Grid>
        <Field label="Bahan" testid="field-uk-bahan"><TextInput testid="input-uk-bahan" value={s.bahan} onChange={(v) => u("bahan", v)} /></Field>
        <Field label="Ukuran Plano (Cm)" unit="P x L" testid="field-uk-plano">
          <div className="flex gap-2">
            <NumberInput testid="input-uk-planop" value={s.planoP} onChange={(v) => u("planoP", v)} />
            <NumberInput testid="input-uk-planol" value={s.planoL} onChange={(v) => u("planoL", v)} />
          </div>
        </Field>
        <Field label="Ukuran Cetak (Cm)" unit="P x L" testid="field-uk-cetak">
          <div className="flex gap-2">
            <NumberInput testid="input-uk-cetakp" value={s.cetakP} onChange={(v) => u("cetakP", v)} />
            <NumberInput testid="input-uk-cetakl" value={s.cetakL} onChange={(v) => u("cetakL", v)} />
          </div>
        </Field>
        <Field label="Selisih Kres P (Cm)" unit="Cm" testid="field-uk-kresp"><NumberInput testid="input-uk-kresp" value={s.kresP} onChange={(v) => u("kresP", v)} /></Field>
        <Field label="Selisih Kres L (Cm)" unit="Cm" testid="field-uk-kresl"><NumberInput testid="input-uk-kresl" value={s.kresL} onChange={(v) => u("kresL", v)} /></Field>
        <Field label="Selisih Single Face (Cm)" unit="Cm" testid="field-uk-sf"><NumberInput testid="input-uk-sf" value={s.sf} onChange={(v) => u("sf", v)} /></Field>
        <Field label="Anleg P (Cm)" unit="Cm" testid="field-uk-anleg"><NumberInput testid="input-uk-anleg" value={s.anlegP} onChange={(v) => u("anlegP", v)} /></Field>
        <Field label="Arah Serat" testid="field-uk-serat">
          <SelectInput testid="input-uk-serat" value={s.arahSerat}
            options={[{ value: "P", label: "Menuju P (Panjang)" }, { value: "L", label: "Menuju L (Lebar)" }]}
            onChange={(v) => u("arahSerat", v)} />
        </Field>
      </Grid>
      <div className="mt-6 grid md:grid-cols-2 gap-5">
        <div className="rounded-lg border border-border bg-secondary/50 p-4 md:p-5">
          <ResultLine label="Ukuran Plano (P x L)" value={`P ${g(r.planoP)} x L ${g(r.planoL)} cm`} money={false} />
          <ResultLine label="Ukuran Kertas (P x L)" value={`P ${g(r.kertasP)} x L ${g(r.kertasL)} cm`} money={false} />
          <ResultLine label="Ukuran Cetak (P x L)" value={`P ${g(r.cetakP)} x L ${g(r.cetakL)} cm`} money={false} />
          <ResultLine label="Ukuran Single Face" value={sf} money={false} strong testid="uk-result-sf" />
          <div className="mt-3 border-t border-border pt-2">
            <ResultLine label="Selisih Kertas → Cetak (P x L)" value={`${g(r.kresP + r.anlegP)} x ${g(r.kresL)} cm`} money={false} testid="uk-result-selisih-cetak" />
            <ResultLine label="Selisih Kertas → Single Face" value={`${g(r.sf)} cm`} money={false} />
            <ResultLine label="Selisih Single Face → Cetak (P x L)" value={`${g(r.sfCetakP)} x ${g(r.sfCetakL)} cm`} money={false} testid="uk-result-selisih-sf" />
            <ResultLine label="— terdiri dari Kres P + Anleg P" value={`${g(r.kresP) || 0} + ${g(r.anlegP) || 0} cm`} money={false} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center">
          <PaperDiagram d={r} />
          <p className="mt-2 text-[11px] italic text-muted-foreground text-center">*Ilustrasi skematik — jarak gap diperbesar agar terlihat, bukan skala sebenarnya.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <LegendDot style={{ background: "#DBEAFE", border: "1px dashed #2563EB" }} label="Kertas" />
            <LegendDot style={{ background: "#60A5FA" }} label="Single Face" />
            <LegendDot style={{ background: "#1D4ED8" }} label="Cetak" />
            <span className="flex items-center gap-1.5">↔ Arah Serat</span>
          </div>
        </div>
      </div>
    </>
  );
};

export const MODULES = [
  { id: "kertas", label: "Kertas", icon: FileStack, Component: Kertas },
  { id: "warna", label: "Warna", icon: Palette, Component: Warna },
  { id: "ongkosCetak", label: "Ongkos Cetak", icon: Printer, Component: OngkosCetak },
  { id: "design", label: "Design", icon: PenTool, Component: Design },
  { id: "ctp", label: "CTP", icon: Layers, Component: CTP },
  { id: "finishing", label: "Finishing", icon: Sparkles, Component: Finishing },
  { id: "laminasi", label: "Single Face", icon: Layers, Component: Laminasi },
  { id: "lem", label: "Lem", icon: Droplets, Component: Lem },
  { id: "pisauPapan", label: "Pisau & Papan", icon: Scissors, Component: PisauPapan },
  { id: "plong", label: "Plong", icon: SquareStack, Component: Plong },
  { id: "ongkosPlong", label: "Ongkos Plong", icon: Grid3x3, Component: OngkosPlong },
  { id: "other", label: "Other", icon: Truck, Component: Other },
  { id: "ukArea", label: "Uk Area Cetak", icon: Ruler, Component: UkArea },
];

export const SUMMARY_ICON = LayoutDashboard;
