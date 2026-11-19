import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/poApi";
import { useLang } from "@/context/LangContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageContainer from "@/components/layout/PageContainer";
import { sortStages, stagePos } from "@/lib/poStages";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/*
 * Warna kategori (permintaan): Tahap 1–4 (menunggu) = ungu, Tahap 5–11 (proses) = merah,
 * Pengiriman (Selesai Cetak & Pengiriman) = oranye.
 */
const CAT = {
  tunggu: { label: "Tahap 1–4 · Menunggu", pill: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300", dot: "bg-violet-500" },
  proses: { label: "Tahap 5–11 · Produksi", pill: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300", dot: "bg-red-500" },
  kirim: { label: "Pengiriman", pill: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300", dot: "bg-orange-500" },
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
    const sched = schedules.filter((s) => s.date === ds).map((s) => ({
      key: `s-${s.id}`, kind: "jadwal", cat: catOfStage(s.stage_number), sched: s,
      po: poById[s.po_id], label: s.po_number, sub: s.client_name,
    }));
    const runs = activePos.filter((p) => p.est_start <= ds && ds <= p.est_end).map((p) => ({
      key: `p-${p.id}`, kind: "po", cat: catOfPo(p), po: p, label: p.po_number, sub: p.client_name,
      isStart: p.est_start === ds, isEnd: p.est_end === ds,
    }));
    return [...sched, ...runs].filter((e) => !hideCat[e.cat]);
  };

  const weekdays = lang === "id" ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openAdd = (ds) => { setFormDate(ds); setFormPo(""); setFormStage(""); setOpen(true); };
  const addSchedule = async () => {
    if (!formPo || !formStage || !formDate) { toast.error(t("selectPO")); return; }
    try { await api.createSchedule({ po_id: formPo, stage_number: parseInt(formStage), date: formDate }); setOpen(false); load(); toast.success("Jadwal ditambah"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
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
      pageTitle={t("schedule")}
      pageDescription="Kalender produksi: klik tanggal untuk melihat daftar PO hari itu."
      pageHeaderAction={(
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} data-testid="cal-today">Hari ini</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month - 1, 1))} data-testid="cal-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="w-36 text-center font-display font-bold capitalize">{monthName(cursor, lang)}</div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month + 1, 1))} data-testid="cal-next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    >
      {/* Legenda = juga filter (klik untuk sembunyikan / tampilkan) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {Object.entries(CAT).map(([k, c]) => (
          <button key={k} type="button" onClick={() => setHideCat((h) => ({ ...h, [k]: !h[k] }))}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition ${hideCat[k] ? "opacity-40 line-through" : c.pill}`}
            data-testid={`cal-legend-${k}`}>
            <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.label}
          </button>
        ))}
        <span className="text-muted-foreground">Klik legenda untuk filter.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Grid bulanan */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {weekdays.map((w, i) => <div key={w} className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${i >= 5 ? "text-rose-500/80" : "text-muted-foreground"}`}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              const edgeR = (i + 1) % 7 === 0 ? "" : "border-r";
              if (!date) return <div key={i} className={`min-h-[70px] border-b bg-muted/20 sm:min-h-[112px] ${edgeR}`} />;
              const ds = ymd(date);
              const entries = entriesOf(ds);
              const isToday = ds === todayDs;
              const sel = selectedDay === ds;
              return (
                <button key={i} type="button" data-testid={`cal-day-${ds}`} onClick={() => setSelectedDay(ds)}
                  className={`group relative flex min-h-[70px] flex-col gap-0.5 border-b p-1 text-left align-top transition-colors sm:min-h-[112px] sm:p-1.5 ${edgeR} ${sel ? "bg-primary/[0.07] ring-2 ring-inset ring-primary/60" : "hover:bg-accent/50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold ${isToday ? "bg-rose-600 text-white" : ""}`}>{date.getDate()}</span>
                    {entries.length > 0 && <span className="text-[10px] text-muted-foreground sm:hidden">{entries.length}</span>}
                  </div>
                  {/* Mobile: titik warna */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {entries.slice(0, 6).map((e) => <span key={e.key} className={`h-1.5 w-1.5 rounded-full ${CAT[e.cat].dot}`} />)}
                  </div>
                  {/* Tablet/desktop: label PO ala Notion */}
                  <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {entries.slice(0, MAX_PILLS).map((e) => (
                      <span key={e.key} title={`${e.label} · ${e.sub}`}
                        className={`truncate rounded border px-1 py-px text-[10.5px] font-medium leading-tight ${CAT[e.cat].pill} ${e.kind === "jadwal" ? "border-solid" : "border-dashed"}`}>
                        {e.kind === "jadwal" ? "● " : ""}{e.label}{e.sub ? ` · ${e.sub}` : ""}
                      </span>
                    ))}
                    {entries.length > MAX_PILLS && <span className="px-1 text-[10px] font-medium text-muted-foreground">+{entries.length - MAX_PILLS} lainnya</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Agenda harian */}
        <Card className="flex flex-col p-0 lg:sticky lg:top-0 lg:max-h-[calc(100vh-180px)]" data-testid="day-detail">
          <div className="flex items-start justify-between gap-2 border-b p-4">
            <div>
              <div className="flex items-center gap-2 font-display font-bold"><CalendarDays className="h-4 w-4" /> <span className="capitalize">{selectedDay ? dayTitle(selectedDay, lang) : "-"}</span></div>
              <div className="mt-0.5 text-xs text-muted-foreground">{dayEntries.length} entri · {slash(selectedDay)}</div>
            </div>
            <Button size="sm" className="shrink-0 gap-1" onClick={() => openAdd(selectedDay)} data-testid="add-schedule-day"><Plus className="h-4 w-4" /> Jadwal</Button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {dayEntries.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada PO pada tanggal ini.</p>}

            {daySched.length > 0 && (
              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Jadwal tahap</div>
                <div className="space-y-2">
                  {daySched.map((e) => (
                    <div key={e.key} className={`flex items-start gap-2 rounded-lg border-l-4 bg-card p-2.5 shadow-sm ring-1 ring-border ${e.cat === "kirim" ? "border-l-orange-500" : e.cat === "proses" ? "border-l-red-500" : "border-l-violet-500"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{e.label} <span className="font-normal text-muted-foreground">· {e.sub}</span></div>
                        <div className="text-xs text-muted-foreground">Tahap {stagePos(e.sched.stage_number)}: {stageName(e.sched.stage_number)}</div>
                      </div>
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
                      className={`block rounded-lg border-l-4 bg-card p-2.5 shadow-sm ring-1 ring-border transition hover:bg-accent ${e.cat === "kirim" ? "border-l-orange-500" : e.cat === "proses" ? "border-l-red-500" : "border-l-violet-500"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{e.label} <span className="font-normal text-muted-foreground">· {e.sub}</span></div>
                        {(e.isStart || e.isEnd) && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${e.isEnd ? "bg-rose-500/15 text-rose-600" : "bg-sky-500/15 text-sky-600"}`}>{e.isEnd ? "Target selesai" : "Mulai"}</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{e.po.computed?.current_stage_name || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{slash(e.po.est_start)} → {slash(e.po.est_end)}{e.po.item_type ? ` · ${e.po.item_type}` : ""}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("scheduleStage")} — {slash(formDate)}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("selectPO")}</Label>
              <Select value={formPo} onValueChange={setFormPo}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={addSchedule} data-testid="sched-submit">{t("addSchedule")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
