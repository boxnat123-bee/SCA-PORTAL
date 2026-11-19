import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";

// Font utama UI baru: Inter (teks & angka, angka tabular).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
import "@/index.css";
import "@/App.css";

export const metadata = {
  title: "LAPORAN STOK SCA",
  description: "LAPORAN STOK SCA — Mutasi & Laporan Stok Kertas & Tinta",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${GeistMono.variable}`}
    >
      <body>
        <noscript>Anda perlu mengaktifkan JavaScript untuk menjalankan aplikasi ini.</noscript>
        {children}
      </body>
    </html>
  );
}
