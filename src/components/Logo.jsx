// Logo resmi Percetakan SCA (PNG transparan, disajikan dari /public).
export const LOGO_URL = "/logo-sca.png";

export default function Logo({ size = 40, className = "", plate = false }) {
  // Rasio logo ≈ 1,39 : 1 (lebar : tinggi)
  const h = size;
  const w = Math.round(size * 1.39);
  return (
    <div
      className={`grid shrink-0 place-items-center ${plate ? "rounded-lg bg-white p-1.5 shadow-sm" : ""} ${className}`}
      style={{ height: plate ? h + 12 : h, width: plate ? w + 12 : w }}
    >
      <img src={LOGO_URL} alt="Logo Percetakan SCA" className="h-full w-full object-contain dark:invert" />
    </div>
  );
}
