import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, FileDown, RotateCcw, FolderOpen, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { defaultState, emptyState } from "@/lib/hppDefaults";
import { Heading } from "@/components/ui/heading";
import { calcAll, normalizeWarna } from "@/lib/hppCalc";
import { formatRp } from "@/lib/format";
import { MODULES, SUMMARY_ICON } from "@/components/hpp/modules";
import SummaryPanel from "@/components/hpp/SummaryPanel";
import MoneyInput from "@/components/MoneyInput";
import * as api from "@/lib/hppApi";

const NAV = [{ id: "summary", label: "Ringkasan", icon: SUMMARY_ICON }, ...MODULES];

// Komponen biaya per tahap (modul Pisau & Papan punya 2 komponen).
const MODULE_COMPONENTS = {
  kertas: [["kertas", "Kertas"]], warna: [["warna", "Warna"]], ongkosCetak: [["ongkosCetak", "Ongkos Cetak"]],
  design: [["design", "Design"]], ctp: [["ctp", "CTP"]], finishing: [["finishing", "Finishing"]],
  laminasi: [["laminasi", "Single Face"]], lem: [["lem", "Lem"]],
  pisauPapan: [["pisauPlong", "Pisau Plong"], ["papanPlong", "Papan Plong"]],
  plong: [["plong", "Plong"]], ongkosPlong: [["ongkosPlong", "Jasa Ongkos Plong"]],
  other: [["other", "Transportasi / Potong / Packing"]],
};

