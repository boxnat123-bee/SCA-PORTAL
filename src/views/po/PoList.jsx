import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Eye, Pencil, Trash2, Package, FileDown, Check } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/poApi";
import { useLang } from "@/context/LangContext";
import { BUCKET_META, STAGE_ORDER, WAITING_IDS } from "@/lib/poStages";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import PageContainer from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FILTER_BUCKETS = ["active", "proses", "siap_kirim", "completed", "delivery_failed"];

function BucketBadge({ bucket }) {
  const meta = BUCKET_META[bucket] || { color: "#94A3B8", label: "-" };
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: meta.color }}>{meta.label}</span>
  );
}

function RowInfo({ label, value, wide }) {
  return (
    <div className={`min-w-0 ${wide ? "po-info-wide" : ""}`}>
      <div className="truncate text-[10px] uppercase leading-4 tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate font-medium" title={value || ""}>{value || "-"}</div>
    </div>
  );
}

/** Garis progres tahap PO (UI Navy Ledger): garis utuh + titik per tahap + persentase. */
function StageProgress({ po }) {
  const enabled = STAGE_ORDER.filter((n) => (po.enabled_stages || []).includes(n));
  if (!enabled.length) return null;
  const done = new Set(po.computed?.done_stages || []);
  const total = enabled.length;
  const doneCount = enabled.filter((n) => done.has(n)).length;
  const finished = doneCount === total;
  const curIdx = finished ? -1 : enabled.findIndex((n) => !done.has(n));
  const pct = Math.round((doneCount / total) * 100);
  const fill = finished ? 100 : total > 1 ? (Math.max(curIdx, 0) / (total - 1)) * 100 : 0;
  return (
    <div className="mt-3 flex items-center gap-3" aria-label={`Progres ${pct}%`}>
      <div className="relative mx-1.5 h-[18px] flex-1">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
        <span className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-500" style={{ width: `${fill}%` }} />
        {enabled.map((n, i) => {
          const isDone = done.has(n);
          const isCur = i === curIdx;
          const left = total > 1 ? (i / (total - 1)) * 100 : 0;
          return (
            <span key={n} title={`Tahap ${i + 1}`}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${isCur
                ? "h-3.5 w-3.5 border-[3px] border-primary bg-card ring-4 ring-primary/15"
                : isDone ? "h-2.5 w-2.5 bg-primary" : "h-2.5 w-2.5 border-2 border-border bg-card"}`}
              style={{ left: `${left}%` }} />
          );
        })}
      </div>
      <b className="w-10 text-right text-xs text-primary">{pct}%</b>
    </div>
  );
}

export default function PoList() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const bucket = params.get("bucket") || "";
  const [search, setSearch] = useState("");
  const [debSearch, setDebSearch] = useState("");
  const [delId, setDelId] = useState(null);
  const [month, setMonth] = useState("all");

  const monthLabel = (m) => new Date(m + "-01T00:00:00").toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" });

  // Debounce pencarian 250ms (perilaku lama dipertahankan)
  useEffect(() => { const h = setTimeout(() => setDebSearch(search), 250); return () => clearTimeout(h); }, [search]);

  // Cache react-query: tampil instan dari cache, refresh otomatis di background.
  const queryClient = useQueryClient();
  const { data: allMonths = [] } = useQuery({
    queryKey: ["po", "months"],
    queryFn: async () => {
      const rows = await api.listPos();
      return [...new Set(rows.map((p) => (p.po_date || p.est_start || "").slice(0, 7)).filter((x) => x.length === 7))].sort().reverse();
    },
    refetchOnMount: "always",
  });

  const downloadPdf = async () => {
    try {
      const q = {};
      if (search) q.search = search;
      if (bucket) q.bucket = bucket;
      if (month !== "all") q.month = month;
      await api.exportPoRekapPdf(q);
      toast.success("PDF diunduh");
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal export"); }
  };

  const q = useMemo(() => {
    const query = {};
    if (debSearch) query.search = debSearch;
    if (bucket) query.bucket = bucket;
    if (month !== "all") query.month = month;
    return query;
  }, [debSearch, bucket, month]);

  const { data: pos = [], isLoading: loading, error } = useQuery({
    queryKey: ["po", "list", q],
    queryFn: () => api.listPos(q),
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
  });
  useEffect(() => { if (error) toast.error(error?.response?.data?.detail || "Gagal memuat"); }, [error]);

  const confirmDelete = async () => {
    try {
      await api.deletePo(delId);
      toast.success("PO dihapus");
      setDelId(null);
      queryClient.invalidateQueries({ queryKey: ["po"] });
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal hapus"); }
  };

  return (
    <PageContainer
      testid="po-list-page"
      pageTitle={t("poList")}
      pageDescription="Kelola PO, pantau progres produksi, dan jadwal pengiriman."
      pageHeaderAction={(
        <div className="flex flex-wrap items-center gap-2">
          <Button data-testid="po-export-pdf" onClick={downloadPdf} variant="outline" className="rounded-full gap-2">
            <FileDown className="h-4 w-4" /> {t("exportPdf")}
          </Button>
          <Button data-testid="po-new" onClick={() => navigate("/po/pos/new")} className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> {t("newPO")}
          </Button>
        </div>
      )}
    >

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-[1_1_100%] sm:flex-[1_1_320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="po-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="pl-10 h-11 rounded-xl" />
        </div>
        <Select value={bucket || "all"} onValueChange={(v) => setParams(v === "all" ? {} : { bucket: v })}>
          <SelectTrigger data-testid="po-filter" className="w-full sm:w-56 h-11 rounded-xl"><SelectValue placeholder={t("filterAll")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            {FILTER_BUCKETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b === "active" ? t("activePO") : b === "completed" ? t("completedPO") : (BUCKET_META[b]?.label || b)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger data-testid="po-month-filter" className="w-full sm:w-48 h-11 rounded-xl"><SelectValue placeholder={t("allMonths")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allMonths")}</SelectItem>
            {allMonths.map((m) => <SelectItem key={m} value={m} className="capitalize">{monthLabel(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3" data-testid="po-list-skeleton">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-9 w-40 rounded-md" />
            </Card>
          ))}
        </div>
      ) : pos.length === 0 ? (
        <Card className="rounded-2xl py-16">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Package /></EmptyMedia>
              <EmptyTitle>{t("noData")}</EmptyTitle>
              <EmptyDescription>Buat PO pertama untuk mulai melacak progres produksi & pengiriman.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => navigate("/po/pos/new")} className="mt-1 gap-2 rounded-full"><Plus className="h-4 w-4" /> {t("newPO")}</Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pos.map((po, i) => {
            const waitingList = STAGE_ORDER.filter((n) => WAITING_IDS.includes(n) && (po.enabled_stages || []).includes(n));
            const doneSet = po.computed?.done_stages || [];
            return (
              <Card key={po.id} data-testid={`po-card-${po.po_number}`}
                style={{ animationDelay: `${i * 30}ms` }}
                className="po-card stagger-in rounded-xl p-4 transition-colors hover:bg-accent/30">
                {/* Layout diatur oleh lebar KARTU (container query di index.css), bukan lebar layar,
                    sehingga tidak tumpang-tindih di iPad/HP saat sidebar terbuka. */}
                <div className="po-row">
                  {/* Identitas PO */}
                  <div className="po-id min-w-0">
                    <div className="break-words font-display text-lg font-bold leading-tight">{po.po_number}</div>
                    <div className="break-words text-sm text-muted-foreground">{po.client_name}</div>
                  </div>

                  {/* Info utama */}
                  <div className="po-info text-sm">
                    <RowInfo label="Item" value={po.item_type} />
                    <RowInfo label="Ukuran Kertas" value={po.paper_size} />
                    <RowInfo label="Qty" value={po.quantity} />
                    <RowInfo label="Mesin" value={po.print_machine} />
                    <RowInfo label="Est. Produksi" value={(po.est_start || po.est_end) ? `${fmtDate(po.est_start)} → ${fmtDate(po.est_end)}` : ""} wide />
                    <RowInfo label={t("stage")} value={po.computed?.current_stage_name} wide />
                  </div>

                  {/* Checklist barang yang ditunggu */}
                  {waitingList.length > 0 && (
                    <div className="po-wait flex min-w-0 flex-wrap content-start gap-1.5" data-testid={`po-waiting-${po.po_number}`}>
                      {waitingList.map((n) => {
                        const ok = doneSet.includes(n);
                        return (
                          <span key={n} className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground"}`}>
                            {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                            {n === 1 ? "Kertas" : n === 12 ? "Single Face" : n === 2 ? "CTCP" : "Pisau Plong"}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Status + aksi */}
                  <div className="po-act flex flex-wrap items-center justify-between gap-2">
                    <BucketBadge bucket={po.computed?.bucket} />
                    <div className="flex shrink-0 gap-2">
                      <Button data-testid={`po-detail-${po.po_number}`} onClick={() => navigate(`/po/pos/${po.id}`)} size="sm" className="gap-1 rounded-full">
                        <Eye className="h-4 w-4" /> {t("detail")}
                      </Button>
                      <Button data-testid={`po-edit-${po.po_number}`} onClick={() => navigate(`/po/pos/${po.id}/edit`)} variant="outline" size="icon" className="rounded-full" aria-label={t("edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button data-testid={`po-delete-${po.po_number}`} onClick={() => setDelId(po.id)} variant="outline" size="icon" className="rounded-full text-destructive" aria-label={t("delete")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <StageProgress po={po} />
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("poNumber")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction data-testid="po-confirm-delete" onClick={confirmDelete} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
