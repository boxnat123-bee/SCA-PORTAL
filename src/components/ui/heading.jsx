/**
 * Heading — judul halaman (UI Navy Ledger): eyebrow kecil + judul tebal.
 */
export function Heading({ title, description, eyebrow, className = "" }) {
  return (
    <div className={className}>
      {eyebrow && <div className="text-[13px] text-muted-foreground">{eyebrow}</div>}
      <h1 className={`${eyebrow ? "mt-1" : ""} font-display text-[26px] font-bold leading-tight tracking-[-0.02em]`}>{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export default Heading;
