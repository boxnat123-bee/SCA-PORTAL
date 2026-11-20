import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AttentionList from "@/components/AttentionList";
import { useNotifications } from "@/lib/notifications";

// Penanda "sudah dilihat" (badge merah) disimpan per browser.
const SEEN_KEY = "sca_notif_seen";
const readSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
};
const writeSeen = (set) => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-500))); } catch { /* abaikan */ }
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const { data } = useNotifications({ refetchInterval: 5 * 60 * 1000, refetchOnWindowFocus: true });
  const items = data?.items || [];
  const unread = useMemo(() => items.filter((n) => !n.handled && !seen.has(n.id)).length, [items, seen]);

  // Membuka lonceng = semua pengingat dianggap sudah dilihat.
  const onOpenChange = (v) => {
    setOpen(v);
    if (v && unread) {
      const next = new Set(seen);
      items.forEach((n) => next.add(n.id));
      setSeen(next); writeSeen(next);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
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
      <PopoverContent align="end" className="w-[360px] p-0 sm:w-[440px]">
        <div className="border-b px-4 py-2.5">
          <div className="text-sm font-semibold">Notifikasi</div>
          <div className="text-[11px] text-muted-foreground">PO Est. Selesai &amp; Deadline H-14/H-7 · Kirim H-1 · Klien jatuh tempo H-3</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 pb-1">
          <AttentionList items={items} detailed onOpen={() => setOpen(false)} toolbarClass="pt-1.5" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