/** Opsi "Penghitungan sendiri": rumus manual + Biaya/Pcs yang menggantikan hasil otomatis. */
function ManualBox({ compKey, label, value, onChange, showLabel }) {
  const m = value || {};
  const set = (k, v) => onChange({ ...m, [k]: v });
  return (
    <div className={`mb-5 rounded-lg border p-3.5 ${m.on ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-secondary/40"}`} data-testid={`manual-${compKey}`}>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={!!m.on} onChange={(e) => set("on", e.target.checked)} />
        Penghitungan sendiri{showLabel ? ` — ${label}` : ""}
        <span className="text-xs font-normal text-muted-foreground">(Biaya/Pcs manual menggantikan hasil otomatis)</span>
      </label>
      {m.on && (
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Perhitungan</div>
            <textarea rows={2} value={m.rumus || ""} onChange={(e) => set("rumus", e.target.value)}
              placeholder="cth: (2 kg × Rp 85.000 + Rp 150.000) ÷ 5.000 pcs"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Biaya / Pcs</div>
            <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
              <span className="text-sm text-muted-foreground">Rp</span>
              <MoneyInput value={m.biaya ?? ""} onChange={(v) => set("biaya", v)} placeholder="0"
                className="w-full bg-transparent text-right text-sm font-semibold tabular-nums outline-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Draf kalkulator disimpan di browser agar isian tidak hilang saat pindah ke menu lain / refresh.
const DRAFT_KEY = "sca_hpp_draft_v1";
const NEW_META = { id: null, name: "Produk Baru", customer: "", notes: "" };
function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}
/** Gabungkan draf dengan struktur kosong (kalau ada field baru di versi berikutnya). */
function mergeInputs(base, inputs) {
  const merged = { ...base };
  Object.keys(inputs || {}).forEach((k) => {
    const v = inputs[k];
    merged[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(base[k] || {}), ...v } : v;
  });
  return merged;
}

export default function HppCalculator() {
  const [state, setState] = useState(() => {
    const d = readDraft();
    return d?.state ? mergeInputs(emptyState(), d.state) : emptyState();
  });
  const [active, setActive] = useState(() => readDraft()?.active || "summary");
  const [meta, setMeta] = useState(() => readDraft()?.meta || NEW_META);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ state, active, meta })); } catch { /* abaikan */ }
  }, [state, active, meta]);
  const [saved, setSaved] = useState([]);
  const [drawer, setDrawer] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const res = useMemo(() => calcAll(state), [state]);

  const loadSaved = () => api.listCalculations().then(setSaved).catch(() => {});
  useEffect(() => { loadSaved(); }, []);

  const update = (section, field, value) =>
    setState((p) => ({ ...p, [section]: { ...p[section], [field]: value } }));

  const setRate = (field, value) =>
    setState((p) => ({ ...p, total: { ...p.total, [field]: value } }));

  const toggleEnabled = (key) =>
    setState((p) => ({ ...p, enabled: { ...p.enabled, [key]: (p.enabled?.[key] === false) } }));

  const snapshot = () => ({
    name: meta.name || "HPP", customer: meta.customer, notes: meta.notes,
    inputs: state,
    result: {
      components: res.components.map((c) => ({ key: c.key, label: c.label, value: c.value, enabled: c.enabled, manual: c.manual, rumus: c.rumus })),
      subtotal: res.subtotal,
      labaPct: res.labaPct, bungaPct: res.bungaPct, ppnPct: res.ppnPct,
      laba: res.laba, bunga: res.bunga, ppn: res.ppn, final: res.final,
    },
  });

  const doSave = async () => {
    try {
      const payload = snapshot();
      if (meta.id) {
        const up = await api.updateCalculation(meta.id, payload);
        toast.success("Perhitungan diperbarui");
        setMeta((m) => ({ ...m, id: up.id }));
      } else {
        const created = await api.saveCalculation(payload);
        setMeta((m) => ({ ...m, id: created.id }));
        toast.success("Perhitungan tersimpan");
      }
      setSaveOpen(false);
      loadSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const doExport = async () => {
    try { await api.exportHppPdf({ ...snapshot(), company: "Percetakan SCA" }); toast.success("PDF diunduh"); }
    catch { toast.error("Gagal membuat PDF"); }
  };

  const loadCalc = (c) => {
    const base = defaultState();
    const merged = { ...base };
    Object.keys(c.inputs || {}).forEach((k) => {
      const v = c.inputs[k];
      merged[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(base[k] || {}), ...v } : v;
    });
    // Data lama (format Warna sebelumnya) dikonversi ke daftar tinta.
    if (c.inputs?.warna && !Array.isArray(c.inputs.warna.tintas)) merged.warna = normalizeWarna(c.inputs.warna);
    setState(merged);
    setMeta({ id: c.id, name: c.name, customer: c.customer || "", notes: c.notes || "" });
    setDrawer(false);
    setActive("summary");
    toast.success(`Dimuat: ${c.name}`);
  };

  const removeCalc = async (e, id) => {
    e.stopPropagation();
    try { await api.deleteCalculation(id); loadSaved(); if (meta.id === id) newCalc(); toast.success("Dihapus"); }
    catch { toast.error("Gagal menghapus"); }
  };

  const newCalc = () => {
    setState(emptyState());
    setMeta(NEW_META);
    setActive("summary");
  };

  const ActiveModule = MODULES.find((m) => m.id === active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Heading title="Kalkulator HPP" description="Percetakan SCA — 14 modul biaya, live reactive." />
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="btn-new" onClick={newCalc} title="Baru"
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border bg-card text-muted-foreground text-sm font-medium shadow-soft transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/30 hover:bg-secondary hover:text-foreground hover:shadow-lift active:scale-[0.985]">
            <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Baru</span>
          </button>
          <button data-testid="btn-open-saved" onClick={() => { loadSaved(); setDrawer(true); }}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border bg-card text-muted-foreground text-sm font-medium shadow-soft transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/30 hover:bg-secondary hover:text-foreground hover:shadow-lift active:scale-[0.985]">
            <FolderOpen className="h-4 w-4" /> <span className="hidden sm:inline">Tersimpan</span>
          </button>
          <button data-testid="btn-export-pdf" onClick={doExport}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-primary/40 bg-card text-primary text-sm font-medium shadow-soft transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:border-primary hover:bg-primary/5 hover:shadow-lift active:scale-[0.985]">
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button data-testid="btn-save" onClick={() => setSaveOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-soft transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-primary/90 hover:shadow-glow active:scale-[0.985]">
            <Save className="h-4 w-4" /> Simpan
          </button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden -mx-4 md:-mx-0 sticky top-16 z-30 bg-background/90 backdrop-blur border-y border-border">
        <div className="flex gap-1 overflow-x-auto px-4 md:px-0 py-2">
          {NAV.map((m) => (
            <button key={m.id} data-testid={`tab-${m.id}`} onClick={() => setActive(m.id)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {NAV.map((m) => {
              const Icon = m.icon;
              const on = active === m.id;
              return (
                <button key={m.id} data-testid={`nav-${m.id}`} onClick={() => setActive(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-4 ${on ? "bg-primary/5 border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-secondary"}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col 2xl:flex-row gap-6">
          <div className="flex-1 min-w-0">
            {/* Catatan — tampil di PDF (kotak di bawah tanggal, di atas Rincian Komponen Biaya) */}
            <div className="mb-4 rounded-xl border border-border/70 bg-card p-4 shadow-soft" data-testid="hpp-notes-card">
              <label htmlFor="hpp-notes" className="text-sm font-semibold">Catatan <span className="font-normal text-muted-foreground">(tampil di PDF)</span></label>
              <textarea id="hpp-notes" rows={2} value={meta.notes || ""} onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
                placeholder="cth: Harga berlaku 14 hari, belum termasuk ongkos kirim."
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={active}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="stagger-in rounded-xl border border-border/70 bg-card p-5 shadow-soft transition-shadow duration-200 ease-out hover:shadow-lift md:p-8">
                {active === "summary" ? (
                  <>
                    <div className="mb-5">
                      <h3 className="font-display text-xl font-semibold">Ringkasan Total HPP</h3>
                      <p className="text-sm text-muted-foreground mt-1">Total dari 13 komponen biaya, lalu ditambah Laba, Bunga, dan PPN.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Subtotal HPP / Pcs</p>
                        <p className="tabular-nums text-2xl font-semibold mt-1">{formatRp(res.subtotal)}</p>
                      </div>
                      <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-4">
                        <p className="text-xs uppercase tracking-wide text-primary/80 font-semibold">Harga Jual / Pcs</p>
                        <p className="tabular-nums text-2xl font-semibold text-primary mt-1">{formatRp(res.final)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Klik komponen pada panel kanan untuk membuka & mengubah inputnya. Semua perhitungan langsung otomatis.</p>
                  </>
                ) : (
                  <>
                    {(MODULE_COMPONENTS[active] || []).map(([key, label], _i, arr) => (
                      <ManualBox key={key} compKey={key} label={label} showLabel={arr.length > 1}
                        value={state.manual?.[key]}
                        onChange={(v) => setState((p) => ({ ...p, manual: { ...(p.manual || {}), [key]: v } }))} />
                    ))}
                    <ActiveModule.Component s={state[active]} u={(f, v) => update(active, f, v)} r={res[active]} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Summary rail */}
          <div className="2xl:w-[360px] shrink-0">
            <div className="2xl:sticky 2xl:top-24">
              <SummaryPanel res={res} rates={state.total}
                onRate={setRate}
                enabled={state.enabled} onToggle={toggleEnabled}
                onSelect={(k) => { const map = { pisauPlong: "pisauPapan", papanPlong: "pisauPapan" }; setActive(map[k] || k); }} />
            </div>
          </div>
        </main>
      </div>

      {/* Save dialog */}
      <AnimatePresence>
        {saveOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setSaveOpen(false)} />
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              className="relative w-full max-w-md rounded-xl bg-card shadow-xl p-6 border border-border" data-testid="save-dialog">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">Simpan Perhitungan</h3>
                <button onClick={() => setSaveOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama Produk</label>
                  <input data-testid="input-save-name" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                    className="mt-1.5 w-full h-11 rounded-md border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer (opsional)</label>
                  <input data-testid="input-save-customer" value={meta.customer} onChange={(e) => setMeta({ ...meta, customer: e.target.value })}
                    className="mt-1.5 w-full h-11 rounded-md border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catatan (opsional)</label>
                  <textarea data-testid="input-save-notes" value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
                    rows={2} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setSaveOpen(false)} className="h-10 px-4 rounded-md border border-border text-muted-foreground text-sm font-medium hover:bg-secondary">Batal</button>
                <button data-testid="btn-confirm-save" onClick={doSave} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  {meta.id ? "Perbarui" : "Simpan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDrawer(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25 }}
              data-testid="saved-drawer">
              <div className="flex items-center justify-between px-5 h-16 border-b border-border">
                <h3 className="font-display text-lg font-semibold">Perhitungan Tersimpan</h3>
                <button onClick={() => setDrawer(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <button onClick={() => { newCalc(); setDrawer(false); }} data-testid="btn-new-drawer"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary transition-colors">
                  <Plus className="h-4 w-4" /> Perhitungan Baru
                </button>
                {saved.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">Belum ada perhitungan tersimpan.</p>}
                {saved.map((c) => (
                  <div key={c.id} onClick={() => loadCalc(c)} data-testid={`saved-item-${c.id}`}
                    className="group cursor-pointer rounded-lg border border-border p-4 hover:border-primary/40 hover:bg-primary/[0.04] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        {c.customer && <p className="text-sm text-muted-foreground truncate">{c.customer}</p>}
                      </div>
                      <button onClick={(e) => removeCalc(e, c.id)} data-testid={`btn-delete-${c.id}`}
                        className="text-muted-foreground/50 group-hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="tabular-nums text-primary font-semibold mt-2">{formatRp(c.result?.final || 0)} <span className="text-xs text-muted-foreground font-sans">/ pcs</span></p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
