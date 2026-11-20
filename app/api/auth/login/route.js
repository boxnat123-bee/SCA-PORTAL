import { NextResponse } from "next/server";
import { handle, readJson, HttpError } from "@/server/http";
import { getDb, COL, nowIso } from "@/server/mongo";
import { verifyPassword, createAccessToken, clearAuthCookie } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) throw new HttpError(400, "Username dan password wajib diisi");

  const db = await getDb();
  const user = await db.collection(COL.users).findOne({ username });
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, "Username atau password salah");
  }
  if (user.active === false) throw new HttpError(403, "User dinonaktifkan");

  // Role TIDAK dipilih saat login — diambil dari akun di database
  // (ditentukan Superadmin saat mendaftarkan / mengubah user).

  const sid = crypto.randomUUID();
  await db.collection(COL.activityLogs).insertOne({
    id: sid,
    user_id: user.id,
    name: user.name,
    username: user.username,
    login_time: nowIso(),
    logout_time: null,
    logout_type: null,
  });

  const token = await createAccessToken({
    id: user.id, username: user.username, role: user.role, sid,
  });

  const res = NextResponse.json({
    id: user.id, name: user.name, username: user.username, email: user.email || "", role: user.role, token,
  });
  return clearAuthCookie(res);
});
