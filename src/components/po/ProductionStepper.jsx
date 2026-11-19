import { Check, Loader2 } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { WAITING_IDS, PROCESS_IDS, STAGE_ORDER } from "@/lib/poStages";

/**
 * Tampilan progres PO dalam dua bagian:
 *  1) "Menunggu" (PO Kertas, PO Single Face, CTCP, Pisau Plong): checklist mandiri.
 *     Tiap item langsung bertanda centang bila sudah datang, tanpa menunggu item lain
 *     (barang B bisa datang lebih dulu dari barang A).
 *  2) "Proses" (potong kertas s/d pengiriman): garis runutan ke bawah.
 */

const COLORS = {
  done: "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/30",
  processing: "bg-blue-500 text-white border-blue-600 ring-4 ring-blue-500/20",
  waiting: "bg-amber-500 text-amber-950 border-amber-600",
  muted: "bg-secondary text-muted-foreground border-border",
};

const LINE = {
  done: "bg-emerald-500/60",
  processing: "bg-blue-500/40",
  waiting: "bg-border",
  muted: "bg-border",
};

export default function ProductionStepper({ po, onSelect, activeStage }) {
  const { stageName } = useLang();
  const enabled = po.enabled_stages || [];
  const doneStages = po.computed?.done_stages || [];
  const cur = po.computed?.current_stage;

  const waitingList = STAGE_ORDER.filter((n) => WAITING_IDS.includes(n) && enabled.includes(n));
  const processList = PROCESS_IDS.filter((n) => enabled.includes(n));

  const processStatus = (num) => {
    if (doneStages.includes(num)) return "done";
    if (num === cur) return "processing";
    return "waiting";
  };

  return (
    <div className="flex flex-col gap-5" data-testid="production-stepper">
      {waitingList.length > 0 && (
        <div className="space-y-2" data-testid="stepper-waiting-group">
          <div className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Menunggu Barang</div>
          {waitingList.map((num) => {
            const isDone = doneStages.includes(num);
            const isActive = activeStage === num;
            return (
              <button
                key={num}
                onClick={() => onSelect && onSelect(num)}
                data-testid={`stepper-stage-${num}`}
                aria-current={isActive ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
                  isActive ? "border-primary bg-accent shadow-soft" : "border-border hover:border-primary/30 hover:bg-accent/50"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isDone ? "border-emerald-600 bg-emerald-500 text-white" : "border-muted-foreground/40 bg-transparent"
                  }`}
                  aria-label={isDone ? "Sudah" : "Belum"}
                >
                  {isDone && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                  {stageName(num)}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDone ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                  {isDone ? "Sudah" : "Belum"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {processList.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="stepper-process-group">
          <div className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Proses Produksi</div>
          {processList.map((num, idx) => {
            const st = processStatus(num);
            const isActive = activeStage === num;
            const isLast = idx === processList.length - 1;
            return (
              <button
                key={num}
                onClick={() => onSelect && onSelect(num)}
                data-testid={`stepper-stage-${num}`}
                aria-current={isActive ? "step" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out ${
                  isActive ? "border-primary bg-accent shadow-soft" : "border-border hover:border-primary/30 hover:bg-accent/50"
                }`}
              >
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-[29px] top-[54px] h-[18px] w-[2px] rounded-full transition-colors duration-200 ${LINE[st]}`}
                  />
                )}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-transform duration-200 ease-out group-hover:scale-105 ${COLORS[st]}`}>
                  {st === "done" ? <Check className="h-4 w-4" /> : st === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-mono tabular-nums">{idx + 1}</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Langkah {idx + 1}</div>
                  <div className="truncate text-sm font-medium">{stageName(num)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
