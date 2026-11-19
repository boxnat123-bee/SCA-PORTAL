import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, ClipboardList, Receipt, CheckCheck } from "lucide-react";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SEEN_KEY = "sca_notif_seen";
const readSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
};
const writeSeen = (set) => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-500))); } catch { /* abaikan */ }
};

const fmtD = (s) => {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "-";
};
const whenLabel = (d) => {
  if (d < 0) return { text: `Lewat ${-d} hari`, cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" };
  if (d === 0) return { text: "Hari ini", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" };
  if (d === 1) return { text: "Besok", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (d <= 7) return { text: `H-${d}`, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  return { text: `H-${d}`, cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const items = data?.items || [];
  const unread = useMemo(() => items.filter((n) => !seen.has(n.id)).length, [items, seen]);

  const markAll = () => {
    const next = new Set(seen);
    items.forEach((n) => next.add(n.id));
    setSeen(next); writeSeen(next);
  };
  const go = (n) => {
    const next = new Set(seen); next.add(n.id); setSeen(next); writeSeen(next);
    setOpen(false);
    navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9" aria-label="Notifikasi" data-testid="notification-bell">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 sm:w-[380px]">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div>
            <div className="text-sm font-semibold">Notifikasi</div>
            <div className="text-[11px] text-muted-foreground">PO H-14 & H-7 Est. Selesai · Klien jatuh tempo H-3</div>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAll}>
              <CheckCheck className="h-3.5 w-3.5" /> Tandai dibaca
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Tidak ada pengingat saat ini.</p>
          ) : items.map((n) => {
            const w = whenLabel(n.days);
            const isPo = n.kind === "po";
            const Icon = isPo ? ClipboardList : Receipt;
            return (
              <button key={n.id} type="button" onClick={() => go(n)}
                className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent ${seen.has(n.id) ? "opacity-70" : ""}`}>
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${isPo ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-sky-500/15 text-sky-600 dark:text-sky-400"}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    {!seen.has(n.id) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                  <span className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${w.cls}`}>{w.text}</span>
                    <span className="text-muted-foreground">{isPo ? "Est. selesai" : "Jatuh tempo"} {fmtD(n.date)}</span>
                    {n.amount ? <span className="text-muted-foreground">· sisa {formatRupiah(n.amount)}</span> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
