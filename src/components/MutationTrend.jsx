import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import api from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { defaultTrendRange, trendRangeError } from "@/lib/trendRange";
import { Input } from "@/components/ui/input";
import ChartBox from "@/components/ChartBox";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const CONFIG = {
  masuk: { label: "Masuk", color: "hsl(var(--chart-1))" },
  keluar: { label: "Keluar", color: "hsl(var(--chart-2))" },
};
const TYPES = [
  { id: "paper", label: "Kertas", unit: "Rim" },
  { id: "ink", label: "Tinta", unit: "Kg" },
  { id: "other", label: "Lain", unit: "" },
];
const fmtDate = (s) => s.split("-").reverse().join("/");

/** Grafik Mutasi masuk/keluar per bulan di Beranda — pilih Kertas/Tinta/Lain + rentang tanggal (1–12 bulan). */
export default function MutationTrend() {
  const [type, setType] = useState("paper");
  const [range, setRange] = useState(defaultTrendRange);
  const err = trendRangeError(range.start, range.end);
  const cur = TYPES.find((t) => t.id === type);

  const { data, isFetching } = useQuery({
    queryKey: ["dashboard", "trend", type, range.start, range.end],
    queryFn: async () => (await api.get("/reports/trend", { params: { type, ...range } })).data.trend,
    enabled: !err,
    placeholderData: (prev) => prev,
  });
  const setDate = (k) => (e) => setRange((r) => ({ ...r, [k]: e.target.value }));

  return (
    <section className="rounded-xl border border-border bg-card px-5 py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">Mutasi {cur.label.toLowerCase()}</h2>
          <div className="text-xs text-muted-foreground">{err ? "–" : `${fmtDate(range.start)} – ${fmtDate(range.end)}`}</div>
        </div>
        <div role="tablist" aria-label="Jenis mutasi" className="flex gap-1 rounded-[10px] bg-secondary p-1">
          {TYPES.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={type === t.id} data-testid={`trend-tab-${t.id}`}
              onClick={() => setType(t.id)}
              className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-colors ${type === t.id
                ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:w-auto sm:grid-cols-[150px_auto_150px]">
          <Input type="date" aria-label="Tanggal awal" value={range.start} onChange={setDate("start")} className="h-8 text-xs" data-testid="trend-start" />
          <span className="text-muted-foreground">s.d.</span>
          <Input type="date" aria-label="Tanggal akhir" value={range.end} onChange={setDate("end")} className="h-8 text-xs" data-testid="trend-end" />
        </div>
        <div className="ml-auto flex gap-3.5 text-foreground/75">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[hsl(var(--chart-1))]" />Masuk</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[hsl(var(--chart-2))]" />Keluar</span>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-rose-700 dark:text-rose-400" data-testid="trend-error">{err} (minimal 1 bulan, maksimal 12 bulan)</p>}

      <ChartBox className={`mt-4 h-56 transition-opacity ${isFetching ? "opacity-60" : ""}`} data-testid="dashboard-trend-chart">
        <ChartContainer config={CONFIG}>
          <BarChart data={err ? [] : data || []} margin={{ left: -18, right: 4, top: 4 }} barGap={4}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tickMargin={4} tick={{ fontSize: 12 }} />
            <ChartTooltip cursor={{ fill: "hsl(var(--secondary))" }} content={<ChartTooltipContent formatter={(v) => `${formatNumber(v, 2)}${cur.unit ? ` ${cur.unit}` : ""}`} />} />
            <Bar dataKey="masuk" name="Masuk" fill="var(--color-masuk)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="keluar" name="Keluar" fill="var(--color-keluar)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ChartContainer>
      </ChartBox>
    </section>
  );
}
