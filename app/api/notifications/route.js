import { handle, json, readJson, HttpError } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { listNotifications, updateNotificationState } from "@/server/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Notifikasi lonceng & Perlu Perhatian: PO (Est. Selesai/Deadline H-14 & H-7), pengiriman H-1, jatuh tempo H-3. */
export const GET = handle(async (req) => json(await listNotifications(await requireAuth(req))));

/** POST { ids: [...], action: "handle" | "unhandle" | "dismiss" } */
export const POST = handle(async (req) => {
  const current = await requireAuth(req);
  const body = await readJson(req);
  if (!["handle", "unhandle", "dismiss"].includes(body?.action)) throw new HttpError(400, "Aksi tidak dikenal");
  return json({ updated: await updateNotificationState(current, body.ids, body.action) });
});
