// Notifikasi lonceng & "Perlu Perhatian" — satu sumber data (/api/notifications).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

export const NOTIF_KEY = ["notifications"];

export function useNotifications(options = {}) {
  return useQuery({
    queryKey: NOTIF_KEY,
    queryFn: async () => (await api.get("/notifications")).data,
    ...options,
  });
}

/** action: "handle" | "unhandle" (centang, berlaku semua user) · "dismiss" (hapus dari tampilan saya). */
export function useNotifAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, action }) => api.post("/notifications", { ids, action }),
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: NOTIF_KEY });
      if (action === "dismiss") toast.success(`${ids.length} item dihapus`);
    },
    onError: () => toast.error("Gagal menyimpan. Coba lagi."),
  });
}

export const fmtDay = (s) => {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "-";
};

const fmtStamp = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
/** Teks tooltip item yang sudah dicentang. */
export const handledTitle = (h) => (h ? `Sudah ditangani oleh ${h.name || "-"} · ${fmtStamp(h.at)}` : undefined);

const TONE = {
  late: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  soon: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  later: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  deadline: "bg-rose-600 text-white",
  ship: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};
const relDays = (d) => (d < 0 ? `lewat ${-d} hari` : d === 0 ? "hari ini" : d === 1 ? "besok" : `H-${d}`);

/** Label + warna penanda per jenis pengingat. */
export function notifTag(n) {
  if (n.kind === "deadline") return { text: `Deadline ${relDays(n.days)}`, cls: TONE.deadline };
  if (n.kind === "ship") return { text: `Kirim ${relDays(n.days)}`, cls: n.days < 0 ? TONE.late : TONE.ship };
  const tone = n.days < 0 ? "late" : n.days <= 7 ? "soon" : "later";
  const text = n.days < 0 ? `Lewat ${-n.days} hari` : n.days === 0 ? "Hari ini" : n.days === 1 ? "Besok" : `H-${n.days}`;
  return { text, cls: TONE[tone] };
}

export const KIND_LABEL = { po: "Est. selesai", deadline: "Deadline", ship: "Jadwal kirim", tempo: "Jatuh tempo" };
