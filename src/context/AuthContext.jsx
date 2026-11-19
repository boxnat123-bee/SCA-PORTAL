import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function apiError(e, fallback = "Terjadi kesalahan. Coba lagi.") {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  if (d?.msg) return d.msg;
  return String(d);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined=loading, null=guest

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser((prev) => (prev === undefined ? null : prev));
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  // Role tidak dipilih saat login: server mengenali role dari akun yang terdaftar.
  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    if (data.token) {
      localStorage.setItem("stokku_token", data.token);
      localStorage.setItem("sca_token", data.token);
    }
    setUser(data);
    return data;
  };

  const logout = async (type = "manual") => {
    try { await api.post("/auth/logout", { type }); } catch {}
    localStorage.removeItem("sca_token");
    localStorage.removeItem("stokku_token");
    setUser(null);
  };


  const isSuper = user?.role === "superadmin";
  const perms = {
    canStokDashboard: !!user,
    canStokMutations: !!user,
    canStokReport: !!user,
    canStokDetail: isSuper,     // Admin/PIC TIDAK bisa akses Laporan Detail
    canStokLogs: isSuper,       // Log & User khusus Superadmin
    canStokYearClose: isSuper,
    canHpp: isSuper,            // HPP HANYA Superadmin
    canPo: !!user,              // PO Tracker semua role
    canStokKlien: !!user,       // Stok Klien: Superadmin + Admin/PIC
    canTempo: isSuper,          // Jatuh Tempo Klien HANYA Superadmin (berisi nominal Rupiah)
    canUsers: isSuper,          // Register user hanya Superadmin
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, perms }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
