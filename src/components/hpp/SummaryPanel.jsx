import { formatRp } from "@/lib/format";
import MoneyInput from "@/components/MoneyInput";

const RATE_CLS = "h-9 w-full rounded-md border border-border bg-background text-right text-sm tabular-nums shadow-soft outline-none transition-[border-color,box-shadow] duration-200 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/25";

const RateRow = ({ label, pct, onPct, amount }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="w-20">
        <div className="relative">
          <input
            data-testid={`input-rate-${label.toLowerCase()}`}
            inputMode="decimal"
            value={pct ?? ""}
            onChange={(e) => onPct(e.target.value.replace(/[^\d.,]/g, ""))}
            className={`${RATE_CLS} pl-2.5 pr-6`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
        </div>
      </div>
    </div>
    <span className="tabular-nums text-sm">{formatRp(amount)}</span>
  </div>
);

/** Laba: persen (dari subtotal + bunga) atau Rupiah per pcs. */
const LabaRow = ({ rates, onRate, amount }) => {
  const rpMode = rates.labaMode === "rp";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Laba</span>
        <div className="flex rounded-md border border-border p-0.5 text-[11px] font-semibold" role="group" aria-label="Satuan laba">
          {[["pct", "%"], ["rp", "Rp"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => onRate("labaMode", k)} data-testid={`laba-mode-${k}`}
              className={`rounded px-1.5 py-0.5 ${(rpMode ? "rp" : "pct") === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className={rpMode ? "w-24" : "w-20"}>
          {rpMode ? (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
              <MoneyInput value={rates.labaRp ?? ""} onChange={(v) => onRate("labaRp", v)} placeholder="0"
                data-testid="input-rate-laba-rp" className={`${RATE_CLS} pl-7 pr-2`} />
            </div>
          ) : (
            <div className="relative">
              <input data-testid="input-rate-laba" inputMode="decimal" value={rates.labaPct ?? ""}
                onChange={(e) => onRate("labaPct", e.target.value.replace(/[^\d.,]/g, ""))} className={`${RATE_CLS} pl-2.5 pr-6`} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          )}
        </div>
      </div>
      <span className="tabular-nums text-sm">{formatRp(amount)}</span>
    </div>
  );
};

export default function SummaryPanel({ res, rates, onRate, onSelect, enabled, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-lift" data-testid="summary-panel">
      <div className="bg-gradient-to-br from-primary to-primary/80 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground/80">Total HPP — Harga Jual / Pcs</p>
        <p className="tabular-nums text-3xl font-semibold text-primary-foreground mt-1" data-testid="summary-final">{formatRp(res.final)}</p>
      </div>
      <div className="p-5">
        <div className="space-y-0.5">
          {res.components.map((c) => {
            const on = c.enabled !== false;
            return (
              <div key={c.key} className="flex items-center gap-2 py-1.5" data-testid={`summary-row-${c.key}`}>
                <input type="checkbox" checked={on} onChange={() => onToggle && onToggle(c.key)}
                  data-testid={`toggle-${c.key}`}
                  className="h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer" />
                <button onClick={() => onSelect && onSelect(c.key)}
                  className="flex-1 flex items-center justify-between gap-3 group text-left">
                  <span className={`text-sm transition-colors duration-200 ${on ? "text-muted-foreground group-hover:text-primary" : "text-muted-foreground/40 line-through"}`}>{c.label}{c.manual && <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">manual</span>}</span>
                  <span className={`tabular-nums text-sm ${on ? "" : "text-muted-foreground/40"}`}>{formatRp(c.value)}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
          <span className="text-sm font-semibold">Subtotal HPP</span>
          <span className="tabular-nums text-base font-semibold" data-testid="summary-subtotal">{formatRp(res.subtotal)}</span>
        </div>
        <div className="mt-2">
          <RateRow label="Bunga" pct={rates.bungaPct} onPct={(v) => onRate("bungaPct", v)} amount={res.bunga} />
          <LabaRow rates={rates} onRate={onRate} amount={res.laba} />
          <RateRow label="PPN" pct={rates.ppnPct} onPct={(v) => onRate("ppnPct", v)} amount={res.ppn} />
        </div>
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t-2 border-primary">
          <span className="text-sm font-semibold text-primary">HARGA JUAL / PCS</span>
          <span className="tabular-nums text-lg font-bold text-primary">{formatRp(res.final)}</span>
        </div>
      </div>
    </div>
  );
}
