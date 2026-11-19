import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import api from "@/lib/api";
import * as poApi from "@/lib/poApi";
import { getInvoices } from "@/lib/tempoApi";
import { useAuth } from "@/context/AuthContext";
import { formatNumber, formatRupiah } from "@/lib/format";
import { stagePos, stageName } from "@/lib/poStages";
import PageContainer from "@/components/layout/PageContainer";
import MutationTrend from "@/components/MutationTrend";

const pad = (n) => String(n).padStart(2, "0");
const localYmd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slash = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : "-"; };
const greet = () => {
  const h = new Date().getHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
};
/** Juta ringkas: 26500000 → "Rp 26,5 jt" */
const rpShort = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e9) return `Rp ${formatNumber(n / 1e9, 1)} M`;
  if (n >= 1e6) return `Rp ${formatNumber(n / 1e6, 1)} jt`;
  return formatRupiah(n);
};
const catBar = (n) => (n === 11 ? "bg-orange-600" : stagePos(n) <= 4 ? "bg-violet-600" : "bg-red-600");

function Kpi({ label, value, unit, sub, subTone }) {
  return (
    <div className="rounded-xl border border-border bg-card px-[18px] py-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-[26px] font-bold leading-tight tracking-[-0.02em] tabular-nums">
        {value}{unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className={`mt-1 truncate text-xs ${subTone === "bad" ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-border bg-card px-5 py-[18px] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const TAG = {
  late: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  soon: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  stock: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

export default function Dashboard() {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const today = localYmd();

  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await api.get("/dashboard")).data, refetchOnMount: "always" });
  const { data: notif } = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/notifications")).data });
  const { data: pos = [] } = useQuery({ queryKey: ["po", "list-home"], queryFn: () => poApi.listPos() });
  const { data: scheds = [] } = useQuery({ queryKey: ["po", "schedules-home"], queryFn: () => poApi.listSchedules() });
  const { data: invoices = [] } = useQuery({ queryKey: ["tempo", "home"], queryFn: () => getInvoices(), enabled: isSuper });

  if (!data) return <PageContainer isLoading testid="stok-dashboard-loading" />;

  const running = pos.filter((p) => !p.computed?.is_completed);
  const readyShip = running.filter((p) => p.computed?.bucket === "siap_kirim").length;
  const unpaid = invoices.filter((i) => i.status !== "lunas");
  const unpaidSum = unpaid.reduce((a, i) => a + (Number(i.remaining_amount) || 0), 0);
  const overdue = unpaid.filter((i) => i.due_date && String(i.due_date).slice(0, 10) < today).length;

  // Perlu perhatian: hanya proses produksi yang mendekati deadline (PO H-5 Est. Selesai)
  const attention = (notif?.items || []).filter((n) => n.kind === "po").map((n) => ({
    key: n.id, tone: n.days < 0 ? "late" : "soon",
    tag: n.days < 0 ? `Lewat ${-n.days} hari` : n.days === 0 ? "Hari ini" : `H-${n.days}`,
    title: n.title, body: n.body, link: n.link,
  })).slice(0, 8);

  // Produksi hari ini: jadwal tahap yang mencakup hari ini + PO yang selesai/kirim hari ini
  const todaySched = scheds.filter((s) => s.date <= today && today <= (s.end_date || s.date));
  const todayDue = running.filter((p) => p.est_end === today && !todaySched.some((s) => s.po_id === p.id));

  const dateLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <PageContainer testid="stok-dashboard-page" pageEyebrow={dateLabel} pageTitle={`${greet()}, ${user?.name || ""}`}>
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi label="Stok kertas" value={formatNumber(data.total_paper_stock, 2)} unit="Rim"
          sub={`${data.item_counts?.paper || 0} item${(data.low_stock || []).some((s) => s.kategori === "Kertas") ? " · ada yang habis" : ""}`} />
        <Kpi label="Stok tinta" value={formatNumber(data.total_ink_stock, 2)} unit="Kg" sub={`${data.item_counts?.ink || 0} item`} />
        <Kpi label="PO berjalan" value={running.length} sub={readyShip ? `${readyShip} siap kirim` : "Tidak ada yang siap kirim"} />
        {isSuper
          ? <Kpi label="Tagihan belum lunas" value={rpShort(unpaidSum)} sub={overdue ? `${overdue} lewat jatuh tempo` : `${unpaid.length} invoice`} subTone={overdue ? "bad" : ""} />
          : <Kpi label="Mutasi hari ini" value={data.mutations_today} sub="Kertas, tinta & lain" />}
      </section>

      <div className="grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Perlu perhatian">
          <div className="mt-1.5">
            {attention.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada PO yang mendekati deadline (H-5).</p>}
            {attention.map((a) => (
              <div key={a.key} className="flex items-center gap-3 border-b border-border/60 py-[11px] last:border-0">
                <span className={`whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold ${TAG[a.tone]}`}>{a.tag}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.body}</div>
                </div>
                <Link to={a.link} className="text-[12.5px] font-semibold text-primary hover:underline">Buka</Link>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Produksi hari ini" action={<Link to="/po/kalender" className="text-[12.5px] font-semibold text-primary hover:underline">Kalender</Link>}>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {todaySched.length === 0 && todayDue.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada jadwal produksi hari ini.</p>}
            {todaySched.map((s) => (
              <Link key={s.id} to={`/po/pos/${s.po_id}`} className="flex items-start gap-3 rounded-lg p-1 hover:bg-secondary/50">
                <span className={`w-1 self-stretch rounded ${catBar(s.stage_number)}`} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">{s.po_number} · {s.client_name}</div>
                  <div className="text-xs text-muted-foreground">Tahap {stagePos(s.stage_number)} · {stageName(s.stage_number)}{(s.end_date || s.date) !== s.date ? ` · s/d ${slash(s.end_date)}` : ""}</div>
                </div>
              </Link>
            ))}
            {todayDue.map((p) => (
              <Link key={p.id} to={`/po/pos/${p.id}`} className="flex items-start gap-3 rounded-lg p-1 hover:bg-secondary/50">
                <span className="w-1 self-stretch rounded bg-orange-600" />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">{p.po_number} · {p.client_name}</div>
                  <div className="text-xs text-muted-foreground">Target selesai hari ini · {p.computed?.current_stage_name || "-"}</div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
        <MutationTrend />

        <Panel title="Mutasi terbaru">
          <div className="mt-1.5" data-testid="dashboard-recent-list">
            {data.recent.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada mutasi.</p>}
            {data.recent.slice(0, 6).map((m) => {
              const masuk = m.jenis_transaksi === "masuk";
              const note = [masuk ? m.supplier : m.nama_cetakan, m.pic_name].filter(Boolean).join(" · ");
              return (
                <div key={m.id} className="flex items-center gap-3 border-b border-border/60 py-[11px] last:border-0">
                  <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg ${masuk ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-700 dark:text-rose-400"}`}>
                    {masuk ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{m.nama}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground">{note} · {slash(m.date)} {m.time || ""}</div>
                  </div>
                  <b className={`whitespace-nowrap text-[13px] tabular-nums ${masuk ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                    {masuk ? "+" : "−"}{formatNumber(m.jumlah, 2)} {m.satuan || ""}
                  </b>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
