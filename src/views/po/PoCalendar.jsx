import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X, ArrowUpRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/poApi";
import { useLang } from "@/context/LangContext";
import { Button } from "@/components/ui/button";
import PageContainer from "@/components/layout/PageContainer";
import { sortStages, stagePos } from "@/lib/poStages";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/*
 * Warna kategori (permintaan): Tahap 1–4 (menunggu) = ungu, Tahap 5–11 (proses) = merah,
 * Pengiriman (Selesai Cetak & Pengiriman) = oranye.
 */
const CAT = {
  tunggu: { label: "Tahap 1–4 · menunggu", pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", dot: "bg-violet-600", bar: "bg-violet-600" },
  proses: { label: "Tahap 5–11 · produksi", pill: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300", dot: "bg-red-600", bar: "bg-red-600" },
  kirim: { label: "Pengiriman", pill: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", dot: "bg-orange-600", bar: "bg-orange-600" },
};
const catOfStage = (n) => (n === 11 ? "kirim" : stagePos(n) <= 4 ? "tunggu" : "proses");
const catOfPo = (p) => {
  const c = p.computed || {};
  if (c.print_completed || c.current_stage === 11) return "kirim";
  if (c.current_stage) return catOfStage(c.current_stage);
  return "tunggu";
};

const pad = (n) => String(n).padStart(2, "0");
/** Tanggal lokal → "YYYY-MM-DD" (tanpa geser zona waktu). */
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slash = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : "-"; };
function monthName(d, lang) { return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" }); }
function dayTitle(ds, lang) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
const MAX_PILLS = 3;
/** Hari ke-berapa (1-based) tanggal b dihitung dari tanggal a. */
const dayIndex = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;

export default function PoCalendar() {
  const { t, stageName, lang } = useLang();
  const todayDs = ymd(new Date());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [schedules, setSchedules] = useState([]);
  const [pos, setPos] = useState([]);
  const [selectedDay, setSelectedDay] = useState(todayDs);
  const [open, setOpen] = useState(false);
  const [formPo, setFormPo] = useState("");
  const [formStage, setFormStage] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [editSched, setEditSched] = useState(null);
  const [hideCat, setHideCat] = useState({});

  const load = async () => {
    try { const [s, p] = await Promise.all([api.listSchedules(), api.listPos()]); setSchedules(s); setPos(p); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal memuat kalender"); }
  };
  useEffect(() => { load(); }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);

  const poById = useMemo(() => Object.fromEntries(pos.map((p) => [p.id, p])), [pos]);
  const activePos = useMemo(() => pos.filter((p) => p.est_start && p.est_end && !p.computed?.is_completed), [pos]);

  /** Entri per hari: jadwal tahap (spesifik) + PO yang sedang berjalan (rentang Est. Mulai–Selesai). */
  const entriesOf = (ds) => {
    const sched = schedules.filter((s) => s.date <= ds && ds <= (s.end_date || s.date)).map((s) => ({
      key: `s-${s.id}`, kind: "jadwal", cat: catOfStage(s.stage_number), sched: s,
      po: poById[s.po_id], label: s.po_number, sub: `T${stagePos(s.stage_number)} · ${s.client_name}`,
      isStart: s.date === ds, isEnd: (s.end_date || s.date) === ds, multi: (s.end_date || s.date) !== s.date,
    }));
    const runs = activePos.filter((p) => p.est_start <= ds && ds <= p.est_end).map((p) => ({
      key: `p-${p.id}`, kind: "po", cat: catOfPo(p), po: p, label: p.po_number, sub: p.client_name,
      isStart: p.est_start === ds, isEnd: p.est_end === ds,
    }));
    return [...sched, ...runs].filter((e) => !hideCat[e.cat]);
  };

  const weekdays = lang === "id" ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openAdd = (ds) => { setEditSched(null); setFormDate(ds); setFormEnd(ds); setFormPo(""); setFormStage(""); setOpen(true); };
  const openEdit = (s) => {
    setEditSched(s); setFormPo(s.po_id); setFormStage(String(s.stage_number));
    setFormDate(s.date); setFormEnd(s.end_date || s.date); setOpen(true);
  };
  const addSchedule = async () => {
    if (!formPo || !formStage || !formDate) { toast.error(t("selectPO")); return; }
    const end = formEnd || formDate;
    if (end < formDate) { toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai"); return; }
    const payload = { po_id: formPo, stage_number: parseInt(formStage), date: formDate, end_date: end };
    try {
      if (editSched) await api.updateSchedule(editSched.id, payload);
      else await api.createSchedule(payload);
      setOpen(false); load(); toast.success(editSched ? "Jadwal diperbarui" : "Jadwal ditambah");
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
  };
  const delSchedule = async (sid) => {
    try { await api.deleteSchedule(sid); load(); toast.success("Jadwal dihapus"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
  };
  const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(todayDs); };

  const selectedPoObj = pos.find((p) => p.id === formPo);
  const dayEntries = selectedDay ? entriesOf(selectedDay) : [];
  const daySched = dayEntries.filter((e) => e.kind === "jadwal");
  const dayRuns = dayEntries.filter((e) => e.kind === "po");

  return (
    <PageContainer
      testid="po-calendar-page"
      pageEyebrow={lang === "en" ? "Production" : "Produksi"}
      pageTitle={t("schedule")}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Bulan sebelumnya" onClick={() => setCursor(new Date(year, month - 1, 1))} data-testid="cal-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[150px] text-center text-base font-bold capitalize">{monthName(cursor, lang)}</div>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Bulan berikutnya" onClick={() => setCursor(new Date(year, month + 1, 1))} data-testid="cal-next"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={goToday} data-testid="cal-today">{lang === "en" ? "Today" : "Hari ini"}</Button>
        </div>
        {/* Legenda = juga filter (klik untuk sembunyikan / tampilkan) */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-foreground/80">
          {Object.entries(CAT).map(([k, c]) => (
            <button key={k} type="button" onClick={() => setHideCat((h) => ({ ...h, [k]: !h[k] }))} aria-pressed={!hideCat[k]}
              title="Klik untuk sembunyikan / tampilkan" className={`flex items-center gap-1.5 transition ${hideCat[k] ? "opacity-40 line-through" : ""}`}
              data-testid={`cal-legend-${k}`}>
              <span className={`h-2.5 w-2.5 rounded-[3px] ${c.dot}`} /> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Grid bulanan */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
            {weekdays.map((w, i) => <div key={w} className={`px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] ${i >= 5 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              const edgeR = (i + 1) % 7 === 0 ? "" : "border-r border-border/60";
              if (!date) return <div key={i} className={`min-h-[70px] border-b border-border/60 bg-secondary/30 sm:min-h-[104px] ${edgeR}`} />;
              const ds = ymd(date);
              const entries = entriesOf(ds);
              const isToday = ds === todayDs;
              const sel = selectedDay === ds;
              return (
                <button key={i} type="button" data-testid={`cal-day-${ds}`} onClick={() => setSelectedDay(ds)}
                  className={`group relative flex min-h-[70px] min-w-0 flex-col gap-0.5 border-b border-border/60 p-1 text-left align-top transition-colors sm:min-h-[104px] sm:p-1.5 ${edgeR} ${sel ? "outline outline-2 -outline-offset-2 outline-primary" : "hover:bg-secondary/40"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold ${isToday ? "bg-primary text-primary-foreground" : ""}`}>{date.getDate()}</span>
                    {entries.length > 0 && <span className="text-[10px] text-muted-foreground sm:hidden">{entries.length}</span>}
                  </div>
                  {/* Mobile: titik warna */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {entries.slice(0, 6).map((e) => <span key={e.key} className={`h-1.5 w-1.5 rounded-full ${CAT[e.cat].dot}`} />)}
                  </div>
                  {/* Tablet/desktop: label PO ala Notion */}
                  <div className="mt-1 hidden min-w-0 flex-col gap-[3px] sm:flex">
                    {entries.slice(0, MAX_PILLS).map((e) => (
                      <span key={e.key} title={`${e.label} · ${e.sub}`}
                        className={`truncate rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight ${CAT[e.cat].pill} ${e.kind === "jadwal" ? "" : "opacity-80"}`}>
                        {e.kind === "jadwal" ? (e.multi && !e.isStart ? "↳ " : "● ") : ""}{e.label}{e.sub ? ` · ${e.sub}` : ""}
                      </span>
                    ))}
                    {entries.length > MAX_PILLS && <span className="px-1 text-[10px] font-medium text-muted-foreground">+{entries.length - MAX_PILLS} lainnya</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda harian */}
        <aside className="flex flex-col rounded-xl border border-border bg-card lg:sticky lg:top-0 lg:max-h-[calc(100vh-180px)]" data-testid="day-detail" aria-label="Agenda">
          <div className="flex items-start justify-between gap-2 p-[18px] pb-3">
            <div>
              <div className="text-xs text-muted-foreground">Agenda · {dayEntries.length} entri</div>
              <div className="text-base font-bold capitalize">{selectedDay ? dayTitle(selectedDay, lang) : "-"}</div>
            </div>
            <Button size="sm" className="shrink-0 gap-1" onClick={() => openAdd(selectedDay)} data-testid="add-schedule-day"><Plus className="h-4 w-4" /> Jadwal</Button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-[18px] pb-[18px]">
            {dayEntries.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada PO pada tanggal ini.</p>}

            {daySched.length > 0 && (
              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Jadwal tahap</div>
                <div className="space-y-2">
                  {daySched.map((e) => (
                    <div key={e.key} className="flex items-start gap-3 rounded-[10px] border border-border p-3">
                      <span className={`w-1 self-stretch rounded ${CAT[e.cat].bar}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{e.label} <span className="font-normal text-muted-foreground">· {e.sched.client_name}</span></div>
                        <div className="text-xs text-muted-foreground">Tahap {stagePos(e.sched.stage_number)}: {stageName(e.sched.stage_number)}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {e.multi ? <>{slash(e.sched.date)} → {slash(e.sched.end_date)} · hari ke-{dayIndex(e.sched.date, selectedDay)} dari {dayIndex(e.sched.date, e.sched.end_date)}</> : slash(e.sched.date)}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Ubah jadwal" onClick={() => openEdit(e.sched)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {e.po && <Button asChild size="icon" variant="ghost" className="h-7 w-7"><Link to={`/po/pos/${e.po.id}`} title="Buka PO"><ArrowUpRight className="h-4 w-4" /></Link></Button>}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Hapus jadwal" onClick={() => delSchedule(e.sched.id)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {dayRuns.length > 0 && (
              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PO berjalan ({dayRuns.length})</div>
                <div className="space-y-2">
                  {dayRuns.map((e) => (
                    <Link key={e.key} to={`/po/pos/${e.po.id}`}
                      className="flex gap-3 rounded-[10px] border border-border p-3 transition hover:bg-secondary/50">
                      <span className={`w-1 self-stretch rounded ${CAT[e.cat].bar}`} />
                      <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{e.label} <span className="font-normal text-muted-foreground">· {e.sub}</span></div>
                        {(e.isStart || e.isEnd) && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${e.isEnd ? "bg-rose-500/15 text-rose-600" : "bg-sky-500/15 text-sky-600"}`}>{e.isEnd ? "Target selesai" : "Mulai"}</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{e.po.computed?.current_stage_name || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{slash(e.po.est_start)} → {slash(e.po.est_end)}{e.po.item_type ? ` · ${e.po.item_type}` : ""}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editSched ? "Ubah Jadwal Tahap" : t("scheduleStage")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("selectPO")}</Label>
              <Select value={formPo} onValueChange={setFormPo} disabled={!!editSched}>
                <SelectTrigger data-testid="sched-po"><SelectValue placeholder={t("selectPO")} /></SelectTrigger>
                <SelectContent>{pos.filter((p) => !p.computed?.is_completed).map((p) => <SelectItem key={p.id} value={p.id}>{p.po_number} · {p.client_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("selectStage")}</Label>
              <Select value={formStage} onValueChange={setFormStage} disabled={!formPo}>
                <SelectTrigger data-testid="sched-stage"><SelectValue placeholder={t("selectStage")} /></SelectTrigger>
                <SelectContent>{sortStages(selectedPoObj?.enabled_stages || []).map((n) => <SelectItem key={n} value={String(n)}>Tahap {stagePos(n)}: {stageName(n)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal mulai</Label>
                <Input type="date" value={formDate} data-testid="sched-start"
                  onChange={(e) => { const v = e.target.value; setFormDate(v); if (!formEnd || formEnd < v) setFormEnd(v); }} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal selesai</Label>
                <Input type="date" value={formEnd} min={formDate} data-testid="sched-end" onChange={(e) => setFormEnd(e.target.value)} />
              </div>
            </div>
            {formDate && formEnd && formEnd >= formDate && (
              <p className="text-xs text-muted-foreground">{slash(formDate)} → {slash(formEnd)} ({dayIndex(formDate, formEnd)} hari)</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={addSchedule} data-testid="sched-submit">{editSched ? "Simpan" : t("addSchedule")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
